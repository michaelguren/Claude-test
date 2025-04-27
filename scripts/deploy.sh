#!/bin/bash
# Minimalist TODO App - Deployment Script
# Deploys CloudFormation templates and uploads frontend files
# Uses a single AWS account per environment approach

# Ensure we're in the project root directory
cd "$(dirname "$0")/.."

CONFIG_FILE="project-config.js"

# Default environment is dev
ENVIRONMENT="dev"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    *)
      # Skip unknown options
      shift
      ;;
  esac
done

# Verify environment is valid
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "ERROR: Environment must be 'dev' or 'prod'. Got: $ENVIRONMENT"
  echo "Usage: $0 [-e|--environment <dev|prod>]"
  exit 1
fi

# Verify AWS credentials are valid before proceeding
echo "Verifying AWS credentials..."
if ! AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text 2>/dev/null); then
  echo "ERROR: AWS credentials are invalid or expired."
  echo "Please log in using 'aws sso login' or set valid AWS credentials."
  exit 1
fi

# Now that we've verified credentials, get the region
REGION=$(aws configure get region)
APP_NAME="minimalist-todo"
STACK_NAME="${APP_NAME}-${ENVIRONMENT}"
TIMESTAMP=$(date +%Y%m%d)

echo "AWS credentials verified. Using Account ID: $AWS_ACCOUNT_ID"
echo "Using Region: $REGION"
echo "Environment: $ENVIRONMENT"
echo "Stack Name: $STACK_NAME"

# Only create a template bucket if needed
if [ -f "$CONFIG_FILE" ] && grep -q "templateBucket" "$CONFIG_FILE" && grep -q -v "templateBucket: null" "$CONFIG_FILE"; then
  # Extract bucket name using node
  TEMPLATE_BUCKET=$(node -e "const cfg = require('./$CONFIG_FILE'); console.log(cfg.aws.templateBucket || '')")
  
  # Verify bucket exists
  if ! aws s3api head-bucket --bucket "$TEMPLATE_BUCKET" 2>/dev/null; then
    echo "Template bucket no longer exists. Creating a new one."
    TEMPLATE_BUCKET="${APP_NAME}-templates-${AWS_ACCOUNT_ID}-${TIMESTAMP}"
    echo "Creating bucket: $TEMPLATE_BUCKET"
    
    if ! aws s3 mb "s3://$TEMPLATE_BUCKET" --region "$REGION"; then
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
  
  if ! aws s3 mb "s3://$TEMPLATE_BUCKET" --region "$REGION"; then
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
if ! aws s3 cp backend/cloudformation/frontend.json "s3://$TEMPLATE_BUCKET/"; then
  echo "ERROR: Failed to upload CloudFormation templates. Deployment aborted."
  exit 1
fi

if ! aws s3 cp backend/cloudformation/main.json "s3://$TEMPLATE_BUCKET/"; then
  echo "ERROR: Failed to upload CloudFormation templates. Deployment aborted."
  exit 1
fi

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack..."
if ! aws cloudformation deploy \
  --template-file "backend/cloudformation/main.json" \
  --stack-name "$STACK_NAME" \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
    AppName="$APP_NAME" \
    S3Bucket="$TEMPLATE_BUCKET" \
  --capabilities CAPABILITY_IAM \
  --region "$REGION"; then
  
  echo "ERROR: CloudFormation deployment failed. Deployment aborted."
  exit 1
fi

# Get outputs from CloudFormation
echo "Getting stack outputs..."
if ! CF_OUTPUTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query "Stacks[0].Outputs" --output json); then
  echo "ERROR: Failed to get CloudFormation outputs. Frontend deployment may be incomplete."
  exit 1
fi

# Update config file with outputs
node -e "
  const fs = require('fs');
  const cfg = require('./$CONFIG_FILE');
  const outputs = JSON.parse('$CF_OUTPUTS');
  
  // Update stack info
  cfg.resources.stack.name = '$STACK_NAME';
  cfg.resources.stack.updated = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")';
  if (!cfg.resources.stack.created) {
    cfg.resources.stack.created = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")';
  }
  
  // Update frontend resources
  outputs.forEach(output => {
    if (output.OutputKey === 'S3BucketName') {
      cfg.resources.frontend.bucketName = output.OutputValue;
    } else if (output.OutputKey === 'CloudFrontDistributionId') {
      cfg.resources.frontend.cloudfrontId = output.OutputValue;
    } else if (output.OutputKey === 'CloudFrontDomainName') {
      cfg.resources.frontend.cloudfrontDomain = output.OutputValue;
    }
  });
  
  // Add deployment record
  cfg.deployments.unshift({
    timestamp: '$(date -u +"%Y-%m-%dT%H:%M:%SZ")', 
    user: '$(whoami)', 
    success: true,
    environment: '$ENVIRONMENT'
  });
  
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

# Extract S3 bucket name directly for deployment
S3_BUCKET=$(node -e "const cfg = require('./$CONFIG_FILE'); console.log(cfg.resources.frontend.bucketName);")

if [ -z "$S3_BUCKET" ]; then
  echo "ERROR: Could not determine frontend S3 bucket name. Frontend deployment aborted."
  exit 1
fi

APP_URL=$(node -e "const cfg = require('./$CONFIG_FILE'); console.log('https://' + cfg.resources.frontend.cloudfrontDomain);")

# Upload frontend files
echo "Uploading frontend files to S3 bucket: $S3_BUCKET"
if ! aws s3 sync frontend/ "s3://$S3_BUCKET" --delete; then
  echo "ERROR: Failed to upload frontend files. Deployment is incomplete."
  exit 1
fi

echo "==============================================="
echo "Deployment complete!"
echo "Environment: $ENVIRONMENT"
echo "Stack Name: $STACK_NAME"
echo "Application URL: $APP_URL"
echo "Configuration saved to: $CONFIG_FILE"
echo "==============================================="
