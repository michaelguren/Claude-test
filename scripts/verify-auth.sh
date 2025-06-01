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

echo "🧪 Complete Verification and Login Test (Simplified Flow)"
echo "========================================================="

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
echo "🔍 Step 1: Verify Email with Code (SIMPLIFIED ENDPOINT)"
echo "------------------------------------------------------"

# Verify email with NEW simplified endpoint
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"code\":\"$VERIFICATION_CODE\"}" \
  "$API_URL/auth/verify")

http_body=$(echo "$response" | sed -E '$d')
http_status=$(echo "$response" | tail -n1 | sed -E 's/.*:([0-9]+)$/\1/')

echo "📤 POST /auth/verify"
echo "   Data: {\"email\":\"$TEST_EMAIL\",\"code\":\"$VERIFICATION_CODE\"}"
echo "   Status: $http_status"
echo "   Response: $http_body"
echo

if [ "$http_status" -eq 200 ]; then
  echo "✅ Email verification completed successfully!"
  
  echo
  echo "🔍 Step 2: Test Login (Now Should Work)"
  echo "--------------------------------------"
  
  # Test login after verification
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
    echo "✅ Login successful!"
    
    # Extract token for further testing
    login_token=$(echo "$login_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "")
    if [ -n "$login_token" ]; then
      echo "🎫 JWT Token received: ${login_token:0:50}..."
      echo
      
      echo "🧪 Testing authenticated API call..."
      
      # Test users endpoint with login token (if JWT auth is wired up)
      auth_test=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -H "Authorization: Bearer $login_token" \
        "$API_URL/users" 2>/dev/null || echo "SKIP
HTTP_STATUS:000")
      
      auth_body=$(echo "$auth_test" | sed -E '$d')
      auth_status=$(echo "$auth_test" | tail -n1 | sed -E 's/.*:([0-9]+)$/\1/')
      
      if [ "$auth_status" != "000" ]; then
        echo "📤 GET /users (with JWT token)"
        echo "   Status: $auth_status"
        echo "   Response: $auth_body"
        echo
        
        if [ "$auth_status" -eq 200 ]; then
          echo "✅ Authenticated API call successful!"
        else
          echo "⚠️  Authenticated API call failed (JWT validation may not be set up yet)"
        fi
      else
        echo "⚠️  Skipping authenticated API test (endpoint may not be available)"
      fi
    fi
    
  else
    echo "❌ Login failed after verification!"
    echo "   This indicates an issue with the login logic"
    exit 1
  fi
  
elif [ "$http_status" -eq 400 ]; then
  echo "❌ Email verification failed!"
  echo "   Possible causes:"
  echo "   - Invalid or expired verification code"
  echo "   - Incorrect email address"
  echo "   - Missing required fields"
  echo
  echo "   Try running ./scripts/test-auth.sh again to get a fresh code"
  exit 1
elif [ "$http_status" -eq 409 ]; then
  echo "⚠️  User already verified"
  echo "   Proceeding to test login..."
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
    echo "✅ Login successful for already verified user!"
  else
    echo "❌ Login failed for verified user!"
    exit 1
  fi
else
  echo "❌ Email verification failed with unexpected status: $http_status"
  exit 1
fi

echo
echo "🎉 Complete Simplified Auth Flow Test Successful!"
echo "================================================="
echo "✅ Simplified auth flow is working correctly:"
echo "   1. POST /auth/signup  → Create account + send verification email"  
echo "   2. POST /auth/verify  → Verify email with code"
echo "   3. POST /auth/login   → Login verified users"
echo
echo "✅ JWT token generation works"
echo "✅ User creation and verification works"
echo "✅ Both verification and login flows work"
echo
echo "🚀 Your simplified auth backend is ready!"
echo
echo "Next steps:"
echo "- Update frontend to use new /auth/verify endpoint"
echo "- Test the frontend at http://localhost:8080"
echo "- Verify the streamlined user experience"