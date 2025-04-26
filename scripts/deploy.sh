#!/bin/bash
# Deployment script for Minimalist TODO application
# Deploys CloudFormation stack and uploads frontend files

# Default values
ENVIRONMENT="dev"
APP_NAME="minimalist-todo"
TEMPLATES_S3_BUCKET=""
REGION="us-east-1"
CF_ROLE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"

  case $key in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -n|--name)
      APP_NAME="$2"
      shift 2
      ;;
    -b|--bucket)
      TEMPLATES_S3_BUCKET="$2"
      shift 2
      ;;
    -r|--region)
      REGION="$2"
      shift 2
      ;;
    -p|--profile)
      AWS_PROFILE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  -e, --environment ENV   Set environment (dev or prod) [default: dev]"
      echo "  -n, --name NAME         Set application name [default: minimalist-todo]"
      echo "  -b, --bucket BUCKET     Set S3 bucket for CloudFormation templates"
      echo "  -r, --region REGION     Set AWS region [default: us-east-1]"
      echo "  -p, --profile PROFILE   Set AWS profile name"
      echo "  -h, --help              Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "Error: Environment must be 'dev' or 'prod'"
  exit 1
fi

# Set stack name
STACK_NAME="${APP_NAME}-${ENVIRONMENT}"

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CF_DIR="${ROOT_DIR}/backend/cloudformation"
FRONTEND_DIR="${ROOT_DIR}/frontend"

echo "Deploying ${STACK_NAME} to ${REGION} (${ENVIRONMENT} environment)"

# Check if deployment bucket exists
if [ -z "$TEMPLATES_S3_BUCKET" ]; then
  TEMPLATES_S3_BUCKET="${APP_NAME}-${ENVIRONMENT}-cf-templates-$(date +%s)"
  echo "No deployment bucket specified, creating: ${TEMPLATES_S3_BUCKET}"
  
  aws s3 mb "s3://${TEMPLATES_S3_BUCKET}" \
    --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}
  
  if [ $? -ne 0 ]; then
    echo "Error creating S3 bucket for templates"
    exit 1
  fi
fi

# Upload CloudFormation templates to S3
echo "Uploading CloudFormation templates to S3..."
for template in "${CF_DIR}"/*.json; do
  template_name="$(basename "$template")"
  echo "Uploading ${template_name}..."
  
  aws s3 cp "${template}" \
    "s3://${TEMPLATES_S3_BUCKET}/${template_name}" \
    --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}
  
  if [ $? -ne 0 ]; then
    echo "Error uploading template: ${template_name}"
    exit 1
  fi
done

# Determine callback and logout URLs based on environment
if [ "$ENVIRONMENT" == "dev" ]; then
  CALLBACK_URL="http://localhost:8080/callback.html"
  LOGOUT_URL="http://localhost:8080/index.html"
else
  # In production, we'll use the CloudFront URL, but we don't know it yet
  # We'll need to update these after initial deployment
  CALLBACK_URL="https://example.com/callback.html"
  LOGOUT_URL="https://example.com/index.html"
fi

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack: ${STACK_NAME}..."
aws cloudformation deploy \
  --template-url "https://${TEMPLATES_S3_BUCKET}.s3.${REGION}.amazonaws.com/main.json" \
  --stack-name "${STACK_NAME}" \
  --parameter-overrides \
      Environment="${ENVIRONMENT}" \
      AppName="${APP_NAME}" \
      CallbackUrl="${CALLBACK_URL}" \
      LogoutUrl="${LOGOUT_URL}" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}

if [ $? -ne 0 ]; then
  echo "Error deploying CloudFormation stack"
  exit 1
fi

# Get CloudFront domain and update frontend config
echo "Getting deployment outputs..."
CF_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" \
  --output text \
  --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}})

API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
  --output text \
  --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}})

COGNITO_USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolId'].OutputValue" \
  --output text \
  --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}})

COGNITO_USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolClientId'].OutputValue" \
  --output text \
  --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}})

COGNITO_HOSTED_UI_URL=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='HostedUISignInUrl'].OutputValue" \
  --output text \
  --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}})

# Get frontend S3 bucket name
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?contains(OutputKey, 'FrontendBucket')].OutputValue" \
  --output text \
  --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}})

if [ -z "${FRONTEND_BUCKET}" ]; then
  echo "Error: Could not retrieve frontend bucket name"
  exit 1
fi

# If in prod, update callback and logout URLs with CloudFront domain and redeploy auth stack
if [ "$ENVIRONMENT" == "prod" ] && [ -n "${CF_DOMAIN}" ]; then
  echo "Updating Cognito callback URL for production environment..."
  CALLBACK_URL="https://${CF_DOMAIN}/callback.html"
  LOGOUT_URL="https://${CF_DOMAIN}/index.html"
  
  aws cloudformation update-stack \
    --stack-name "${STACK_NAME}-AuthStack" \
    --template-url "https://${TEMPLATES_S3_BUCKET}.s3.${REGION}.amazonaws.com/auth.json" \
    --parameters \
        ParameterKey=Environment,ParameterValue="${ENVIRONMENT}" \
        ParameterKey=AppName,ParameterValue="${APP_NAME}" \
        ParameterKey=CallbackUrl,ParameterValue="${CALLBACK_URL}" \
        ParameterKey=LogoutUrl,ParameterValue="${LOGOUT_URL}" \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
    --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}
fi

# Create environment-specific config file
echo "Creating config file for ${ENVIRONMENT} environment..."

# Create a temporary config.js file
CONFIG_FILE="${SCRIPT_DIR}/config.js.tmp"
cat > "${CONFIG_FILE}" << EOF
/**
 * Configuration settings for the TODO application
 * Environment: ${ENVIRONMENT}
 * Generated: $(date)
 */

(function() {
  // Default configuration values
  const defaultConfig = {
    // API configuration
    apiBaseUrl: '${API_ENDPOINT}',
    useMockApi: ${ENVIRONMENT == "dev" ? "true" : "false"},
    
    // Auth configuration
    cognitoUserPoolId: '${COGNITO_USER_POOL_ID}',
    cognitoClientId: '${COGNITO_USER_POOL_CLIENT_ID}',
    cognitoHostedUiUrl: '${COGNITO_HOSTED_UI_URL}',
    cognitoLogoutUrl: '',
    region: '${REGION}',
    
    // Environment settings
    environment: '${ENVIRONMENT}',
    debug: ${ENVIRONMENT == "dev" ? "true" : "false"}
  };
  
  // Expose configuration globally
  window.APP_CONFIG = defaultConfig;
})();
EOF

# Upload frontend files to S3
echo "Uploading frontend files to S3 bucket: ${FRONTEND_BUCKET}..."

# First, upload the generated config
aws s3 cp "${CONFIG_FILE}" \
  "s3://${FRONTEND_BUCKET}/js/config.js" \
  --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}

# Upload the rest of the frontend files (excluding the original config.js)
aws s3 sync "${FRONTEND_DIR}" "s3://${FRONTEND_BUCKET}" \
  --exclude "js/config.js" \
  --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}

if [ $? -ne 0 ]; then
  echo "Error uploading frontend files"
  exit 1
fi

# Create invalidation for CloudFront
if [ -n "${CF_DOMAIN}" ]; then
  echo "Creating CloudFront invalidation..."
  
  # Get CloudFront distribution ID
  CF_DIST_ID=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --query "Stacks[0].Outputs[?contains(OutputKey, 'CloudFrontDistributionId')].OutputValue" \
    --output text \
    --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}})
  
  if [ -n "${CF_DIST_ID}" ]; then
    aws cloudfront create-invalidation \
      --distribution-id "${CF_DIST_ID}" \
      --paths "/*" \
      --region "${REGION}" ${AWS_PROFILE:+--profile ${AWS_PROFILE}}
  fi
fi

# Clean up temporary files
rm -f "${CONFIG_FILE}"

echo ""
echo "Deployment Complete!"
echo "===================="
if [ -n "${CF_DOMAIN}" ]; then
  echo "CloudFront URL: https://${CF_DOMAIN}"
fi
echo "API Endpoint: ${API_ENDPOINT}"
echo "Cognito User Pool ID: ${COGNITO_USER_POOL_ID}"
echo "Cognito App Client ID: ${COGNITO_USER_POOL_CLIENT_ID}"
echo ""
echo "For local testing, update your frontend/js/config.js with these values."
echo "===================="

exit 0