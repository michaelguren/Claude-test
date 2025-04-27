#!/bin/bash
# Super simple script to delete a CloudFormation stack
# First finds and empties the S3 buckets that might be blocking deletion

# Default values
STACK_NAME=""
REGION="us-east-1"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
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
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 -s STACK_NAME [-r REGION] [-p PROFILE]"
      exit 1
      ;;
  esac
done

# Check if stack name is provided
if [ -z "$STACK_NAME" ]; then
  echo "Stack name is required. Use -s or --stack to specify it."
  exit 1
fi

echo "Starting deletion process for stack: $STACK_NAME"

# Get all S3 buckets in the AWS account
echo "Scanning for buckets related to stack..."
ALL_BUCKETS=$(aws s3 ls | awk '{print $3}')

# Filter buckets that might be related to the stack by name
STACK_BUCKETS=""
for bucket in $ALL_BUCKETS; do
  if [[ "$bucket" == *"$STACK_NAME"* ]]; then
    STACK_BUCKETS="$STACK_BUCKETS $bucket"
  fi
done

# If we found any buckets, empty them
if [ -n "$STACK_BUCKETS" ]; then
  echo "Found buckets that might be related to the stack:"
  for bucket in $STACK_BUCKETS; do
    echo "  - $bucket"
    
    # Empty the bucket (ignore errors)
    echo "Emptying bucket: $bucket"
    aws s3 rm "s3://$bucket" --recursive || true
  done
fi

# Now attempt to delete the stack
echo "Deleting stack: $STACK_NAME"
aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}

echo "Stack deletion initiated. This may take several minutes."
echo "Check the CloudFormation console for status."

exit 0