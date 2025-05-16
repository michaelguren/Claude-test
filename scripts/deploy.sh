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


APP_NAME="minimal-todo"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --no-paginate 2>/dev/null)
FRONTEND_BUCKET_NAME="${APP_NAME}-frontend-${AWS_ACCOUNT_ID}"
TEMPLATE_BUCKET="${APP_NAME}-templates-${AWS_ACCOUNT_ID}"

# Validate parameters
echo "Validating parameters..."
if [ -z "$APP_NAME" ]; then
  echo "Error: APP_NAME must be set"
  exit 1
fi

# Dynamically validate all JSON CloudFormation templates in the folder
find backend/cloudformation -type f -name "*.json" | while read -r template; do
  echo "Validating $template..."
  if ! aws cloudformation validate-template --template-body file://"$template" --region "$AWS_REGION" --no-paginate >/dev/null 2>&1; then
    echo "Error: Validation failed for $template"
    exit 1
  fi
done

# Check or create template bucket
echo "Checking template bucket..."
if ! aws s3 ls "s3://$TEMPLATE_BUCKET" --region "$AWS_REGION" --no-paginate >/dev/null 2>&1; then
  echo "Creating template bucket $TEMPLATE_BUCKET..."
  aws s3 mb "s3://$TEMPLATE_BUCKET" --region "$AWS_REGION" --no-paginate >/dev/null 2>&1
fi

echo "Packaging templates..."
aws cloudformation package \
  --template-file backend/cloudformation/main.json \
  --s3-bucket "$TEMPLATE_BUCKET" \
  --output-template-file backend/cloudformation/packaged-template.json \
  --region "$AWS_REGION" \
  --use-json \
  --output json \
  --no-paginate >/dev/null 2>&1

echo "Deploying stack $APP_NAME..."
aws cloudformation deploy \
  --template-file backend/cloudformation/packaged-template.json \
  --stack-name "$APP_NAME" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region "$AWS_REGION" \
  --parameter-overrides AppName="$APP_NAME" \
  --output json > deploy.log 2>&1 || {
    cat deploy.log
    echo "Fetching failed stack events..."
    aws cloudformation describe-stack-events \
      --stack-name "$APP_NAME" \
      --region "$AWS_REGION" \
      --output table \
      --query "sort_by(StackEvents[?ResourceStatus=='CREATE_FAILED' || ResourceStatus=='UPDATE_FAILED'], &Timestamp)[-5:]" \
      > events.log
    cat events.log
    exit 1
  }

echo "Uploading frontend assets..."
aws s3 sync ./frontend/ "s3://$FRONTEND_BUCKET_NAME/" --delete --region "$AWS_REGION" --no-paginate >/dev/null 2>&1

# Echo Application URL
echo "Fetching Application URL..."
APP_URL=$(aws cloudformation describe-stacks --stack-name "$APP_NAME" --query 'Stacks[0].Outputs[?OutputKey==`ApplicationURL`].OutputValue' --output text --region "$AWS_REGION" --no-paginate 2>/dev/null)
echo "Application URL: $APP_URL"

echo "Cleaning up..."
rm -f backend/cloudformation/packaged-template.json

echo "Deployment complete!"