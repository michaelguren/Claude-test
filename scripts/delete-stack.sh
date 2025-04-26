#!/bin/bash
# Script to delete a CloudFormation stack including non-empty S3 buckets
# This is necessary because CloudFormation will not delete non-empty S3 buckets

# Default values
STACK_NAME=""
REGION="us-east-1"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"

  case $key in
    -s|--stack)
      STACK_NAME="$2"
      shift 2
      ;;
    -r|--region)
      REGION="$2"
      shift 2
      ;;
    -p|--profile)
      AWS_PROFILE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  -s, --stack STACK_NAME  Stack name to delete (required)"
      echo "  -r, --region REGION     AWS region [default: us-east-1]"
      echo "  -p, --profile PROFILE   AWS profile name"
      echo "  -h, --help              Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check if stack name is provided
if [ -z "$STACK_NAME" ]; then
  echo "Error: Stack name is required"
  echo "Use -s or --stack to specify the stack name"
  exit 1
fi

echo "Preparing to delete stack: ${STACK_NAME}"

# Get all S3 buckets associated with the stack
echo "Identifying S3 buckets to empty..."
S3_BUCKETS=$(aws cloudformation describe-stack-resources \
  --stack-name "${STACK_NAME}" \
  --query "StackResources[?ResourceType=='AWS::S3::Bucket'].PhysicalResourceId" \
  --output text \
  --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}} 2>/dev/null)

# Empty all S3 buckets before deleting the stack
if [ -n "$S3_BUCKETS" ]; then
  for bucket in $S3_BUCKETS; do
    echo "Emptying S3 bucket: ${bucket}"
    
    # First, remove all objects
    aws s3 rm "s3://${bucket}" --recursive \
      --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}
    
    # Then, remove all object versions (if bucket has versioning enabled)
    VERSIONS=$(aws s3api list-object-versions \
      --bucket "${bucket}" \
      --query "Versions[].{Key:Key,VersionId:VersionId}" \
      --output text \
      --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}} 2>/dev/null)
    
    if [ -n "$VERSIONS" ]; then
      echo "Removing all object versions..."
      echo "$VERSIONS" | while read -r key version; do
        if [ -n "$key" ] && [ -n "$version" ]; then
          aws s3api delete-object \
            --bucket "${bucket}" \
            --key "${key}" \
            --version-id "${version}" \
            --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}
        fi
      done
    fi
    
    # Delete all delete markers
    DELETE_MARKERS=$(aws s3api list-object-versions \
      --bucket "${bucket}" \
      --query "DeleteMarkers[].{Key:Key,VersionId:VersionId}" \
      --output text \
      --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}} 2>/dev/null)
    
    if [ -n "$DELETE_MARKERS" ]; then
      echo "Removing all delete markers..."
      echo "$DELETE_MARKERS" | while read -r key version; do
        if [ -n "$key" ] && [ -n "$version" ]; then
          aws s3api delete-object \
            --bucket "${bucket}" \
            --key "${key}" \
            --version-id "${version}" \
            --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}
        fi
      done
    fi
  done
fi

# Get CloudFront distribution ID if exists
CF_DIST_ID=$(aws cloudformation describe-stack-resources \
  --stack-name "${STACK_NAME}" \
  --query "StackResources[?ResourceType=='AWS::CloudFront::Distribution'].PhysicalResourceId" \
  --output text \
  --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}} 2>/dev/null)

# If CloudFront distribution exists, disable it first (CloudFormation can't delete enabled distributions)
if [ -n "$CF_DIST_ID" ]; then
  echo "Disabling CloudFront distribution: ${CF_DIST_ID}"
  
  # Get current configuration
  CONFIG=$(aws cloudfront get-distribution-config \
    --id "${CF_DIST_ID}" \
    --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}})
  
  ETAG=$(echo "$CONFIG" | grep "ETag" | cut -d '"' -f 4)
  
  # Create a modified config with Enabled=false
  TEMP_CONFIG=$(echo "$CONFIG" | sed 's/"Enabled": true/"Enabled": false/')
  
  # Save to a temporary file
  TEMP_FILE="$(mktemp)"
  echo "$TEMP_CONFIG" > "$TEMP_FILE"
  
  # Update the distribution
  aws cloudfront update-distribution \
    --id "${CF_DIST_ID}" \
    --if-match "${ETAG}" \
    --distribution-config "file://${TEMP_FILE}" \
    --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}
  
  # Remove temporary file
  rm -f "$TEMP_FILE"
  
  echo "Waiting for CloudFront distribution to be disabled..."
  aws cloudfront wait distribution-deployed \
    --id "${CF_DIST_ID}" \
    --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}
fi

# Delete nested stacks first
NESTED_STACKS=$(aws cloudformation describe-stack-resources \
  --stack-name "${STACK_NAME}" \
  --query "StackResources[?ResourceType=='AWS::CloudFormation::Stack'].PhysicalResourceId" \
  --output text \
  --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}} 2>/dev/null)

if [ -n "$NESTED_STACKS" ]; then
  echo "Found nested stacks to delete:"
  for nested_stack in $NESTED_STACKS; do
    # Extract stack name from ARN
    nested_stack_name=$(echo "$nested_stack" | sed 's/.*\///')
    echo "  - ${nested_stack_name}"
  done
fi

# Finally, delete the stack
echo "Deleting stack: ${STACK_NAME}"
aws cloudformation delete-stack \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}

if [ $? -eq 0 ]; then
  echo "Stack deletion initiated. Waiting for completion..."
  aws cloudformation wait stack-delete-complete \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}
  
  if [ $? -eq 0 ]; then
    echo "Stack ${STACK_NAME} deleted successfully."
  else
    echo "Error waiting for stack deletion. Check AWS CloudFormation console for details."
    exit 1
  fi
else
  echo "Error deleting stack. Check AWS CloudFormation console for details."
  exit 1
fi

exit 0