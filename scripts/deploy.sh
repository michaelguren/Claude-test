#!/bin/bash
# Minimalist TODO App - Deployment Script
# Deploys CloudFormation templates and uploads frontend files
# Uses AWS SSO-based account separation for dev/prod environments

# Ensure we're in the project root directory
cd "$(dirname "$0")/.."

CONFIG_FILE="project-config.js"

# Get AWS account ID and alias for environment detection
echo "Verifying AWS credentials..."
if ! AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text --no-cli-pager 2>/dev/null); then
  echo "ERROR: AWS credentials are invalid or expired."
  echo "Please log in using 'aws sso login' or set valid AWS credentials."
  exit 1
fi

# Get account alias to determine environment (dev/prod)
ACCOUNT_ALIAS=$(aws iam list-account-aliases --query "AccountAliases[0]" --output text --no-cli-pager)
if [ -z "$ACCOUNT_ALIAS" ]; then
  # If no alias is set, use a default value based on account ID
  ACCOUNT_ALIAS="aws-${AWS_ACCOUNT_ID}"
  echo "No AWS account alias found, using: $ACCOUNT_ALIAS"
fi

REGION=$(aws configure get region)
APP_NAME="minimalist-todo"
STAGE="$ACCOUNT_ALIAS"
STACK_NAME="${APP_NAME}-${STAGE}"
TIMESTAMP=$(date +%Y%m%d)

# Centralized account info display
echo "=============================================="
echo "AWS Account: $ACCOUNT_ALIAS ($AWS_ACCOUNT_ID)"
echo "Region: $REGION"
echo "Stage: $STAGE"
echo "Stack Name: $STACK_NAME"
echo "Auth: Enabled (always true for AWS deployments)"
echo "=============================================="

# Only create a template bucket if needed
if [ -f "$CONFIG_FILE" ] && grep -q "templateBucket" "$CONFIG_FILE" && grep -q -v "templateBucket: null" "$CONFIG_FILE"; then
  # Extract bucket name using node
  TEMPLATE_BUCKET=$(node -e "const cfg = require('./$CONFIG_FILE'); console.log(cfg.aws.templateBucket || '')")
  
  # Verify bucket exists
  if ! aws s3api head-bucket --bucket "$TEMPLATE_BUCKET" --no-cli-pager 2>/dev/null; then
    echo "Template bucket no longer exists. Creating a new one."
    TEMPLATE_BUCKET="${APP_NAME}-templates-${AWS_ACCOUNT_ID}-${TIMESTAMP}"
    echo "Creating bucket: $TEMPLATE_BUCKET"
    
    if ! aws s3 mb "s3://$TEMPLATE_BUCKET" --region "$REGION" --no-cli-pager; then
      echo "ERROR: Failed to create S3 bucket. Deployment aborted."
      exit 1
    fi
    
    # Update config with new bucket
    node -e "
      const fs = require('fs');
      const cfg = require('./$CONFIG_FILE');
      cfg.aws.templateBucket = '$TEMPLATE_BUCKET';
      cfg.aws.accountId = '$AWS_ACCOUNT_ID';
      fs.writeFileSync('$CONFIG_FILE', 
        'const projectConfig = ' + JSON.stringify(cfg, null, 2) + 
        ';\n\n// In browser environments, export to window\n' +
        'if (typeof window !== \\'undefined\\') {\n' +
        '  window.projectConfig = projectConfig;\n' +
        '}\n\n' +
        '// In Node.js environments, export as module\n' +
        'if (typeof module !== \\'undefined\\' && module.exports) {\n' +
        '  module.exports = projectConfig;\n' +
        '}');
    "
  fi
else
  # Create new configuration with bucket
  TEMPLATE_BUCKET="${APP_NAME}-templates-${AWS_ACCOUNT_ID}-${TIMESTAMP}"
  echo "Creating bucket: $TEMPLATE_BUCKET"
  
  if ! aws s3 mb "s3://$TEMPLATE_BUCKET" --region "$REGION" --no-cli-pager; then
    echo "ERROR: Failed to create S3 bucket. Deployment aborted."
    exit 1
  fi
  
  # Create or update config file
  node -e "
    const fs = require('fs');
    let cfg;
    try {
      cfg = require('./$CONFIG_FILE');
    } catch(e) {
      cfg = {
        application: { name: '$APP_NAME', description: 'Minimalist TODO Application with zero dependencies' },
        aws: { templateBucket: null, accountId: null },
        resources: { stack: { name: null, created: null, updated: null }, 
                   frontend: { bucketName: null, cloudfrontId: null, cloudfrontDomain: null } },
        deployments: []
      };
    }
    cfg.aws.templateBucket = '$TEMPLATE_BUCKET';
    cfg.aws.accountId = '$AWS_ACCOUNT_ID';
    fs.writeFileSync('$CONFIG_FILE', 
      'const projectConfig = ' + JSON.stringify(cfg, null, 2) + 
      ';\n\n// In browser environments, export to window\n' +
      'if (typeof window !== \\'undefined\\') {\n' +
      '  window.projectConfig = projectConfig;\n' +
      '}\n\n' +
      '// In Node.js environments, export as module\n' +
      'if (typeof module !== \\'undefined\\' && module.exports) {\n' +
      '  module.exports = projectConfig;\n' +
      '}');
  "
fi

echo "Using template bucket: $TEMPLATE_BUCKET"

# Upload CloudFormation templates
echo "Uploading CloudFormation templates..."
if ! aws s3 cp backend/cloudformation/frontend.json "s3://$TEMPLATE_BUCKET/" --no-cli-pager; then
  echo "ERROR: Failed to upload CloudFormation templates. Deployment aborted."
  exit 1
fi

if ! aws s3 cp backend/cloudformation/main.json "s3://$TEMPLATE_BUCKET/" --no-cli-pager; then
  echo "ERROR: Failed to upload CloudFormation templates. Deployment aborted."
  exit 1
fi

# Make sure to upload auth.json too
if ! aws s3 cp backend/cloudformation/auth.json "s3://$TEMPLATE_BUCKET/" --no-cli-pager; then
  echo "ERROR: Failed to upload auth.json template. Deployment aborted."
  exit 1
fi

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack..."
if ! aws cloudformation deploy \
  --template-file "backend/cloudformation/main.json" \
  --stack-name "$STACK_NAME" \
  --parameter-overrides \
    AppName="$APP_NAME" \
    Stage="$STAGE" \
    AuthEnabled="true" \
    TemplateBucket="$TEMPLATE_BUCKET" \
  --capabilities CAPABILITY_IAM \
  --region "$REGION" --no-cli-pager; then
  
  echo "ERROR: CloudFormation deployment failed. Deployment aborted."
  exit 1
fi

# Get outputs from CloudFormation using a more verbose approach
echo "Getting stack outputs..."

# Wait for the stack to be fully deployed (sometimes there's a delay)
echo "Waiting for CloudFormation deployment to complete..."
sleep 10

# Get the nested frontend stack physical ID
echo "Finding nested frontend stack..."
FRONTEND_STACK_ID=$(aws cloudformation list-stack-resources --stack-name "$STACK_NAME" --region "$REGION" \
  --query "StackResourceSummaries[?LogicalResourceId=='FrontendStack'].PhysicalResourceId" --output text --no-cli-pager)

if [ -z "$FRONTEND_STACK_ID" ]; then
  echo "ERROR: Could not find FrontendStack resource in the main stack."
  echo "Make sure the main.json template has a nested stack resource named 'FrontendStack'."
  exit 1
fi

echo "Found Frontend Stack ID: $FRONTEND_STACK_ID"

# Get outputs from the nested frontend stack
echo "Getting outputs from the frontend stack..."
FRONTEND_OUTPUTS=$(aws cloudformation describe-stacks --stack-name "$FRONTEND_STACK_ID" --region "$REGION" --no-cli-pager)

# Extract S3 bucket name and CloudFront details from frontend stack
S3_BUCKET=$(aws cloudformation describe-stacks --stack-name "$FRONTEND_STACK_ID" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text --no-cli-pager)
  
CLOUDFRONT_ID=$(aws cloudformation describe-stacks --stack-name "$FRONTEND_STACK_ID" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text --no-cli-pager)
  
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks --stack-name "$FRONTEND_STACK_ID" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" --output text --no-cli-pager)

# Show the extracted values
echo "Extracted values from frontend stack:"
echo "  S3 Bucket: '$S3_BUCKET'"
echo "  CloudFront ID: '$CLOUDFRONT_ID'"
echo "  CloudFront Domain: '$CLOUDFRONT_DOMAIN'"

# Check if we got the bucket name
if [ -z "$S3_BUCKET" ]; then
  echo "ERROR: Could not extract S3 bucket name from frontend stack outputs."
  echo "Please verify that the frontend stack has an output named 'S3BucketName'."
  exit 1
fi

# Auth is always enabled for AWS deployments
echo "Retrieving Cognito authentication resources..."

# Get the nested auth stack physical ID
AUTH_STACK_ID=$(aws cloudformation list-stack-resources --stack-name "$STACK_NAME" --region "$REGION" \
  --query "StackResourceSummaries[?LogicalResourceId=='AuthStack'].PhysicalResourceId" --output text --no-cli-pager)

if [ -n "$AUTH_STACK_ID" ]; then
  echo "Found Auth Stack ID: $AUTH_STACK_ID"
  
  # Get outputs from the nested auth stack
  echo "Getting outputs from the auth stack..."
  
  # Extract User Pool ID, Client ID, and Domain
  USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "$AUTH_STACK_ID" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text --no-cli-pager)
    
  USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "$AUTH_STACK_ID" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text --no-cli-pager)
    
  USER_POOL_DOMAIN=$(aws cloudformation describe-stacks --stack-name "$AUTH_STACK_ID" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolDomain'].OutputValue" --output text --no-cli-pager)
  
  echo "Cognito User Pool ID: $USER_POOL_ID"
  echo "Cognito User Pool Client ID: $USER_POOL_CLIENT_ID" 
  echo "Cognito User Pool Domain: $USER_POOL_DOMAIN"
  
  # Update the config file with Cognito details
  cat > update_auth_config.js << EOF
const fs = require('fs');
let cfg = require('./${CONFIG_FILE}');

// Ensure auth section exists
if (!cfg.resources.auth) {
  cfg.resources.auth = {};
}

// Update auth resources
cfg.resources.auth.userPoolId = '${USER_POOL_ID}';
cfg.resources.auth.userPoolClientId = '${USER_POOL_CLIENT_ID}';
cfg.resources.auth.userPoolDomain = '${USER_POOL_DOMAIN}';

// Write the updated configuration back to the file
fs.writeFileSync('${CONFIG_FILE}', 
  'const projectConfig = ' + JSON.stringify(cfg, null, 2) + 
  ';\n\n// Function to detect if we\\'re running on localhost\n' +
  'function isLocalhost() {\n' +
  '  // When in Node.js during deployment\n' +
  '  if (typeof window === "undefined") {\n' +
  '    // During deployment, we\\'ll explicitly set this via environment variable\n' +
  '    return process.env.DEPLOY_TARGET === "local";\n' +
  '  }\n\n' +
  '  // When in browser\n' +
  '  if (typeof window !== "undefined") {\n' +
  '    const hostname = window.location.hostname;\n' +
  '    return hostname === "localhost" || hostname === "127.0.0.1";\n' +
  '  }\n\n' +
  '  return false;\n' +
  '}\n\n' +
  '// Dynamically determine if auth should be enabled based on environment\n' +
  'projectConfig.features = {\n' +
  '  authEnabled: !isLocalhost(), // Disabled on localhost, enabled on AWS\n' +
  '};\n\n' +
  '// In browser environments, export to window\n' +
  'if (typeof window !== "undefined") {\n' +
  '  window.projectConfig = projectConfig;\n' +
  '}\n\n' +
  '// In Node.js environments, export as module\n' +
  'if (typeof module !== "undefined" && module.exports) {\n' +
  '  module.exports = projectConfig;\n' +
  '}');

console.log('Auth configuration updated successfully.');
EOF

  # Update the config file with Cognito details
  if ! node update_auth_config.js; then
    echo "ERROR: Failed to update Cognito configuration in config file."
    rm -f update_auth_config.js
    exit 1
  else
    echo "Cognito configuration updated in project-config.js"
  fi
  
  # Clean up the temporary script
  rm -f update_auth_config.js
else
  echo "ERROR: AuthStack not found in the CloudFormation resources."
  echo "This should not happen for AWS deployments as auth is always enabled."
  echo "Verify that the AuthStack is properly referenced in main.json and the deployment succeeded."
  exit 1
fi

# Create a separate file for updating the config to avoid shell escaping issues
cat > update_config.js << EOF
const fs = require('fs');
let cfg;
try {
  cfg = require('./${CONFIG_FILE}');
} catch(e) {
  cfg = {
    application: { name: '${APP_NAME}', description: 'Minimalist TODO Application with zero dependencies' },
    aws: { templateBucket: '${TEMPLATE_BUCKET}', accountId: '${AWS_ACCOUNT_ID}' },
    resources: { 
      stack: { name: null, created: null, updated: null }, 
      frontend: { bucketName: null, cloudfrontId: null, cloudfrontDomain: null } 
    },
    deployments: []
  };
}

// Update stack info
cfg.resources.stack.name = '${STACK_NAME}';
cfg.resources.stack.updated = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")';
if (!cfg.resources.stack.created) {
  cfg.resources.stack.created = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")';
}

// Update frontend resources
cfg.resources.frontend.bucketName = '${S3_BUCKET}';
cfg.resources.frontend.cloudfrontId = '${CLOUDFRONT_ID}';
cfg.resources.frontend.cloudfrontDomain = '${CLOUDFRONT_DOMAIN}';

// Add deployment record
cfg.deployments.unshift({
  timestamp: '$(date -u +"%Y-%m-%dT%H:%M:%SZ")', 
  user: '$(whoami)', 
  success: true,
  environment: '${STAGE}' // Use stage for environment
});

// Write the updated configuration back to the file
fs.writeFileSync('${CONFIG_FILE}', 
  'const projectConfig = ' + JSON.stringify(cfg, null, 2) + 
  ';\n\n// Function to detect if we\\'re running on localhost\n' +
  'function isLocalhost() {\n' +
  '  // When in Node.js during deployment\n' +
  '  if (typeof window === "undefined") {\n' +
  '    // During deployment, we\\'ll explicitly set this via environment variable\n' +
  '    return process.env.DEPLOY_TARGET === "local";\n' +
  '  }\n\n' +
  '  // When in browser\n' +
  '  if (typeof window !== "undefined") {\n' +
  '    const hostname = window.location.hostname;\n' +
  '    return hostname === "localhost" || hostname === "127.0.0.1";\n' +
  '  }\n\n' +
  '  return false;\n' +
  '}\n\n' +
  '// Dynamically determine if auth should be enabled based on environment\n' +
  'projectConfig.features = {\n' +
  '  authEnabled: !isLocalhost(), // Disabled on localhost, enabled on AWS\n' +
  '};\n\n' +
  '// In browser environments, export to window\n' +
  'if (typeof window !== "undefined") {\n' +
  '  window.projectConfig = projectConfig;\n' +
  '}\n\n' +
  '// In Node.js environments, export as module\n' +
  'if (typeof module !== "undefined" && module.exports) {\n' +
  '  module.exports = projectConfig;\n' +
  '}');

console.log('Configuration updated successfully.');
EOF

# Update the config file
if ! node update_config.js; then
  echo "ERROR: Failed to update configuration file."
  rm -f update_config.js
  exit 1
fi

# Clean up the temporary script
rm -f update_config.js

# Upload frontend files
echo "Uploading frontend files to S3 bucket: $S3_BUCKET"
if ! aws s3 sync frontend/ "s3://$S3_BUCKET" --delete --no-cli-pager; then
  echo "ERROR: Failed to upload frontend files. Deployment is incomplete."
  exit 1
fi

echo "==============================================="
echo "Deployment complete!"
echo "Account: $ACCOUNT_ALIAS ($AWS_ACCOUNT_ID)"
echo "Stage: $STAGE"
echo "Stack Name: $STACK_NAME"
echo "Application URL: https://$CLOUDFRONT_DOMAIN"
echo "Configuration saved to: $CONFIG_FILE"
echo "Cognito User Pool ID: $USER_POOL_ID"
echo "Cognito User Pool Client ID: $USER_POOL_CLIENT_ID"
echo "Cognito User Pool Domain: $USER_POOL_DOMAIN"
echo "==============================================="