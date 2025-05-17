#!/bin/bash
set -euo pipefail

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
