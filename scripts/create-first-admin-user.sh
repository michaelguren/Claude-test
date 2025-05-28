#!/bin/bash
set -euo pipefail

# Configuration
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@yourcompany.com}"
ADMIN_NAME="${ADMIN_NAME:-System Administrator}"
ADMIN_ID="${ADMIN_ID:-01HVN8T7G8K9M2Q3R4S5T6U7V8}" # You can generate a ULID or use this example ULID
STACK_NAME="${STACK_NAME:-minimalist-todo-20250526}"
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-dev}"

echo "Creating first admin user: $ADMIN_EMAIL"

# Get the table name from the stack
TABLE_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE" \
  --query 'Stacks[0].Outputs[?OutputKey==`MainTableName`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$TABLE_NAME" ]; then
  echo "Error: Could not determine table name from stack outputs"
  exit 1
fi

echo "Using table: $TABLE_NAME"
echo "Using admin ID: $ADMIN_ID"

# Create the admin user
aws dynamodb put-item \
  --table-name "$TABLE_NAME" \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --item "{
    \"PK\": {\"S\": \"USER#$ADMIN_ID\"},
    \"SK\": {\"S\": \"PROFILE\"},
    \"id\": {\"S\": \"$ADMIN_ID\"},
    \"email\": {\"S\": \"$ADMIN_EMAIL\"},
    \"name\": {\"S\": \"$ADMIN_NAME\"},
    \"role\": {\"S\": \"ADMIN\"},
    \"status\": {\"S\": \"ACTIVE\"},
    \"emailVerified\": {\"BOOL\": true},
    \"createdAt\": {\"S\": \"$(date -u +\"%Y-%m-%dT%H:%M:%SZ\")\"},
    \"updatedAt\": {\"S\": \"$(date -u +\"%Y-%m-%dT%H:%M:%SZ\")\"},
    \"GSI1PK\": {\"S\": \"EMAIL#$ADMIN_EMAIL\"},
    \"GSI1SK\": {\"S\": \"LOOKUP\"}
  }" > /dev/null

echo "✅ Admin user created successfully"
echo "User ID: $ADMIN_ID"
echo "Email: $ADMIN_EMAIL"
echo ""
echo "Test the API with:"
echo "curl https://your-api-url/users"
echo "curl https://your-api-url/users/$ADMIN_ID"