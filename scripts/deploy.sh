#!/bin/bash
set -e

CONFIG_FILE="project-config.js"
APP_NAME=$(node -e "console.log(require('./$CONFIG_FILE').appName)")
ENVIRONMENT="${ENVIRONMENT:-$(node -e "console.log(require('./$CONFIG_FILE').defaultEnvironment)")}"
STACK_NAME="${APP_NAME}-${ENVIRONMENT}"
TEMPLATE_BUCKET="minimalist-todo-templates-$(aws sts get-caller-identity --query Account --output text)"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

echo "Checking template bucket..."
if ! aws s3 ls "s3://$TEMPLATE_BUCKET" --region "$REGION" 2>&1 >/dev/null; then
  echo "Creating template bucket..."
  aws s3 mb "s3://$TEMPLATE_BUCKET" --region "$REGION" >/dev/null 2>&1
fi

echo "Packaging templates..."
aws cloudformation package \
  --template-file backend/cloudformation/main.json \
  --s3-bucket "$TEMPLATE_BUCKET" \
  --output-template-file packaged-template.json \
  --region "$REGION"

echo "Deploying stack $STACK_NAME..."
aws cloudformation deploy \
  --template-file packaged-template.json \
  --stack-name "$STACK_NAME" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region "$REGION"

echo "Uploading frontend assets..."
aws s3 sync ./frontend/ "s3://$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' --output text)/" --delete --region "$REGION"

echo "Cleaning up..."
rm -f packaged-template.json

echo "Deployment complete!"