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

echo "Creating change set preview..."
CHANGE_SET_NAME="preview-$(date +%s)"

# Check if the stack already exists
if aws cloudformation describe-stacks --stack-name "$APP_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  CHANGE_SET_TYPE="UPDATE"
else
  CHANGE_SET_TYPE="CREATE"
fi

aws cloudformation create-change-set \
  --stack-name "$APP_NAME" \
  --change-set-type "$CHANGE_SET_TYPE" \
  --template-body file://backend/cloudformation/packaged-template.json \
  --change-set-name "$CHANGE_SET_NAME" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region "$AWS_REGION" \
  --parameters ParameterKey=AppName,ParameterValue="$APP_NAME" \
  --output text > /dev/null

echo "Waiting for change set to be created..."
if ! aws cloudformation wait change-set-create-complete \
  --stack-name "$APP_NAME" \
  --change-set-name "$CHANGE_SET_NAME" \
  --region "$AWS_REGION"; then
  echo "Change set creation failed. Fetching recent failure events..."
  aws cloudformation describe-stack-events \
    --stack-name "$APP_NAME" \
    --region "$AWS_REGION" \
    --query "sort_by(StackEvents[?contains(ResourceStatus, 'FAILED')], &Timestamp)[-10:]" \
    --output table > deploy-events.log

  if command -v pbcopy >/dev/null 2>&1; then
    cat deploy-events.log | pbcopy
    echo "❌ Events copied to clipboard (deploy-events.log)"
  else
    echo "❌ Events logged to deploy-events.log"
  fi

  exit 1
fi

echo "Proposed changes:"
aws cloudformation describe-change-set \
  --stack-name "$APP_NAME" \
  --change-set-name "$CHANGE_SET_NAME" \
  --region "$AWS_REGION" \
  --query 'Changes[*].ResourceChange.{Action:Action,LogicalResourceId:LogicalResourceId,ResourceType:ResourceType}' \
  --output table

read -p "Continue with deployment? (y/N): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Aborting deployment. Deleting change set..."
  aws cloudformation delete-change-set \
    --stack-name "$APP_NAME" \
    --change-set-name "$CHANGE_SET_NAME" \
    --region "$AWS_REGION"
  exit 0
fi

echo "Executing change set..."
if ! aws cloudformation execute-change-set \
  --stack-name "$APP_NAME" \
  --change-set-name "$CHANGE_SET_NAME" \
  --region "$AWS_REGION"; then
  echo "Deployment execution failed. Fetching recent failure events..."
  aws cloudformation describe-stack-events \
    --stack-name "$APP_NAME" \
    --region "$AWS_REGION" \
    --query "sort_by(StackEvents[?contains(ResourceStatus, 'FAILED')], &Timestamp)[-10:]" \
    --output table > deploy-events.log

  if command -v pbcopy >/dev/null 2>&1; then
    cat deploy-events.log | pbcopy
    echo "❌ Events copied to clipboard (deploy-events.log)"
  else
    echo "❌ Events logged to deploy-events.log"
  fi

  exit 1
fi

# 🌀 Insert this spinner block
SPINNER=(⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏)
i=0
start_time=$(date +%s)

echo -n "Deploying..."

while true; do
  STATUS=$(aws cloudformation describe-stacks \
    --stack-name "$APP_NAME" \
    --region "$AWS_REGION" \
    --query "Stacks[0].StackStatus" \
    --output text 2>/dev/null)

  elapsed=$(( $(date +%s) - start_time ))
  mins=$((elapsed / 60))
  secs=$((elapsed % 60))
  time_str=$(printf "%02d:%02d" $mins $secs)

  case "$STATUS" in
    CREATE_COMPLETE|UPDATE_COMPLETE)
      printf "\r✅ [$time_str] Done: $STATUS\n"
      break
      ;;
    ROLLBACK_COMPLETE|UPDATE_ROLLBACK_COMPLETE)
      printf "\r❌ [$time_str] Stack failed: $STATUS — rolling back completed\n"

      aws cloudformation describe-stack-events \
        --stack-name "$APP_NAME" \
        --region "$AWS_REGION" \
        --query "sort_by(StackEvents[?contains(ResourceStatus, 'FAILED')], &Timestamp)[-10:]" \
        --output table > deploy-events.log

      if command -v pbcopy >/dev/null 2>&1; then
        cat deploy-events.log | pbcopy
        echo "Copied failure events to clipboard (deploy-events.log)"
      fi

      exit 1
      ;;
    CREATE_FAILED|ROLLBACK_FAILED|UPDATE_ROLLBACK_FAILED)
      printf "\r❌ [$time_str] Hard failure: $STATUS\n"
      exit 1
      ;;
    *)
      printf "\r${SPINNER[i++ % ${#SPINNER[@]}]} [$time_str] Status: $STATUS"
      sleep 2
      ;;
  esac
done

echo "Deployment complete!"

echo "Fetching deployed frontend bucket name..."
FRONTEND_BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$APP_NAME" \
  --region "$AWS_REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text --no-paginate 2>/dev/null)

if [ -z "$FRONTEND_BUCKET_NAME" ]; then
  echo "⚠️ Could not determine frontend bucket name from stack outputs. Skipping asset upload."
else
  echo "Uploading frontend assets to bucket: $FRONTEND_BUCKET_NAME"
  aws s3 sync ./frontend/ "s3://$FRONTEND_BUCKET_NAME/" --delete --region "$AWS_REGION" --no-paginate >/dev/null 2>&1
fi

# Echo Application URL
echo "Fetching Application URL..."
APP_URL=$(aws cloudformation describe-stacks --stack-name "$APP_NAME" --query 'Stacks[0].Outputs[?OutputKey==`ApplicationURL`].OutputValue' --output text --region "$AWS_REGION" --no-paginate 2>/dev/null)
echo "Application URL: $APP_URL"

echo "Cleaning up..."
rm -f backend/cloudformation/packaged-template.json

echo "Deployment complete!"