# Minimalist TODO App - Deployment Guide

This document provides a quick reference for deploying the Minimalist TODO Application.

## Prerequisites

- AWS CLI installed and configured
- Node.js (for configuration file management)
- Proper AWS permissions for CloudFormation, S3, and CloudFront

## Deployment Model

This project uses a multi-account deployment model:
- Each environment (DEV, STAGING, PROD) uses a separate AWS account
- AWS CLI profiles are used to select the environment

## Configuration File

The project uses a central `project-config.js` file to store:
- AWS account information
- Resource identifiers
- Deployment history

This file is automatically created and updated by the deployment script.

## Deployment Steps

1. **Deploy to AWS**

   ```bash
   # Make deployment script executable (first time only)
   chmod +x scripts/deploy.sh

   # Deploy using default AWS profile (typically development)
   ./scripts/deploy.sh

   # Deploy to a specific environment using AWS profiles
   AWS_PROFILE=staging ./scripts/deploy.sh
   AWS_PROFILE=prod ./scripts/deploy.sh
   ```

2. **Access the Application**

   After deployment completes, the script will display:
   - Application URL (CloudFront domain)
   - Configuration file location
   
   The application URL is also stored in the configuration file.

## Stack Deletion

When you need to remove the stack:

```bash
# Make deletion script executable (first time only)
chmod +x scripts/delete-stack.sh

# Delete the stack (using the stack name from project-config.js)
./scripts/delete-stack.sh

# Delete a specific stack
./scripts/delete-stack.sh -s minimalist-todo

# Delete with a specific AWS profile
AWS_PROFILE=prod ./scripts/delete-stack.sh
```

## Troubleshooting

1. **CloudFormation Stack Fails to Create/Update**
   - Check CloudFormation events in the AWS Console
   - Common issues:
     - S3 bucket name conflicts
     - Permissions issues
     - Parameter mismatches

2. **Frontend Files Not Appearing**
   - Verify S3 bucket contents
   - Check CloudFront distribution is deployed
   - Create an invalidation: `aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"`

3. **Configuration File Issues**
   - If `project-config.js` becomes corrupted, simply delete it and re-run the deployment
   - The script will create a new configuration file with proper values

## Architecture Notes

This application follows our minimalist principles:
- No external dependencies
- Vanilla JS frontend
- CloudFormation infrastructure
- S3 and CloudFront for frontend hosting
- Single central configuration file

The deployment approach is designed for maximum simplicity and longevity:
- No environment flags (uses AWS accounts)
- No complex build pipelines
- Reliable configuration persistence
- Deployment history tracking