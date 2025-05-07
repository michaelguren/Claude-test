#!/bin/bash
set -e

# Check if AWS SSO is configured and prompt login if not signed in
echo "Checking AWS SSO session..."
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "No active AWS SSO session. Initiating SSO login..."
  aws sso login
  if [ $? -ne 0 ]; then
    echo "Error: AWS SSO login failed"
    exit 1
  fi
fi

CONFIG_FILE="project-config.js"
APP_NAME=$(node -e "console.log(require('./$CONFIG_FILE').appName)" 2>/dev/null)
STACK_NAME="$APP_NAME"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --no-paginate 2>/dev/null)
TEMPLATE_BUCKET="minimalist-todo-templates-${AWS_ACCOUNT_ID}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

# Validate parameters
echo "Validating parameters..."
if [ -z "$APP_NAME" ]; then
  echo "Error: AppName must be set in $CONFIG_FILE"
  exit 1
fi

# Validate CloudFormation templates
echo "Validating templates..."
aws cloudformation validate-template --template-body file://backend/cloudformation/main.json --region "$REGION" --no-paginate >/dev/null 2>&1
aws cloudformation validate-template --template-body file://backend/cloudformation/frontend.json --region "$REGION" --no-paginate >/dev/null 2>&1
aws cloudformation validate-template --template-body file://backend/cloudformation/auth.json --region "$REGION" --no-paginate >/dev/null 2>&1

# Check or create template bucket
echo "Checking template bucket..."
if ! aws s3 ls "s3://$TEMPLATE_BUCKET" --region "$REGION" --no-paginate >/dev/null 2>&1; then
  echo "Creating template bucket $TEMPLATE_BUCKET..."
  aws s3 mb "s3://$TEMPLATE_BUCKET" --region "$REGION" --no-paginate >/dev/null 2>&1
fi

echo "Packaging templates..."
aws cloudformation package \
  --template-file backend/cloudformation/main.json \
  --s3-bucket "$TEMPLATE_BUCKET" \
  --output-template-file backend/cloudformation/packaged-template.json \
  --region "$REGION" \
  --use-json \
  --output json \
  --no-paginate >/dev/null 2>&1

echo "Deploying stack $STACK_NAME..."
aws cloudformation deploy \
  --template-file backend/cloudformation/packaged-template.json \
  --stack-name "$STACK_NAME" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region "$REGION" \
  --output json > deploy.log 2>&1 || {
    cat deploy.log
    echo "Fetching failed stack events..."
    aws cloudformation describe-stack-events \
      --stack-name "$STACK_NAME" \
      --region "$REGION" \
      --output json \
      --query 'StackEvents[?contains(ResourceStatus,`FAILED`)].[Timestamp,ResourceType,ResourceStatus,ResourceStatusReason]' \
      > events.log
    cat events.log
    exit 1
  }

echo "Uploading frontend assets..."
aws s3 sync ./frontend/ "s3://minimalist-todo-${AWS_ACCOUNT_ID}/" --delete --region "$REGION" --no-paginate >/dev/null 2>&1

# Echo Application URL
echo "Fetching Application URL..."
APP_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`ApplicationURL`].OutputValue' --output text --region "$REGION" --no-paginate 2>/dev/null)
echo "Application URL: $APP_URL"

echo "Cleaning up..."
rm -f backend/cloudformation/packaged-template.json

echo "Deployment complete!"