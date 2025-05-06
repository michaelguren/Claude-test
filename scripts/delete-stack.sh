#!/bin/bash
set -e

CONFIG_FILE="project-config.js"
APP_NAME=$(node -e "console.log(require('./$CONFIG_FILE').appName)")
ENVIRONMENT="${ENVIRONMENT:-$(node -e "console.log(require('./$CONFIG_FILE').defaultEnvironment)")}"
STACK_NAME="${APP_NAME}-${ENVIRONMENT}"
TEMPLATE_BUCKET="minimalist-todo-templates-$(aws sts get-caller-identity --query Account --output text)"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

# Function to clean S3 bucket completely
clean_s3_bucket() {
  local bucket_name=$1
  if ! aws s3api head-bucket --bucket "$bucket_name" --region "$REGION" 2>/dev/null; then
    return 0
  fi
  
  aws s3api delete-public-access-block --bucket "$bucket_name" --region "$REGION" >/dev/null 2>&1 || true
  aws s3api delete-bucket-policy --bucket "$bucket_name" --region "$REGION" >/dev/null 2>&1 || true
  aws s3api put-bucket-versioning --bucket "$bucket_name" --versioning-configuration Status=Suspended --region "$REGION" >/dev/null 2>&1 || true
  
  versions=$(aws s3api list-object-versions --bucket "$bucket_name" --region "$REGION" --output json 2>/dev/null || echo "{}")
  versions_to_delete=$(echo "$versions" | jq -r '.Versions[] | "\(.Key) \(.VersionId)"' 2>/dev/null || echo "")
  if [ -n "$versions_to_delete" ]; then
    echo "$versions_to_delete" | while read key version_id; do
      aws s3api delete-object --bucket "$bucket_name" --key "$key" --version-id "$version_id" --region "$REGION" >/dev/null 2>&1
    done
  fi
  
  delete_markers=$(echo "$versions" | jq -r '.DeleteMarkers[] | "\(.Key) \(.VersionId)"' 2>/dev/null || echo "")
  if [ -n "$delete_markers" ]; then
    echo "$delete_markers" | while read key version_id; do
      aws s3api delete-object --bucket "$bucket_name" --key "$key" --version-id "$version_id" --region "$REGION" >/dev/null 2>&1
    done
  fi
  
  aws s3 rm "s3://${bucket_name}" --recursive --region "$REGION" >/dev/null 2>&1 || true
  
  uploads=$(aws s3api list-multipart-uploads --bucket "$bucket_name" --region "$REGION" 2>/dev/null || echo "{}")
  upload_ids=$(echo "$uploads" | jq -r '.Uploads[] | "\(.Key) \(.UploadId)"' 2>/dev/null || echo "")
  if [ -n "$upload_ids" ]; then
    echo "$upload_ids" | while read key upload_id; do
      aws s3api abort-multipart-upload --bucket "$bucket_name" --key "$key" --upload-id "$upload_id" --region "$REGION" >/dev/null 2>&1
    done
  fi
}

# Clean template bucket
clean_s3_bucket "$TEMPLATE_BUCKET"

# Clean S3 buckets in the stack
buckets=$(aws cloudformation list-stack-resources --stack-name "$STACK_NAME" --region "$REGION" --query "StackResourceSummaries[?ResourceType=='AWS::S3::Bucket'].PhysicalResourceId" --output text 2>/dev/null || echo "")
if [ -n "$buckets" ]; then
  for bucket in $buckets; do
    clean_s3_bucket "$bucket"
  done
fi

# Delete the CloudFormation stack
aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION" >/dev/null 2>&1
aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --region "$REGION" >/dev/null 2>&1 || {
  echo "Failed to delete stack $STACK_NAME. Check AWS CloudFormation console." >&2
  exit 1
}