#!/bin/bash
set -euo pipefail

# Configuration
ADMIN_EMAIL="admin@yourcompany.com"
ADMIN_NAME="System Administrator"
ADMIN_ID="01JWFKDT327VGCAZB48VFGB1E0"
STACK_NAME="minimalist-todo-20250528"
AWS_REGION="us-east-1"
AWS_PROFILE="dev"

echo "Creating first admin user: $ADMIN_EMAIL"

# Get table name
TABLE_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE" \
  --query 'Stacks[0].Outputs[?OutputKey==`MainTableName`].OutputValue' \
  --output text)

if [ -z "$TABLE_NAME" ]; then
  echo "❌ Error: Could not determine table name from stack outputs"
  exit 1
fi

echo "Using table: $TABLE_NAME"
echo "Using admin ID: $ADMIN_ID"

# Create temp file for item payload
TMP_FILE=$(mktemp)

cat > "$TMP_FILE" <<EOF
{
  "PK": {"S": "USER#$ADMIN_ID"},
  "SK": {"S": "PROFILE"},
  "id": {"S": "$ADMIN_ID"},
  "email": {"S": "$ADMIN_EMAIL"},
  "name": {"S": "$ADMIN_NAME"},
  "role": {"S": "ADMIN"},
  "status": {"S": "ACTIVE"},
  "emailVerified": {"BOOL": true},
  "createdAt": {"S": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"},
  "updatedAt": {"S": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"},
  "GSI1PK": {"S": "EMAIL#$ADMIN_EMAIL"},
  "GSI1SK": {"S": "LOOKUP"}
}
EOF

# Perform put-item
aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --item file://"$TMP_FILE" \
  --return-consumed-capacity TOTAL

# Clean up
rm "$TMP_FILE"

echo "✅ Admin user created successfully"