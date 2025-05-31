#!/bin/bash
set -euo pipefail

# Deployment context
STACK_NAME="minimalist-todo-20250528" \
AWS_REGION="us-east-1" \
AWS_PROFILE="dev" \

# Get the deployed HTTP API URL from stack output
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE" \
  --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" \
  --output text)

if [[ -z "$API_URL" ]]; then
  echo "❌ Error: Could not determine API URL from CloudFormation stack outputs"
  exit 1
fi

echo "🔗 API URL: $API_URL"

# Static headers (no real auth yet)
AUTH_HEADER="Authorization: Bearer dummy-token"
CONTENT_TYPE="Content-Type: application/json"

# Sample test data
USER_EMAIL="testuser@example.com"
USER_NAME="Test User"
USER_ROLE="USER"

echo "🧪 Creating user..."
create_response=$(curl -s -X POST "$API_URL/users" \
  -H "$CONTENT_TYPE" \
  -H "$AUTH_HEADER" \
  -d "{\"email\":\"$USER_EMAIL\", \"name\":\"$USER_NAME\", \"role\":\"$USER_ROLE\"}")

echo "📥 Response: $create_response"


USER_ID="01JWFKDT327VGCAZB48VFGB1E0" \
CONTENT_TYPE="Content-Type: application/json" \
UPDATE_PAYLOAD=$(jq -nc --arg name "Updated name BOOM" '{name: $name}')

echo
echo "🔍 Fetching user by ID..."
curl -s "$API_URL/users/$USER_ID" -H "$AUTH_HEADER"
echo

echo "📃 Listing all users..."
curl -s "$API_URL/users" -H "$AUTH_HEADER"
echo


curl -s -X PUT "$API_URL/users/$USER_ID" \
  -H "$CONTENT_TYPE" \
  -d "$UPDATE_PAYLOAD"

echo "🗑️ Deleting user..."
curl -s -X DELETE "$API_URL/users/$USER_ID" -H "$AUTH_HEADER"
echo

echo "✅ User resource test completed successfully."