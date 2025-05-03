#!/bin/bash
# Simple CloudFormation deployment using package command

# Basic configuration
STACK_NAME="minimalist-todo-dev"
REGION="us-east-1"
BUCKET_NAME="minimalist-todo-templates-$REGION"
OUTPUT_TEMPLATE="./backend/cloudformation/packaged-template.json"

export AWS_PAGER=""

# Create bucket if it doesn't exist
aws s3api head-bucket --bucket $BUCKET_NAME > /dev/null 2>&1 || \
  aws s3api create-bucket --bucket $BUCKET_NAME --region $REGION > /dev/null 2>&1

# Package the template (uploads nested templates to S3 and updates references)
aws cloudformation package \
  --template-file ./backend/cloudformation/main.json \
  --s3-bucket $BUCKET_NAME \
  --output-template-file $OUTPUT_TEMPLATE \
  --use-json

# Deploy the packaged template
aws cloudformation deploy \
  --template-file $OUTPUT_TEMPLATE \
  --stack-name $STACK_NAME \
  --parameter-overrides \
    Stage=dev \
    AppName=minimalist-todo \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --region $REGION

# Upload your frontend files to the S3 bucket
echo "Uploading frontend to S3..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name minimalist-todo-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
  --output text)

aws s3 sync ./frontend/ s3://$BUCKET_NAME/ --delete
echo "Finished uploading frontend to S3!"

echo "Invalidating Cloudfront Cache..."
# Invalidate CloudFront cache
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name minimalist-todo-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

# Get stack outputs without pagination
echo "=== Deployment Outputs ==="
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[].[OutputKey,OutputValue]' \
  --output text

# Get the ApplicationURL (CloudFront distribution URL)
APPLICATION_URL=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`ApplicationURL`].OutputValue' \
  --output text)

echo ""
echo "=== Application URL ==="
echo "Your application is available at: $APPLICATION_URL"
echo ""
echo "NOTE: The WebsiteURL is only accessible through CloudFront, not directly from S3."