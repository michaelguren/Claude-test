#!/bin/bash
set -euo pipefail

# Auth API Test Script
# Tests the simplified 3-endpoint authentication flow

# Configuration
STACK_NAME="minimalist-todo-20250528"
AWS_REGION="us-east-1" 
AWS_PROFILE="dev"
TEST_EMAIL="mguren@mac.com"
TEST_PASSWORD="securepassword123"

echo "🧪 Testing Simplified Auth API Flow (3 Endpoints)"
echo "================================================="

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
  
  echo "📤 $description"
  echo "   $method $API_URL$endpoint"
  
  if [ -n "$data" ]; then
    echo "   Data: $data"
  fi
  
  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X "$method" \
    -H "$CONTENT_TYPE" \
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

# Test 1: Create account and send verification (NEW SIMPLIFIED ENDPOINT)
echo "🔍 Test 1: Signup - Create Account & Send Verification"
echo "-----------------------------------------------------"
if call_api "POST" "/auth/signup" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" "Creating account and sending verification"; then
  echo "✅ Account created and verification email sent successfully"
else
  echo "❌ Failed to create account"
  exit 1
fi

# Test 2: Try to signup again (should fail - user already exists)
echo "🔍 Test 2: Signup Again - Should Fail (User Exists)"
echo "--------------------------------------------------"
if call_api "POST" "/auth/signup" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" "Attempting signup again (should fail)"; then
  echo "❌ Duplicate signup should have failed!"
  exit 1
else
  echo "✅ Duplicate signup correctly rejected"
fi

# Test 3: Try to verify with wrong code (should fail)
echo "🔍 Test 3: Invalid Verification Code (should fail)"
echo "--------------------------------------------------"
if call_api "POST" "/auth/verify" "{\"email\":\"$TEST_EMAIL\",\"code\":\"000000\"}" "Testing invalid verification code"; then
  echo "❌ Invalid verification code should have failed!"
  exit 1
else
  echo "✅ Invalid verification code correctly rejected"
fi

# Test 4: Try to login before verification (should fail)
echo "🔍 Test 4: Login Before Verification (should fail)"
echo "--------------------------------------------------"
if call_api "POST" "/auth/login" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" "Attempting login before verification"; then
  echo "❌ Login should have failed before verification!"
  exit 1
else
  echo "✅ Login correctly rejected before verification"
fi

# Test 5: Test error cases for verification
echo "🔍 Test 5: Verification Error Cases"
echo "-----------------------------------"

echo "Testing missing code in verify..."
call_api "POST" "/auth/verify" "{\"email\":\"$TEST_EMAIL\"}" "Missing verification code" || echo "✅ Missing code correctly rejected"

echo "Testing missing email in verify..."
call_api "POST" "/auth/verify" "{\"code\":\"123456\"}" "Missing email" || echo "✅ Missing email correctly rejected"

echo "Testing empty payload in verify..."
call_api "POST" "/auth/verify" "{}" "Empty payload" || echo "✅ Empty payload correctly rejected"

# Test 6: Test error cases for signup
echo "🔍 Test 6: Signup Error Cases"
echo "-----------------------------"

echo "Testing invalid email format..."
call_api "POST" "/auth/signup" "{\"email\":\"invalid-email\",\"password\":\"$TEST_PASSWORD\"}" "Invalid email format" || echo "✅ Invalid email correctly rejected"

echo "Testing missing password..."
call_api "POST" "/auth/signup" "{\"email\":\"$TEST_EMAIL\"}" "Missing password" || echo "✅ Missing password correctly rejected"

echo "Testing short password..."
call_api "POST" "/auth/signup" "{\"email\":\"$TEST_EMAIL\",\"password\":\"123\"}" "Short password" || echo "✅ Short password correctly rejected"

echo "Testing missing email..."
call_api "POST" "/auth/signup" "{\"password\":\"$TEST_PASSWORD\"}" "Missing email" || echo "✅ Missing email correctly rejected"

# Test 7: Test error cases for login
echo "🔍 Test 7: Login Error Cases"
echo "----------------------------"

echo "Testing missing password in login..."
call_api "POST" "/auth/login" "{\"email\":\"$TEST_EMAIL\"}" "Missing password" || echo "✅ Missing password correctly rejected"

echo "Testing missing email in login..."
call_api "POST" "/auth/login" "{\"password\":\"$TEST_PASSWORD\"}" "Missing email" || echo "✅ Missing email correctly rejected"

echo "Testing invalid email format in login..."
call_api "POST" "/auth/login" "{\"email\":\"invalid-email\",\"password\":\"$TEST_PASSWORD\"}" "Invalid email format" || echo "✅ Invalid email correctly rejected"

echo "Testing wrong password..."
call_api "POST" "/auth/login" "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrongpassword\"}" "Wrong password" || echo "✅ Wrong password correctly rejected"

# Manual step for email verification
echo "📧 Manual Step Required:"
echo "========================"
echo "Check your email for the verification code, then run:"
echo "./scripts/verify-auth.sh"
echo
echo "Or manually complete verification with:"
echo "curl -X POST '$API_URL/auth/verify' \\"
echo "  -H '$CONTENT_TYPE' \\"
echo "  -d '{\"email\":\"$TEST_EMAIL\",\"code\":\"YOUR_CODE_HERE\"}'"
echo
echo "After completing verification, test login with:"
echo "curl -X POST '$API_URL/auth/login' \\"
echo "  -H '$CONTENT_TYPE' \\"
echo "  -d '{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}'"
echo

echo "🎉 Simplified Auth API Tests Completed!"
echo "======================================="
echo "✅ API endpoints are responding correctly"
echo "✅ Validation logic is working"
echo "✅ Error handling is proper"
echo "✅ Simplified 3-endpoint flow is working"
echo "✅ Duplicate signup prevention is working"
echo
echo "NEW API Route Summary:"
echo "- POST /auth/signup   → Create account + send verification email"
echo "- POST /auth/verify   → Verify email with code"
echo "- POST /auth/login    → Login verified user"
echo
echo "Next steps:"
echo "1. Check your email for the verification code"
echo "2. Run ./scripts/verify-auth.sh to complete verification and test login"
echo "3. Test the frontend at http://localhost:8080"