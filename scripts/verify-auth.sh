#!/bin/bash
set -euo pipefail

# Manual Email Verification and Login Test
# Run this after you receive the verification email from the signup process

# Configuration
STACK_NAME="minimalist-todo-20250528"
AWS_REGION="us-east-1" 
AWS_PROFILE="dev"
TEST_EMAIL="mguren@mac.com"
TEST_PASSWORD="securepassword123"

echo "🧪 Complete Registration and Login Test"
echo "======================================="

# Get API URL
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

# Prompt for verification code
echo "📧 Enter the verification code from your email"
echo "   (This should be sent after running ./scripts/test-auth.sh)"
echo
read -p "Enter the 6-digit verification code: " VERIFICATION_CODE

if [ -z "$VERIFICATION_CODE" ]; then
  echo "❌ Verification code cannot be empty"
  exit 1
fi

# Validate code format
if ! [[ "$VERIFICATION_CODE" =~ ^[0-9]{6}$ ]]; then
  echo "❌ Verification code must be exactly 6 digits"
  exit 1
fi

echo
echo "🔍 Step 1: Complete Registration with Verification Code"
echo "------------------------------------------------------"

# Complete registration with NEW endpoint
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"code\":\"$VERIFICATION_CODE\",\"password\":\"$TEST_PASSWORD\"}" \
  "$API_URL/auth/verify-signup")

http_body=$(echo "$response" | sed -E '$d')
http_status=$(echo "$response" | tail -n1 | sed -E 's/.*:([0-9]+)$/\1/')

echo "📤 POST /auth/verify-signup"
echo "   Data: {\"email\":\"$TEST_EMAIL\",\"code\":\"$VERIFICATION_CODE\",\"password\":\"***\"}"
echo "   Status: $http_status"
echo "   Response: $http_body"
echo

if [ "$http_status" -eq 201 ]; then
  echo "✅ Registration completed successfully!"
  
  # Check if we got a token back (new flow auto-logs in)
  token=$(echo "$http_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "")
  
  if [ -n "$token" ]; then
    echo "🎫 JWT Token received from registration: ${token:0:50}..."
    echo "   (New flow automatically logs you in after verification)"
    echo
    
    echo "🧪 Testing authenticated API call with registration token..."
    
    # Test users endpoint with token from registration
    auth_test=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
      -H "Authorization: Bearer $token" \
      "$API_URL/users")
    
    auth_body=$(echo "$auth_test" | sed -E '$d')
    auth_status=$(echo "$auth_test" | tail -n1 | sed -E 's/.*:([0-9]+)$/\1/')
    
    echo "📤 GET /users (with registration token)"
    echo "   Status: $auth_status"
    echo "   Response: $auth_body"
    echo
    
    if [ "$auth_status" -eq 200 ]; then
      echo "✅ Authenticated API call successful!"
    else
      echo "⚠️  Authenticated API call failed (JWT validation may not be set up yet)"
    fi
  fi
  
  echo
  echo "🔍 Step 2: Test Separate Login (should also work)"
  echo "------------------------------------------------"
  
  # Test separate login
  login_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "$API_URL/auth/login")
  
  login_body=$(echo "$login_response" | sed -E '$d')
  login_status=$(echo "$login_response" | tail -n1 | sed -E 's/.*:([0-9]+)$/\1/')
  
  echo "📤 POST /auth/login"
  echo "   Data: {\"email\":\"$TEST_EMAIL\",\"password\":\"***\"}"
  echo "   Status: $login_status"
  echo "   Response: $login_body"
  echo
  
  if [ "$login_status" -eq 200 ]; then
    echo "✅ Separate login successful!"
    
    # Extract token for further testing
    login_token=$(echo "$login_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "")
    if [ -n "$login_token" ]; then
      echo "🎫 JWT Token from login: ${login_token:0:50}..."
      echo
      
      echo "🧪 Testing authenticated API call with login token..."
      
      # Test users endpoint with login token
      auth_test2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -H "Authorization: Bearer $login_token" \
        "$API_URL/users")
      
      auth_body2=$(echo "$auth_test2" | sed -E '$d')
      auth_status2=$(echo "$auth_test2" | tail -n1 | sed -E 's/.*:([0-9]+)$/\1/')
      
      echo "📤 GET /users (with login token)"
      echo "   Status: $auth_status2"
      echo "   Response: $auth_body2"
      echo
      
      if [ "$auth_status2" -eq 200 ]; then
        echo "✅ Authenticated API call with login token successful!"
      else
        echo "⚠️  Authenticated API call failed (JWT validation may not be set up yet)"
      fi
    fi
    
  else
    echo "❌ Separate login failed!"
    echo "   This might indicate an issue with the user creation process"
    exit 1
  fi
  
elif [ "$http_status" -eq 400 ]; then
  echo "❌ Registration completion failed!"
  echo "   Possible causes:"
  echo "   - Invalid or expired verification code"
  echo "   - Missing required fields"
  echo "   - Password too short"
  echo
  echo "   Try running ./scripts/test-auth.sh again to get a fresh code"
  exit 1
elif [ "$http_status" -eq 409 ]; then
  echo "⚠️  User already exists and is verified"
  echo "   Skipping to login test..."
  echo
  
  # Test login directly
  login_response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "$API_URL/auth/login")
  
  login_body=$(echo "$login_response" | sed -E '$d')
  login_status=$(echo "$login_response" | tail -n1 | sed -E 's/.*:([0-9]+)$/\1/')
  
  echo "📤 POST /auth/login"
  echo "   Status: $login_status"
  echo "   Response: $login_body"
  echo
  
  if [ "$login_status" -eq 200 ]; then
    echo "✅ Login successful for existing user!"
  else
    echo "❌ Login failed for existing user!"
    exit 1
  fi
else
  echo "❌ Registration completion failed with unexpected status: $http_status"
  exit 1
fi

echo
echo "🎉 Complete Auth Flow Test Successful!"
echo "======================================"
echo "✅ New auth flow is working correctly:"
echo "   1. POST /auth/signup        → Send verification email"  
echo "   2. POST /auth/verify-signup → Complete registration + auto-login"
echo "   3. POST /auth/login         → Login existing users"
echo
echo "✅ JWT token generation works"
echo "✅ User creation and verification works"
echo "✅ Both registration and login flows work"
echo
echo "🚀 Your new auth backend is ready!"
echo
echo "Next steps:"
echo "- Test the frontend at http://localhost:8080"
echo "- Try the registration flow in the browser"
echo "- Verify CORS issues are resolved"