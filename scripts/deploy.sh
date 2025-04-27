#!/bin/bash
# Minimalist TODO App - Deployment Script
# Deploys CloudFormation templates and uploads frontend files
# Uses a single AWS account per environment approach

# Ensure we're in the project root directory
cd "$(dirname "$0")/.."

CONFIG_FILE="project-config.js"

# Default environment is dev
ENVIRONMENT="dev"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    *)
      # Skip unknown options
      shift
      ;;
  esac
done

# Verify environment is valid
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "ERROR: Environment must be 'dev' or 'prod'. Got: $ENVIRONMENT"
  echo "Usage: $0 [-e|--environment <dev|prod>]"
  exit 1
fi

# Verify AWS credentials are valid before proceeding
echo "Verifying AWS credentials..."
if ! AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text --no-cli-pager 2>/dev/null); then
  echo "ERROR: AWS credentials are invalid or expired."
  echo "Please log in using 'aws sso login' or set valid AWS credentials."
  exit 1
fi

# Now that we've verified credentials, get the region
REGION=$(aws configure get region)
APP_NAME="minimalist-todo"
STACK_NAME="${APP_NAME}-${ENVIRONMENT}"
TIMESTAMP=$(date +%Y%m%d)

echo "AWS credentials verified. Using Account ID: $AWS_ACCOUNT_ID"
echo "Using Region: $REGION"
echo "Environment: $ENVIRONMENT"
echo "Stack Name: $STACK_NAME"

# Only create a template bucket if needed
if [ -f "$CONFIG_FILE" ] && grep -q "templateBucket" "$CONFIG_FILE" && grep -q -v "templateBucket: null" "$CONFIG_FILE"; then
  # Extract bucket name using node
  TEMPLATE_BUCKET=$(node -e "const cfg = require('./$CONFIG_FILE'); console.log(cfg.aws.templateBucket || '')")
  
  # Verify bucket exists
  if ! aws s3api head-bucket --bucket "$TEMPLATE_BUCKET" --no-cli-pager 2>/dev/null; then
    echo "Template bucket no longer exists. Creating a new one."
    TEMPLATE_BUCKET="${APP_NAME}-templates-${AWS_ACCOUNT_ID}-${TIMESTAMP}"
    echo "Creating bucket: $TEMPLATE_BUCKET"
    
    if ! aws s3 mb "s3://$TEMPLATE_BUCKET" --region "$REGION" --no-cli-pager; then
      echo "ERROR: Failed to create S3 bucket. Deployment aborted."
      exit 1
    fi
    
    # Update config with new bucket
    node -e "
      const fs = require('fs');
      const cfg = require('./$CONFIG_FILE');
      cfg.aws.templateBucket = '$TEMPLATE_BUCKET';
      cfg.aws.accountId = '$AWS_ACCOUNT_ID';
      fs.writeFileSync('$CONFIG_FILE', 
        'const projectConfig = ' + JSON.stringify(cfg, null, 2) + 
        ';\n\n// In browser environments, export to window\n' +
        'if (typeof window !== \\'undefined\\') {\n' +
        '  window.projectConfig = projectConfig;\n' +
        '}\n\n' +
        '// In Node.js environments, export as module\n' +
        'if (typeof module !== \\'undefined\\' && module.exports) {\n' +
        '  module.exports = projectConfig;\n' +
        '}');
    "
  fi
else
  # Create new configuration with bucket
  TEMPLATE_BUCKET="${APP_NAME}-templates-${AWS_ACCOUNT_ID}-${TIMESTAMP}"
  echo "Creating bucket: $TEMPLATE_BUCKET"
  
  if ! aws s3 mb "s3://$TEMPLATE_BUCKET" --region "$REGION" --no-cli-pager; then
    echo "ERROR: Failed to create S3 bucket. Deployment aborted."
    exit 1
  fi
  
  # Create or update config file
  node -e "
    const fs = require('fs');
    let cfg;
    try {
      cfg = require('./$CONFIG_FILE');
    } catch(e) {
      cfg = {
        application: { name: '$APP_NAME', description: 'Minimalist TODO Application with zero dependencies' },
        aws: { templateBucket: null, accountId: null },
        resources: { stack: { name: null, created: null, updated: null }, 
                   frontend: { bucketName: null, cloudfrontId: null, cloudfrontDomain: null } },
        deployments: []
      };
    }
    cfg.aws.templateBucket = '$TEMPLATE_BUCKET';
    cfg.aws.accountId = '$AWS_ACCOUNT_ID';
    fs.writeFileSync('$CONFIG_FILE', 
      'const projectConfig = ' + JSON.stringify(cfg, null, 2) + 
      ';\n\n// In browser environments, export to window\n' +
      'if (typeof window !== \\'undefined\\') {\n' +
      '  window.projectConfig = projectConfig;\n' +
      '}\n\n' +
      '// In Node.js environments, export as module\n' +
      'if (typeof module !== \\'undefined\\' && module.exports) {\n' +
      '  module.exports = projectConfig;\n' +
      '}');
  "
fi

echo "Using template bucket: $TEMPLATE_BUCKET"

# Upload CloudFormation templates
echo "Uploading CloudFormation templates..."
if ! aws s3 cp backend/cloudformation/frontend.json "s3://$TEMPLATE_BUCKET/" --no-cli-pager; then
  echo "ERROR: Failed to upload CloudFormation templates. Deployment aborted."
  exit 1
fi

if ! aws s3 cp backend/cloudformation/main.json "s3://$TEMPLATE_BUCKET/" --no-cli-pager; then
  echo "ERROR: Failed to upload CloudFormation templates. Deployment aborted."
  exit 1
fi

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack..."
if ! aws cloudformation deploy \
  --template-file "backend/cloudformation/main.json" \
  --stack-name "$STACK_NAME" \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
    AppName="$APP_NAME" \
    S3Bucket="$TEMPLATE_BUCKET" \
  --capabilities CAPABILITY_IAM \
  --region "$REGION" --no-cli-pager; then
  
  echo "ERROR: CloudFormation deployment failed. Deployment aborted."
  exit 1
fi

# Get outputs from CloudFormation using a more verbose approach
echo "Getting stack outputs..."

# Wait for the stack to be fully deployed (sometimes there's a delay)
echo "Waiting for CloudFormation deployment to complete..."
sleep 10

# Get the CloudFront Domain from the main stack
echo "Getting CloudFront domain from main stack..."
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" --output text --no-cli-pager)

echo "CloudFront Domain: $CLOUDFRONT_DOMAIN"

# Get the nested frontend stack physical ID
echo "Finding nested frontend stack..."
FRONTEND_STACK_ID=$(aws cloudformation list-stack-resources --stack-name "$STACK_NAME" --region "$REGION" \
  --query "StackResourceSummaries[?LogicalResourceId=='FrontendStack'].PhysicalResourceId" --output text --no-cli-pager)

if [ -z "$FRONTEND_STACK_ID" ]; then
  echo "ERROR: Could not find FrontendStack resource in the main stack."
  echo "Make sure the main.json template has a nested stack resource named 'FrontendStack'."
  exit 1
fi

echo "Found Frontend Stack ID: $FRONTEND_STACK_ID"

# Get outputs from the nested frontend stack
echo "Getting outputs from the frontend stack..."
FRONTEND_OUTPUTS=$(aws cloudformation describe-stacks --stack-name "$FRONTEND_STACK_ID" --region "$REGION" --no-cli-pager)

# Display raw outputs for debugging
echo "=== Frontend Stack Raw Outputs ==="
echo "$FRONTEND_OUTPUTS"
echo "=== End of Frontend Stack Raw Outputs ==="

# Extract S3 bucket name and CloudFront ID from frontend stack
S3_BUCKET=$(echo "$FRONTEND_OUTPUTS" | grep -o '"OutputKey": *"S3BucketName".*"OutputValue": *"[^"]*"' | grep -o '"OutputValue": *"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
CLOUDFRONT_ID=$(echo "$FRONTEND_OUTPUTS" | grep -o '"OutputKey": *"CloudFrontDistributionId".*"OutputValue": *"[^"]*"' | grep -o '"OutputValue": *"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')

# If grep approach fails, try with jq
if [ -z "$S3_BUCKET" ] && command -v jq &> /dev/null; then
  echo "Trying extraction with jq..."
  S3_BUCKET=$(echo "$FRONTEND_OUTPUTS" | jq -r '.Stacks[0].Outputs[] | select(.OutputKey=="S3BucketName") | .OutputValue')
  CLOUDFRONT_ID=$(echo "$FRONTEND_OUTPUTS" | jq -r '.Stacks[0].Outputs[] | select(.OutputKey=="CloudFrontDistributionId") | .OutputValue')
fi

# If still not successful, try with AWS CLI query directly
if [ -z "$S3_BUCKET" ]; then
  echo "Trying extraction with AWS CLI query..."
  S3_BUCKET=$(aws cloudformation describe-stacks --stack-name "$FRONTEND_STACK_ID" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text --no-cli-pager)
  CLOUDFRONT_ID=$(aws cloudformation describe-stacks --stack-name "$FRONTEND_STACK_ID" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text --no-cli-pager)
fi

# Show the extracted values
echo "Extracted values from frontend stack:"
echo "  S3 Bucket: '$S3_BUCKET'"
echo "  CloudFront ID: '$CLOUDFRONT_ID'"
echo "  CloudFront Domain: '$CLOUDFRONT_DOMAIN'"

# Check if we got the bucket name
if [ -z "$S3_BUCKET" ]; then
  echo "ERROR: Could not extract S3 bucket name from frontend stack outputs."
  echo "Please verify that the frontend stack has an output named 'S3BucketName'."
  exit 1
fi

# Create a separate file for updating the config to avoid shell escaping issues
cat > update_config.js << EOF
const fs = require('fs');
let cfg;
try {
  cfg = require('./${CONFIG_FILE}');
} catch(e) {
  cfg = {
    application: { name: '${APP_NAME}', description: 'Minimalist TODO Application with zero dependencies' },
    aws: { templateBucket: '${TEMPLATE_BUCKET}', accountId: '${AWS_ACCOUNT_ID}' },
    resources: { 
      stack: { name: null, created: null, updated: null }, 
      frontend: { bucketName: null, cloudfrontId: null, cloudfrontDomain: null } 
    },
    deployments: []
  };
}

// Update stack info
cfg.resources.stack.name = '${STACK_NAME}';
cfg.resources.stack.updated = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")';
if (!cfg.resources.stack.created) {
  cfg.resources.stack.created = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")';
}

// Update frontend resources
cfg.resources.frontend.bucketName = '${S3_BUCKET}';
cfg.resources.frontend.cloudfrontId = '${CLOUDFRONT_ID}';
cfg.resources.frontend.cloudfrontDomain = '${CLOUDFRONT_DOMAIN}';

// Add deployment record
cfg.deployments.unshift({
  timestamp: '$(date -u +"%Y-%m-%dT%H:%M:%SZ")', 
  user: '$(whoami)', 
  success: true,
  environment: '${ENVIRONMENT}'
});

// Write the updated configuration back to the file
fs.writeFileSync('${CONFIG_FILE}', 
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
EOF

# Update the config file
if ! node update_config.js; then
  echo "ERROR: Failed to update configuration file."
  rm -f update_config.js
  exit 1
fi

# Clean up the temporary script
rm -f update_config.js

# Upload frontend files
echo "Uploading frontend files to S3 bucket: $S3_BUCKET"
if ! aws s3 sync frontend/ "s3://$S3_BUCKET" --delete --no-cli-pager; then
  echo "ERROR: Failed to upload frontend files. Deployment is incomplete."
  exit 1
fi

echo "==============================================="
echo "Deployment complete!"
echo "Environment: $ENVIRONMENT"
echo "Stack Name: $STACK_NAME"
echo "Application URL: https://$CLOUDFRONT_DOMAIN"
echo "Configuration saved to: $CONFIG_FILE"
echo "==============================================="
