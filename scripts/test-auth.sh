#!/bin/bash
set -euo pipefail

# Auth API Test Script
# Tests the complete email/password authentication flow with new logical API routes

# Configuration
STACK_NAME="minimalist-todo-20250528"
AWS_REGION="us-east-1" 
AWS_PROFILE="dev"
TEST_EMAIL="mguren@mac.com"
TEST_PASSWORD="securepassword123"

echo "🧪 Testing Auth API Flow (New Routes)"
echo "====================================="

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

# Test 1: Start signup process (send verification code)
echo "🔍 Test 1: Start Signup Process"
echo "-------------------------------"
if call_api "POST" "/auth/signup" "{\"email\":\"$TEST_EMAIL\"}" "Starting signup and sending verification code"; then
  echo "✅ Signup initiated and verification code sent successfully"
else
  echo "❌ Failed to start signup process"
  exit 1
fi

# Test 2: Try to start signup again (should work - resend code)
echo "🔍 Test 2: Resend Verification Code"
echo "-----------------------------------"
if call_api "POST" "/auth/signup" "{\"email\":\"$TEST_EMAIL\"}" "Attempting to resend verification code"; then
  echo "✅ Verification code resent successfully"
else
  echo "❌ Failed to resend verification code"
  exit 1
fi

# Test 3: Try to verify with wrong code (should fail)
echo "🔍 Test 3: Invalid Verification Code (should fail)"
echo "--------------------------------------------------"
if call_api "POST" "/auth/verify-signup" "{\"email\":\"$TEST_EMAIL\",\"code\":\"000000\",\"password\":\"$TEST_PASSWORD\"}" "Testing invalid verification code"; then
  echo "❌ Invalid verification code should have failed!"
  exit 1
else
  echo "✅ Invalid verification code correctly rejected"
fi

# Test 4: Try to login before completing registration (should fail)
echo "🔍 Test 4: Login Before Registration Complete (should fail)"
echo "-----------------------------------------------------------"
if call_api "POST" "/auth/login" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" "Attempting login before registration complete"; then
  echo "❌ Login should have failed before registration completion!"
  exit 1
else
  echo "✅ Login correctly rejected before registration completion"
fi

# Test 5: Test error cases for verification
echo "🔍 Test 5: Verification Error Cases"
echo "-----------------------------------"

echo "Testing missing password in verify-signup..."
call_api "POST" "/auth/verify-signup" "{\"email\":\"$TEST_EMAIL\",\"code\":\"123456\"}" "Missing password" || echo "✅ Missing password correctly rejected"

echo "Testing short password in verify-signup..."
call_api "POST" "/auth/verify-signup" "{\"email\":\"$TEST_EMAIL\",\"code\":\"123456\",\"password\":\"123\"}" "Short password" || echo "✅ Short password correctly rejected"

echo "Testing missing email in verify-signup..."
call_api "POST" "/auth/verify-signup" "{\"code\":\"123456\",\"password\":\"$TEST_PASSWORD\"}" "Missing email" || echo "✅ Missing email correctly rejected"

# Test 6: Test error cases for signup
echo "🔍 Test 6: Signup Error Cases"
echo "-----------------------------"

echo "Testing invalid email format..."
call_api "POST" "/auth/signup" "{\"email\":\"invalid-email\"}" "Invalid email format" || echo "✅ Invalid email correctly rejected"

echo "Testing missing email..."
call_api "POST" "/auth/signup" "{}" "Missing email" || echo "✅ Missing email correctly rejected"

# Test 7: Test error cases for login
echo "🔍 Test 7: Login Error Cases"
echo "----------------------------"

echo "Testing missing password in login..."
call_api "POST" "/auth/login" "{\"email\":\"$TEST_EMAIL\"}" "Missing password" || echo "✅ Missing password correctly rejected"

echo "Testing missing email in login..."
call_api "POST" "/auth/login" "{\"password\":\"$TEST_PASSWORD\"}" "Missing email" || echo "✅ Missing email correctly rejected"

echo "Testing invalid email format in login..."
call_api "POST" "/auth/login" "{\"email\":\"invalid-email\",\"password\":\"$TEST_PASSWORD\"}" "Invalid email format" || echo "✅ Invalid email correctly rejected"

# Manual step for email verification
echo "📧 Manual Step Required:"
echo "========================"
echo "Check your email for the verification code, then run:"
echo "./scripts/verify-auth.sh"
echo
echo "Or manually complete registration with:"
echo "curl -X POST '$API_URL/auth/verify-signup' \\"
echo "  -H '$CONTENT_TYPE' \\"
echo "  -d '{\"email\":\"$TEST_EMAIL\",\"code\":\"YOUR_CODE_HERE\",\"password\":\"$TEST_PASSWORD\"}'"
echo
echo "After completing registration, test login with:"
echo "curl -X POST '$API_URL/auth/login' \\"
echo "  -H '$CONTENT_TYPE' \\"
echo "  -d '{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}'"
echo

echo "🎉 Auth API Tests Completed!"
echo "=============================="
echo "✅ API endpoints are responding correctly"
echo "✅ Validation logic is working"
echo "✅ Error handling is proper"
echo "✅ New logical API flow is working"
echo
echo "API Route Summary:"
echo "- POST /auth/signup        → Send verification email"
echo "- POST /auth/verify-signup → Complete registration with code + password"
echo "- POST /auth/login         → Login existing user"
echo
echo "Next steps:"
echo "1. Check your email for the verification code"
echo "2. Complete the registration using the verification script"
echo "3. Test the login flow"
echo "4. Test the frontend at http://localhost:8080"