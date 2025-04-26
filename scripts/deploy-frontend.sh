#!/bin/bash
# Minimalist TODO Application - Deployment Script

set -e  # Exit on error

# Parse command line arguments
ENVIRONMENT="dev"

print_usage() {
  echo "Usage: $0 [OPTIONS]"
  echo "Deploy the Minimalist TODO Application to AWS"
  echo ""
  echo "Options:"
  echo "  -e, --env ENV           Deployment environment (dev/prod, default: dev)"
  echo "  -h, --help              Display this help message"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -h|--help)
      print_usage
      ;;
    *)
      echo "Unknown option: $1"
      print_usage
      ;;
  esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "Error: Environment must be 'dev' or 'prod'"
  exit 1
fi

# Define variables
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
STACK_NAME="minimalist-todo-$ENVIRONMENT"
CFN_BUCKET="$ACCOUNT_ID-cfn-templates"
CFN_PREFIX="minimalist-todo"

echo "=== Deploying Minimalist TODO Application ==="
echo "Environment: $ENVIRONMENT"
echo "=================================="

# 1. Create S3 bucket for CloudFormation templates if it doesn't exist
echo "Ensuring S3 bucket for templates exists..."
aws s3 mb s3://$CFN_BUCKET --region $REGION || true

# 2. Upload CloudFormation templates to S3
echo "Uploading CloudFormation templates to S3..."
aws s3 cp backend/cloudformation/frontend.json s3://$CFN_BUCKET/$CFN_PREFIX/frontend.json
aws s3 cp backend/cloudformation/main.json s3://$CFN_BUCKET/$CFN_PREFIX/main.json

# 3. Deploy the main stack
echo "Deploying main stack..."
aws cloudformation deploy \
  --template-file backend/cloudformation/main.json \
  --stack-name $STACK_NAME \
  --parameter-overrides Environment=$ENVIRONMENT \
  --capabilities CAPABILITY_IAM

# 4. Get the frontend stack details
FRONTEND_STACK=$(aws cloudformation describe-stack-resources \
  --stack-name $STACK_NAME \
  --logical-resource-id FrontendStack \
  --query "StackResources[0].PhysicalResourceId" \
  --output text)

# 5. Get S3 bucket name from the frontend stack
echo "Getting S3 bucket name from stack outputs..."
S3_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name $FRONTEND_STACK \
  --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
  --output text)

# 6. Get CloudFront distribution ID
echo "Getting CloudFront distribution ID from stack outputs..."
CF_DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name $FRONTEND_STACK \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
  --output text)

# 7. Upload frontend files to S3
echo "Uploading frontend files to S3 bucket: $S3_BUCKET..."
aws s3 sync frontend/ s3://$S3_BUCKET/ --delete

# 8. Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $CF_DIST_ID \
  --paths "/*"

# 9. Get application URL
APP_URL=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendURL'].OutputValue" \
  --output text)

echo ""
echo "=== Deployment Complete ==="
echo "Your Minimalist TODO Application is now available at:"
echo "$APP_URL"
echo "=========================="