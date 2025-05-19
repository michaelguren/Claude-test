#!/bin/bash
set -euo pipefail

: "${APP_NAME:?Must set APP_NAME}"
: "${ENV:?Must set ENV (used as AWS_PROFILE)}"
: "${AWS_REGION:?Must set AWS_REGION}"

echo "Fetching deployed frontend bucket name from stack '$APP_NAME' in profile '$ENV'..."

FRONTEND_BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$APP_NAME" \
  --region "$AWS_REGION" \
  --profile "$ENV" \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text --no-paginate 2>/dev/null)

if [ -z "$FRONTEND_BUCKET_NAME" ]; then
  echo "⚠️  Could not determine frontend bucket name from stack outputs. Skipping asset upload."
  exit 1
fi

echo "Uploading frontend assets to bucket: $FRONTEND_BUCKET_NAME"
if aws s3 sync ./frontend/ "s3://$FRONTEND_BUCKET_NAME/" --delete --region "$AWS_REGION" --profile "$ENV"; then
  echo "✅ Frontend assets successfully uploaded to s3://$FRONTEND_BUCKET_NAME"
else
  echo "❌ Failed to upload frontend assets. See above for details."
  exit 1
fi