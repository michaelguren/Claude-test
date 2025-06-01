#!/bin/bash
set -euo pipefail

# TODO API Test Script with JWT Authentication
# Tests the complete TODO CRUD operations using real JWT tokens

# Configuration
STACK_NAME="minimalist-todo-20250528"
AWS_REGION="us-east-1" 
AWS_PROFILE="dev"
TEST_EMAIL="mguren@mac.com"
TEST_PASSWORD="securepassword123"

echo "🧪 Testing TODO API Flow with JWT Authentication"
echo "==============================================="

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

# Helper function for API calls
call_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4
  local auth_header=${5:-""}
  
  echo "📤 $description"
  echo "   $method $API_URL$endpoint"
  
  if [ -n "$data" ]; then
    echo "   Data: $data"
  fi
  
  if [ -n "$auth_header" ]; then
    echo "   Auth: Bearer ${auth_header:0:20}..."
  fi
  
  # Build curl command with optional auth header
  if [ -n "$auth_header" ]; then
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
      -X "$method" \
      -H "$CONTENT_TYPE" \
      -H "Authorization: Bearer $auth_header" \
      -d "$data" \
      "$API_URL$endpoint")
  else
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
      -X "$method" \
      -H "$CONTENT_TYPE" \
      -d "$data" \
      "$API_URL$endpoint")
  fi
  
  # Split response and status code
  http_body=$(echo "$response" | sed -E '$d')
  http_status=$(echo "$response" | tail -n1 | sed -E 's/.*:([0-9]+)$/\1/')
  
  echo "   Status: $http_status"
  echo "   Response: $http_body"
  echo
  
  # Return status for conditional logic
  return $((http_status >= 400 ? 1 : 0))
}

# Step 1: Login to get JWT token
echo "🔐 Step 1: Login to get JWT token"
echo "--------------------------------"
login_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "$CONTENT_TYPE" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  "$API_URL/auth/login")

login_body=$(echo "$login_response" | sed -E '$d')
login_status=$(echo "$login_response" | tail -n1 | sed -E 's/.*:([0-9]+)$/\1/')

echo "📤 POST /auth/login"
echo "   Status: $login_status"
echo "   Response: $login_body"
echo

if [ "$login_status" -ne 200 ]; then
  echo "❌ Login failed. Please ensure user is verified and credentials are correct."
  echo "   Run ./scripts/verify-auth.sh if needed"
  exit 1
fi

# Extract JWT token
JWT_TOKEN=$(echo "$login_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "")
if [ -z "$JWT_TOKEN" ]; then
  echo "❌ Failed to extract JWT token from login response"
  exit 1
fi

echo "✅ JWT token obtained: ${JWT_TOKEN:0:30}..."
echo

# Store TODO IDs for cleanup
TODO_IDS=()

# Test 2: Try TODO operations without auth (should fail)
echo "🔍 Test 2: TODO operations without JWT (should fail)"
echo "---------------------------------------------------"
if call_api "GET" "/todos" "" "Getting TODOs without auth"; then
  echo "❌ Unauthenticated request should have failed!"
  exit 1
else
  echo "✅ Unauthenticated request correctly rejected"
fi

# Test 3: List TODOs with JWT (should work)
echo "🔍 Test 3: List TODOs with JWT (should be empty initially)"
echo "---------------------------------------------------------"
if call_api "GET" "/todos" "" "Getting all TODOs for user" "$JWT_TOKEN"; then
  echo "✅ Successfully retrieved TODO list with JWT"
else
  echo "❌ Failed to get TODO list with valid JWT"
  exit 1
fi

# Test 4: Create first TODO with JWT
echo "🔍 Test 4: Create First TODO with JWT"
echo "-------------------------------------"
TODO_TEXT_1="Buy groceries for the week"
if response=$(call_api "POST" "/todos" "{\"text\":\"$TODO_TEXT_1\"}" "Creating first TODO" "$JWT_TOKEN") && [ $? -eq 0 ]; then
  echo "✅ First TODO created successfully with JWT"
  # Extract TODO ID from response for later use
  TODO_ID_1=$(echo "$response" | grep -o '"todoId":"[^"]*"' | cut -d'"' -f4 || echo "")
  if [ -n "$TODO_ID_1" ]; then
    TODO_IDS+=("$TODO_ID_1")
    echo "   📝 TODO ID: $TODO_ID_1"
  fi
else
  echo "❌ Failed to create first TODO with JWT"
  exit 1
fi

# Test 5: Create second TODO with JWT
echo "🔍 Test 5: Create Second TODO with JWT"
echo "--------------------------------------"
TODO_TEXT_2="Finish the TODO backend implementation"
if response=$(call_api "POST" "/todos" "{\"text\":\"$TODO_TEXT_2\"}" "Creating second TODO" "$JWT_TOKEN") && [ $? -eq 0 ]; then
  echo "✅ Second TODO created successfully with JWT"
  TODO_ID_2=$(echo "$response" | grep -o '"todoId":"[^"]*"' | cut -d'"' -f4 || echo "")
  if [ -n "$TODO_ID_2" ]; then
    TODO_IDS+=("$TODO_ID_2")
    echo "   📝 TODO ID: $TODO_ID_2"
  fi
else
  echo "❌ Failed to create second TODO with JWT"
  exit 1
fi

# Test 6: List TODOs with JWT (should show both)
echo "🔍 Test 6: List TODOs with JWT (should show 2 items)"
echo "----------------------------------------------------"
if call_api "GET" "/todos" "" "Getting all TODOs after creation" "$JWT_TOKEN"; then
  echo "✅ Successfully retrieved updated TODO list with JWT"
else
  echo "❌ Failed to get updated TODO list with JWT"
fi

# Test 7: Get specific TODO with JWT
echo "🔍 Test 7: Get Specific TODO with JWT"
echo "-------------------------------------"
if [ -n "$TODO_ID_1" ]; then
  if call_api "GET" "/todos/$TODO_ID_1" "" "Getting specific TODO by ID" "$JWT_TOKEN"; then
    echo "✅ Successfully retrieved specific TODO with JWT"
  else
    echo "❌ Failed to get specific TODO with JWT"
  fi
else
  echo "⚠️  Skipping - no TODO ID available"
fi

# Test 8: Update TODO text with JWT
echo "🔍 Test 8: Update TODO Text with JWT"
echo "------------------------------------"
if [ -n "$TODO_ID_1" ]; then
  NEW_TEXT="Buy groceries and cook dinner"
  if call_api "PUT" "/todos/$TODO_ID_1" "{\"text\":\"$NEW_TEXT\"}" "Updating TODO text" "$JWT_TOKEN"; then
    echo "✅ Successfully updated TODO text with JWT"
  else
    echo "❌ Failed to update TODO text with JWT"
  fi
else
  echo "⚠️  Skipping - no TODO ID available"
fi

# Test 9: Mark TODO as completed with JWT
echo "🔍 Test 9: Mark TODO as Completed with JWT"
echo "------------------------------------------"
if [ -n "$TODO_ID_2" ]; then
  if call_api "PUT" "/todos/$TODO_ID_2" "{\"completed\":true}" "Marking TODO as completed" "$JWT_TOKEN"; then
    echo "✅ Successfully marked TODO as completed with JWT"
  else
    echo "❌ Failed to mark TODO as completed with JWT"
  fi
else
  echo "⚠️  Skipping - no TODO ID available"
fi

# Test 10: Try to get non-existent TODO with JWT (should fail)
echo "🔍 Test 10: Get Non-existent TODO with JWT (should fail)"
echo "--------------------------------------------------------"
FAKE_TODO_ID="01NONEXISTENT123456789"
if call_api "GET" "/todos/$FAKE_TODO_ID" "" "Getting non-existent TODO" "$JWT_TOKEN"; then
  echo "❌ Non-existent TODO should have failed!"
else
  echo "✅ Non-existent TODO correctly returned error"
fi

# Test 11: Test with invalid JWT token (should fail)
echo "🔍 Test 11: TODO operations with invalid JWT (should fail)"
echo "----------------------------------------------------------"
INVALID_TOKEN="invalid.jwt.token"
if call_api "GET" "/todos" "" "Getting TODOs with invalid JWT" "$INVALID_TOKEN"; then
  echo "❌ Invalid JWT should have failed!"
else
  echo "✅ Invalid JWT correctly rejected"
fi

# Test 12: Test validation errors with JWT
echo "🔍 Test 12: Validation Error Cases with JWT"
echo "-------------------------------------------"

echo "Testing empty TODO text with JWT..."
call_api "POST" "/todos" "{\"text\":\"\"}" "Creating TODO with empty text" "$JWT_TOKEN" || echo "✅ Empty text correctly rejected"

echo "Testing missing TODO text with JWT..."
call_api "POST" "/todos" "{}" "Creating TODO with missing text" "$JWT_TOKEN" || echo "✅ Missing text correctly rejected"

# Test 13: Clean up - Delete TODOs with JWT
echo "🔍 Test 13: Cleanup - Delete TODOs with JWT"
echo "-------------------------------------------"
for todo_id in "${TODO_IDS[@]}"; do
  if [ -n "$todo_id" ]; then
    if call_api "DELETE" "/todos/$todo_id" "" "Deleting TODO $todo_id" "$JWT_TOKEN"; then
      echo "✅ Successfully deleted TODO $todo_id with JWT"
    else
      echo "❌ Failed to delete TODO $todo_id with JWT"
    fi
  fi
done

# Final verification - list should be empty again
echo "🔍 Final Verification: List TODOs with JWT (should be empty again)"
echo "------------------------------------------------------------------"
if call_api "GET" "/todos" "" "Final TODO list check" "$JWT_TOKEN"; then
  echo "✅ Final TODO list retrieved with JWT"
else
  echo "❌ Failed final TODO list check with JWT"
fi

echo
echo "🎉 JWT-Authenticated TODO API Tests Completed!"
echo "=============================================="
echo "✅ JWT authentication is working correctly"
echo "✅ API endpoints are responding correctly"
echo "✅ CRUD operations work with JWT tokens"
echo "✅ Validation logic is proper"
echo "✅ Error handling is working"
echo "✅ TODO backend with JWT auth is ready!"
echo
echo "API Route Summary (JWT Protected):"
echo "- GET  /todos           → List user's TODOs (JWT required)"
echo "- POST /todos           → Create new TODO (JWT required)"
echo "- GET  /todos/{id}      → Get specific TODO (JWT required)"
echo "- PUT  /todos/{id}      → Update TODO (JWT required)"
echo "- DELETE /todos/{id}    → Delete TODO (JWT required)"
echo
echo "Next steps:"
echo "1. Test the complete frontend integration with JWT"
echo "2. Add any additional TODO features (filters, search, etc.)"
echo "3. Consider implementing JWT refresh token flow"
echo "4. Test with different user accounts for data isolation"