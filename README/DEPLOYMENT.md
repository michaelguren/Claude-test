---
type: DEPLOYMENT_DOCUMENTATION
scope: TODO_APPLICATION
importance: HIGH
project_specific: TRUE
references: "ARCHITECTURE.md, README.md"
author: "Michael Guren (with Claude AI assistance)"
creation_date: "April 2025"
updated_date: "April 2025"
ai_guidance: "This document provides comprehensive deployment instructions for the Minimalist TODO Application. It covers both standard and alternative deployment approaches."
---

# Deployment Guide

This document provides comprehensive instructions for deploying the Minimalist TODO Application to AWS.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Deployment Model](#deployment-model)
- [Configuration System](#configuration-system)
- [Standard Deployment](#standard-deployment)
- [Alternative Deployment Options](#alternative-deployment-options)
- [Stack Deletion](#stack-deletion)
- [Scripts Reference](#scripts-reference)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying the application, ensure you have:

- AWS CLI installed and configured
- Node.js (for configuration file management)
- Proper AWS permissions for CloudFormation, S3, and CloudFront
- Bash shell environment (Git Bash on Windows)

## Deployment Model

This project uses a multi-account deployment model:
- Each environment (DEV, STAGING, PROD) uses a separate AWS account
- AWS CLI profiles are used to select the environment
- No environment flags are needed in deployment scripts

### Multi-Account Strategy

Instead of using environment parameters, we use separate AWS accounts for:
- Development environment
- Staging environment
- Production environment

This approach provides:
- Complete isolation between environments
- Separate billing and resource limits
- Appropriate security boundaries
- Simplified deployment scripts (no environment logic)

## Configuration System

The project uses a central `project-config.js` file to store:
- AWS account information
- Resource identifiers (S3 bucket, CloudFront distribution)
- Deployment history

This file is automatically created and updated by the deployment script. Example structure:

```javascript
const projectConfig = {
  // Application metadata
  application: {
    name: "minimalist-todo",
    description: "Minimalist TODO Application with zero dependencies"
  },

  // AWS deployment settings
  aws: {
    templateBucket: "minimalist-todo-templates-123456789012-20250427",
    accountId: "123456789012"
  },

  // Resources created by CloudFormation
  resources: {
    stack: {
      name: "minimalist-todo",
      created: "2025-04-27T12:34:56Z",
      updated: "2025-04-27T12:34:56Z"
    },
    frontend: {
      bucketName: "minimalist-todo-bucket-abcdef",
      cloudfrontId: "E1A2B3C4D5E6F7",
      cloudfrontDomain: "d123abcdef.cloudfront.net"
    }
  },

  // Deployment history
  deployments: [
    { timestamp: "2025-04-27T12:34:56Z", user: "username", success: true }
  ]
};
```

## Standard Deployment

### Step 1: Make the deployment script executable

```bash
chmod +x scripts/deploy.sh
```

### Step 2: Deploy to AWS

```bash
# Deploy using default AWS profile (typically development)
./scripts/deploy.sh

# Deploy to a specific environment using AWS profiles
AWS_PROFILE=staging ./scripts/deploy.sh
AWS_PROFILE=prod ./scripts/deploy.sh
```

### Step 3: Access the Application

After deployment completes, the script will display:
- Application URL (CloudFront domain)
- Configuration file location

The application URL is also stored in the configuration file.

### What the Deployment Script Does

1. Creates/verifies a unique S3 bucket for CloudFormation templates
2. Uploads CloudFormation templates to the bucket
3. Deploys the main CloudFormation stack
4. Captures CloudFormation outputs in the project configuration
5. Uploads frontend files to the S3 bucket created by CloudFormation
6. Displays the application URL

## Alternative Deployment Options

### Deployment Without Authentication

There may be scenarios where you want to deploy without the authentication component for faster development cycles.

#### Step 1: Edit `main.json` to remove the AuthStack resource

Remove or comment out the AuthStack resource and related outputs in the main CloudFormation template.

#### Step 2: Deploy as usual

```bash
./scripts/deploy.sh
```

The deployment script automatically detects the absence of authentication resources and configures the frontend to use mock authentication.

### Template-Only Deployment

To deploy just the CloudFormation templates without uploading frontend files:

```bash
./scripts/deploy.sh --templates-only
```

### Frontend-Only Deployment

If you've already deployed the CloudFormation stack and just want to update the frontend files:

```bash
# Assuming you have a valid project-config.js file
./scripts/deploy.sh --frontend-only
```

This will skip the CloudFormation deployment and only upload the frontend files to the S3 bucket.

## Stack Deletion

When you need to remove the stack and all associated resources:

```bash
# Make deletion script executable (first time only)
chmod +x scripts/delete-stack.sh

# Delete the stack (using the stack name from project-config.js)
./scripts/delete-stack.sh

# Delete with a specific AWS profile
AWS_PROFILE=prod ./scripts/delete-stack.sh

# Force deletion (bypasses confirmation prompt)
./scripts/delete-stack.sh --force
```

### What the Stack Deletion Script Does

1. Identifies and empties all S3 buckets associated with the stack
2. Deletes the CloudFormation stack
3. Optionally removes the deployment record from project-config.js

## Scripts Reference

### deploy.sh

The main deployment script for the application.

#### Usage:

```bash
./scripts/deploy.sh [options]
```

#### Options:

- `--templates-only`: Only deploy CloudFormation templates, skip frontend upload
- `--frontend-only`: Only upload frontend files, skip CloudFormation deployment
- `--no-config-update`: Don't update the project-config.js file
- `--force`: Skip all confirmation prompts

### delete-stack.sh

Script to delete CloudFormation stacks and associated resources.

#### Usage:

```bash
./scripts/delete-stack.sh [options]
```

#### Options:

- `-s, --stack <name>`: Specify stack name (defaults to value in project-config.js)
- `-f, --force`: Force deletion without confirmation
- `-k, --keep-bucket`: Don't empty buckets before deleting

### delete-specific-bucket.sh

Utility script to delete a specific S3 bucket, even if it's not empty.

#### Usage:

```bash
./scripts/delete-specific-bucket.sh <bucket-name>
```

### local-server.js

Simple Node.js server for local development.

#### Usage:

```bash
node scripts/local-server.js [port]
```

Default port is 3000 if not specified.

## Troubleshooting

### CloudFormation Stack Fails to Create/Update

- Check CloudFormation events in the AWS Console
- Common issues:
  - S3 bucket name conflicts
  - Permissions issues
  - Parameter mismatches

### Frontend Files Not Appearing

- Verify S3 bucket contents
- Check CloudFront distribution is deployed
- Create a CloudFront invalidation: 
  ```bash
  aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
  ```

### Configuration File Issues

- If `project-config.js` becomes corrupted, simply delete it and re-run the deployment
- The script will create a new configuration file with proper values

### Common Error: "Stack already exists"

If you get an error saying the stack already exists but you can't see it in the console:

```bash
# First try with the --force option
./scripts/delete-stack.sh --force

# If that doesn't work, use the AWS CLI to list stacks including deleted ones
aws cloudformation list-stacks --stack-status-filter DELETE_FAILED DELETE_COMPLETE

# Then delete the specific stack
aws cloudformation delete-stack --stack-name <stack-name>
```

### CloudFront Not Updating After Deployment

CloudFront caches content, so changes might not be immediately visible. Create an invalidation:

```bash
# Get the distribution ID from project-config.js
DIST_ID=$(node -e "console.log(require('./project-config.js').resources.frontend.cloudfrontId || '')")

# Create invalidation
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

### S3 Bucket Cannot Be Deleted

This usually happens when the bucket isn't empty. Use the delete-specific-bucket.sh script:

```bash
./scripts/delete-specific-bucket.sh your-bucket-name
```
