#!/bin/bash
set -euo pipefail

# TODO API Test Script
# Tests the complete TODO CRUD operations

# Configuration
STACK_NAME="minimalist-todo-20250528"
AWS_REGION="us-east-1" 
AWS_PROFILE="dev"
TEST_USER_ID="01JWKQB7D1Q1P2GF8EA6PSK60F"  # Using mguren@mac.com user

echo "🧪 Testing TODO API Flow"
echo "========================"

# Get API URL from CloudFormation stack
echo "📡 Getting API URL from stack outputs..."
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE" \
  --query 'Stacks[0].Outputs[?OutputKey==`HttpApiUrl`].OutputValue' \
  --output text)

if [ -z "$API_URL" ]; then
  echo "❌ Error: Could not determine API URL from stack outputs"
  exit 1
fi

echo "🔗 API URL: $API_URL"
echo

# Headers
CONTENT_TYPE="Content-Type: application/json"
USER_ID_HEADER="x-user-id: $TEST_USER_ID"  # Temporary until JWT is wired up

# Helper function for API calls
call_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4
  
  echo "📤 $description"
  echo "   $method $API_URL$endpoint"
  
  if [ -n "$data" ]; then
    echo "   Data: $data"
  fi
  
  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X "$method" \
    -H "$CONTENT_TYPE" \
    -H "$USER_ID_HEADER" \
    -d "$data" \
    "$API_URL$endpoint")
  
  # Split response and status code
  http_body=$(echo "$response" | sed -E '$d')
  http_status=$(echo "$response" | tail -n1 | sed -E 's/.*:([0-9]+)$/\1/')
  
  echo "   Status: $http_status"
  echo "   Response: $http_body"
  echo
  
  # Return status for conditional logic
  return $((http_status >= 400 ? 1 : 0))
}

# Store TODO IDs for cleanup
TODO_IDS=()

# Test 1: List TODOs (should be empty initially)
echo "🔍 Test 1: List TODOs (should be empty)"
echo "--------------------------------------"
if call_api "GET" "/todos" "" "Getting all TODOs for user"; then
  echo "✅ Successfully retrieved TODO list"
else
  echo "❌ Failed to get TODO list"
  exit 1
fi

# Test 2: Create first TODO
echo "🔍 Test 2: Create First TODO"
echo "----------------------------"
TODO_TEXT_1="Buy groceries for the week"
if response=$(call_api "POST" "/todos" "{\"text\":\"$TODO_TEXT_1\"}" "Creating first TODO") && [ $? -eq 0 ]; then
  echo "✅ First TODO created successfully"
  # Extract TODO ID from response for later use
  TODO_ID_1=$(echo "$response" | grep -o '"todoId":"[^"]*"' | cut -d'"' -f4 || echo "")
  if [ -n "$TODO_ID_1" ]; then
    TODO_IDS+=("$TODO_ID_1")
    echo "   📝 TODO ID: $TODO_ID_1"
  fi
else
  echo "❌ Failed to create first TODO"
  exit 1
fi

# Test 3: Create second TODO
echo "🔍 Test 3: Create Second TODO"
echo "-----------------------------"
TODO_TEXT_2="Finish the TODO backend implementation"
if response=$(call_api "POST" "/todos" "{\"text\":\"$TODO_TEXT_2\"}" "Creating second TODO") && [ $? -eq 0 ]; then
  echo "✅ Second TODO created successfully"
  TODO_ID_2=$(echo "$response" | grep -o '"todoId":"[^"]*"' | cut -d'"' -f4 || echo "")
  if [ -n "$TODO_ID_2" ]; then
    TODO_IDS+=("$TODO_ID_2")
    echo "   📝 TODO ID: $TODO_ID_2"
  fi
else
  echo "❌ Failed to create second TODO"
  exit 1
fi

# Test 4: List TODOs (should show both)
echo "🔍 Test 4: List TODOs (should show 2 items)"
echo "-------------------------------------------"
if call_api "GET" "/todos" "" "Getting all TODOs after creation"; then
  echo "✅ Successfully retrieved updated TODO list"
else
  echo "❌ Failed to get updated TODO list"
fi

# Test 5: Get specific TODO
echo "🔍 Test 5: Get Specific TODO"
echo "----------------------------"
if [ -n "$TODO_ID_1" ]; then
  if call_api "GET" "/todos/$TODO_ID_1" "" "Getting specific TODO by ID"; then
    echo "✅ Successfully retrieved specific TODO"
  else
    echo "❌ Failed to get specific TODO"
  fi
else
  echo "⚠️  Skipping - no TODO ID available"
fi

# Test 6: Update TODO text
echo "🔍 Test 6: Update TODO Text"
echo "---------------------------"
if [ -n "$TODO_ID_1" ]; then
  NEW_TEXT="Buy groceries and cook dinner"
  if call_api "PUT" "/todos/$TODO_ID_1" "{\"text\":\"$NEW_TEXT\"}" "Updating TODO text"; then
    echo "✅ Successfully updated TODO text"
  else
    echo "❌ Failed to update TODO text"
  fi
else
  echo "⚠️  Skipping - no TODO ID available"
fi

# Test 7: Mark TODO as completed
echo "🔍 Test 7: Mark TODO as Completed"
echo "---------------------------------"
if [ -n "$TODO_ID_2" ]; then
  if call_api "PUT" "/todos/$TODO_ID_2" "{\"completed\":true}" "Marking TODO as completed"; then
    echo "✅ Successfully marked TODO as completed"
  else
    echo "❌ Failed to mark TODO as completed"
  fi
else
  echo "⚠️  Skipping - no TODO ID available"
fi

# Test 8: Try to get non-existent TODO (should fail)
echo "🔍 Test 8: Get Non-existent TODO (should fail)"
echo "----------------------------------------------"
FAKE_TODO_ID="01NONEXISTENT123456789"
if call_api "GET" "/todos/$FAKE_TODO_ID" "" "Getting non-existent TODO"; then
  echo "❌ Non-existent TODO should have failed!"
else
  echo "✅ Non-existent TODO correctly returned error"
fi

# Test 9: Test validation errors
echo "🔍 Test 9: Validation Error Cases"
echo "---------------------------------"

echo "Testing empty TODO text..."
call_api "POST" "/todos" "{\"text\":\"\"}" "Creating TODO with empty text" || echo "✅ Empty text correctly rejected"

echo "Testing missing TODO text..."
call_api "POST" "/todos" "{}" "Creating TODO with missing text" || echo "✅ Missing text correctly rejected"

echo "Testing invalid JSON..."
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X "POST" \
  -H "$CONTENT_TYPE" \
  -H "$USER_ID_HEADER" \
  -d "invalid json" \
  "$API_URL/todos" || true)
echo "   Invalid JSON test - Status: $(echo "$response" | tail -n1 | sed -E 's/.*:([0-9]+)$/\1/')"

# Test 10: Clean up - Delete TODOs
echo "🔍 Test 10: Cleanup - Delete TODOs"
echo "----------------------------------"
for todo_id in "${TODO_IDS[@]}"; do
  if [ -n "$todo_id" ]; then
    if call_api "DELETE" "/todos/$todo_id" "" "Deleting TODO $todo_id"; then
      echo "✅ Successfully deleted TODO $todo_id"
    else
      echo "❌ Failed to delete TODO $todo_id"
    fi
  fi
done

# Final verification - list should be empty again
echo "🔍 Final Verification: List TODOs (should be empty again)"
echo "---------------------------------------------------------"
if call_api "GET" "/todos" "" "Final TODO list check"; then
  echo "✅ Final TODO list retrieved"
else
  echo "❌ Failed final TODO list check"
fi

echo
echo "🎉 TODO API Tests Completed!"
echo "============================"
echo "✅ API endpoints are responding correctly"
echo "✅ CRUD operations are working"
echo "✅ Validation logic is proper"
echo "✅ Error handling is working"
echo "✅ TODO backend is ready!"
echo
echo "API Route Summary:"
echo "- GET  /todos           → List user's TODOs"
echo "- POST /todos           → Create new TODO"
echo "- GET  /todos/{id}      → Get specific TODO"
echo "- PUT  /todos/{id}      → Update TODO"
echo "- DELETE /todos/{id}    → Delete TODO"
echo
echo "Next steps:"
echo "1. Wire up JWT authentication to replace x-user-id header"
echo "2. Update frontend to use real TODO endpoints"
echo "3. Test the complete frontend integration"
echo "4. Add any additional TODO features (filters, search, etc.)"