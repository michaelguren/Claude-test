#!/bin/bash
set -e

STACK_NAME="$1"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

if [ -z "$STACK_NAME" ]; then
  echo "Usage: ./scripts/delete-stack.sh <STACK_NAME>"
  exit 1
fi

echo "Checking AWS SSO session..."
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "No active AWS SSO session. Initiating SSO login..."
  aws sso login
fi

echo "Fetching all nested stacks for $STACK_NAME..."
STACK_IDS=$(aws cloudformation describe-stack-resources   --stack-name "$STACK_NAME"   --region "$REGION"   --query "StackResources[?ResourceType=='AWS::CloudFormation::Stack'].PhysicalResourceId"   --output text)

ALL_STACKS=("$STACK_NAME" $STACK_IDS)

echo "Searching for all S3 buckets across root and nested stacks..."
for STACK in "${ALL_STACKS[@]}"; do
  echo "Checking stack: $STACK"
  BUCKETS=$(aws cloudformation list-stack-resources     --stack-name "$STACK"     --region "$REGION"     --query "StackResourceSummaries[?ResourceType=='AWS::S3::Bucket'].PhysicalResourceId"     --output text)
  
  for BUCKET in $BUCKETS; do
    echo "Emptying bucket: $BUCKET"
    aws s3 rm "s3://$BUCKET" --recursive --region "$REGION" || true

    echo "Deleting bucket: $BUCKET"
    aws s3api delete-bucket --bucket "$BUCKET" --region "$REGION" || true
  done
done

echo "Deleting main CloudFormation stack: $STACK_NAME"
aws cloudformation delete-stack   --stack-name "$STACK_NAME"   --region "$REGION"

echo "Waiting for stack deletion to complete..."
aws cloudformation wait stack-delete-complete   --stack-name "$STACK_NAME"   --region "$REGION"

echo "✅ Stack and all S3 buckets deleted successfully."
