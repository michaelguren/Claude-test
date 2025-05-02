#!/bin/bash
# Minimalist TODO App - Stack Deletion Script
# Handles proper cleanup of all resources including S3 buckets with versioning

# Ensure we're in the project root directory
cd "$(dirname "$0")/.."

set -e  # Exit immediately if a command exits with a non-zero status

CONFIG_FILE="project-config.js"

# Default stage is dev
STAGE="dev"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -s|--stage)
      STAGE="$2"
      shift 2
      ;;
    *)
      # Skip unknown options
      shift
      ;;
  esac
done

# Verify stage is valid
if [[ "$STAGE" != "dev" && "$STAGE" != "prod" ]]; then
  echo "ERROR: Stage must be 'dev' or 'prod'. Got: $STAGE"
  echo "Usage: $0 [-s|--stage <dev|prod>]"
  exit 1
fi

# Get AWS account ID for verification
echo "Verifying AWS credentials..."
if ! AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text --no-cli-pager 2>/dev/null); then
  echo "ERROR: AWS credentials are invalid or expired."
  echo "Please log in using 'aws sso login' or set valid AWS credentials."
  exit 1
fi

# Get account alias for logging purposes
ACCOUNT_ALIAS=$(aws iam list-account-aliases --query "AccountAliases[0]" --output text --no-cli-pager)
if [ -z "$ACCOUNT_ALIAS" ]; then
  ACCOUNT_ALIAS="aws-${AWS_ACCOUNT_ID}"
fi

# Now that we've verified credentials, get the region
REGION=$(aws configure get region)

# Extract application name from project-config.js
echo "Reading application configuration..."
if [ -f "$CONFIG_FILE" ]; then
  APP_NAME=$(node -e "const cfg = require('./$CONFIG_FILE'); console.log(cfg.application ? cfg.application.name : 'minimalist-todo')")
  echo "Using application name from config: $APP_NAME"
else
  # Fallback to default name if config doesn't exist
  APP_NAME="minimalist-todo"
  echo "Config file not found, using default application name: $APP_NAME"
fi

STACK_NAME="${APP_NAME}-${STAGE}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Centralized deletion info display
echo "=============================================="
echo -e "${CYAN}Stack Deletion Configuration:${NC}"
echo "AWS Account: $ACCOUNT_ALIAS ($AWS_ACCOUNT_ID)"
echo "Region: $REGION"
echo "Stage: $STAGE"
echo "Stack Name: $STACK_NAME"
echo "=============================================="

# Function to clean S3 bucket completely
clean_s3_bucket() {
  local bucket_name=$1
  
  echo -e "${YELLOW}Cleaning bucket: ${bucket_name}${NC}"
  
  # Check if bucket exists
  if ! aws s3api head-bucket --bucket "$bucket_name" --no-cli-pager 2>/dev/null; then
    echo -e "${YELLOW}Bucket ${bucket_name} does not exist or you don't have access to it.${NC}"
    return 0
  fi
  
  # First, disable any bucket protection
  echo "Removing bucket protection..."
  aws s3api delete-public-access-block --bucket "$bucket_name" --no-cli-pager || true
  aws s3api delete-bucket-policy --bucket "$bucket_name" --no-cli-pager || true
  
  # Suspend versioning to prevent new versions during cleanup
  echo "Suspending bucket versioning..."
  aws s3api put-bucket-versioning --bucket "$bucket_name" --versioning-configuration Status=Suspended --no-cli-pager || true
  
  # Delete all object versions (including delete markers)
  echo "Deleting all object versions..."
  versions=$(aws s3api list-object-versions --bucket "$bucket_name" --output json --no-cli-pager)
  
  # Extract and delete all versions
  versions_to_delete=$(echo "$versions" | jq -r '.Versions[] | "\(.Key) \(.VersionId)"' 2>/dev/null || echo "")
  if [ ! -z "$versions_to_delete" ]; then
    echo "Deleting object versions..."
    echo "$versions_to_delete" | while read key version_id; do
      echo "Deleting object: $key (version $version_id)"
      aws s3api delete-object --bucket "$bucket_name" --key "$key" --version-id "$version_id" --no-cli-pager
    done
  fi
  
  # Extract and delete all delete markers
  delete_markers=$(echo "$versions" | jq -r '.DeleteMarkers[] | "\(.Key) \(.VersionId)"' 2>/dev/null || echo "")
  if [ ! -z "$delete_markers" ]; then
    echo "Deleting delete markers..."
    echo "$delete_markers" | while read key version_id; do
      echo "Deleting marker: $key (version $version_id)"
      aws s3api delete-object --bucket "$bucket_name" --key "$key" --version-id "$version_id" --no-cli-pager
    done
  fi
  
  # Handle case where jq might not be available - use AWS CLI to delete all objects
  echo "Performing additional object cleanup..."
  aws s3 rm "s3://${bucket_name}" --recursive --no-cli-pager || true
  
  # Delete any incomplete multipart uploads
  echo "Cleaning up multipart uploads..."
  uploads=$(aws s3api list-multipart-uploads --bucket "$bucket_name" --no-cli-pager 2>/dev/null || echo "{}")
  upload_ids=$(echo "$uploads" | jq -r '.Uploads[] | "\(.Key) \(.UploadId)"' 2>/dev/null || echo "")
  
  if [ ! -z "$upload_ids" ]; then
    echo "Aborting multipart uploads..."
    echo "$upload_ids" | while read key upload_id; do
      echo "Aborting upload: $key (id $upload_id)"
      aws s3api abort-multipart-upload --bucket "$bucket_name" --key "$key" --upload-id "$upload_id" --no-cli-pager
    done
  fi
  
  echo -e "${GREEN}Successfully cleaned bucket: ${bucket_name}${NC}"
}

# Function to extract resources of a specific type from a CloudFormation stack
get_stack_resources_by_type() {
  local stack_name=$1
  local resource_type=$2
  
  aws cloudformation list-stack-resources --stack-name "$stack_name" --no-cli-pager --query "StackResourceSummaries[?ResourceType=='$resource_type'].PhysicalResourceId" --output text
}

# Find all S3 buckets in the CloudFormation stack
echo -e "${CYAN}Identifying S3 buckets in stack: ${STACK_NAME}${NC}"

# Try to get nested stacks first
nested_stacks=$(get_stack_resources_by_type "$STACK_NAME" "AWS::CloudFormation::Stack" || echo "")

# Clean S3 buckets in the main stack
main_buckets=$(get_stack_resources_by_type "$STACK_NAME" "AWS::S3::Bucket" || echo "")
if [ ! -z "$main_buckets" ]; then
  echo "Found S3 buckets in main stack:"
  for bucket in $main_buckets; do
    echo " - $bucket"
    clean_s3_bucket "$bucket"
  done
fi

# Clean S3 buckets in nested stacks
if [ ! -z "$nested_stacks" ]; then
  echo "Found nested stacks:"
  for nested_stack in $nested_stacks; do
    echo " - $nested_stack"
    nested_buckets=$(get_stack_resources_by_type "$nested_stack" "AWS::S3::Bucket" || echo "")
    
    if [ ! -z "$nested_buckets" ]; then
      echo "   Found S3 buckets in nested stack:"
      for bucket in $nested_buckets; do
        echo "   - $bucket"
        clean_s3_bucket "$bucket"
      done
    else
      echo "   No S3 buckets found in this nested stack."
    fi
  done
else
  echo "No nested stacks found."
fi

# Check for template bucket in config file
if [ -f "$CONFIG_FILE" ]; then
  TEMPLATE_BUCKET=$(node -e "const cfg = require('./$CONFIG_FILE'); console.log((cfg.aws && cfg.aws.templateBucket) ? cfg.aws.templateBucket : '')")
  
  if [ ! -z "$TEMPLATE_BUCKET" ]; then
    echo -e "${CYAN}Found template bucket in config: ${TEMPLATE_BUCKET}${NC}"
    clean_s3_bucket "$TEMPLATE_BUCKET"
  fi
fi

# Now delete the CloudFormation stack
echo -e "${CYAN}Deleting CloudFormation stack: ${STACK_NAME}${NC}"
if aws cloudformation delete-stack --stack-name "$STACK_NAME" --no-cli-pager; then
  echo -e "${GREEN}Stack deletion initiated successfully.${NC}"
  
  # Wait for stack deletion to complete
  echo "Waiting for stack deletion to complete..."
  if aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --no-cli-pager; then
    echo -e "${GREEN}Stack ${STACK_NAME} deleted successfully.${NC}"
    
    # Update the project config file to reflect deletion
    if [ -f "$CONFIG_FILE" ]; then
      echo "Updating project configuration..."
      node -e "
        const fs = require('fs');
        let cfg;
        try {
          cfg = require('./$CONFIG_FILE');
          
          // Clear stack resources
          if (cfg.resources) {
            if (cfg.resources.stack) {
              cfg.resources.stack.name = null;
              cfg.resources.stack.deleted = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")';
            }
            
            if (cfg.resources.frontend) {
              cfg.resources.frontend.bucketName = null;
              cfg.resources.frontend.cloudfrontId = null;
              cfg.resources.frontend.cloudfrontDomain = null;
            }
          }
          
          // Add deletion record
          if (!cfg.deployments) cfg.deployments = [];
          cfg.deployments.unshift({
            timestamp: '$(date -u +"%Y-%m-%dT%H:%M:%SZ")', 
            user: '$(whoami)', 
            action: 'delete',
            environment: '$STAGE'
          });
          
          fs.writeFileSync('$CONFIG_FILE', 
            'const projectConfig = ' + JSON.stringify(cfg, null, 2) + 
            ';\n\n// In browser environments, export to window\n' +
            'if (typeof window !== \"undefined\") {\n' +
            '  window.projectConfig = projectConfig;\n' +
            '}\n\n' +
            '// In Node.js environments, export as module\n' +
            'if (typeof module !== \"undefined\" && module.exports) {\n' +
            '  module.exports = projectConfig;\n' +
            '}');
          
          console.log('Configuration updated successfully.');
        } catch(e) {
          console.error('Failed to update configuration:', e.message);
        }
      "
    fi
  else
    echo -e "${RED}Failed to delete stack ${STACK_NAME}. Check AWS CloudFormation console for details.${NC}"
    exit 1
  fi
else
  echo -e "${RED}Failed to initiate stack deletion for ${STACK_NAME}.${NC}"
  exit 1
fi

echo "=============================================="
echo -e "${GREEN}Cleanup complete!${NC}"
echo "Account: $ACCOUNT_ALIAS ($AWS_ACCOUNT_ID)"
echo "Stage: $STAGE"
echo "Stack Name: $STACK_NAME"
echo "=============================================="