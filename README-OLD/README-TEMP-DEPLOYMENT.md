# Temporary Frontend-Only Deployment

This document explains the temporary frontend-only deployment approach to help with development while addressing issues with the auth stack.

## Problem

The full stack deployment with authentication was failing during CloudFormation deployment, causing the entire stack to roll back. This was delaying development and testing of the frontend components.

## Solution

We've created a temporary deployment approach that:

1. Deploys only the frontend infrastructure (S3 bucket and CloudFront distribution)
2. Uses mock authentication instead of AWS Cognito
3. Allows for faster development cycles without auth failures

## How to Deploy Frontend-Only

```bash
# Make scripts executable (first time only)
chmod +x scripts/make-executable.sh
./scripts/make-executable.sh

# Deploy frontend-only version
./scripts/deploy-no-auth.sh

# Optional: Specify environment, region, app name or AWS profile
./scripts/deploy-no-auth.sh -e dev -r us-east-1 -n minimalist-todo -p your-profile
```

## What This Deploys

- S3 bucket for static frontend files
- CloudFront distribution with HTTPS
- Mock authentication module
- Configured to work with the mock API for local development

## Limitations

- No real authentication (uses mock auth)
- No backend API functionality (uses mock API)
- Not suitable for production use

## Returning to Full Deployment

Once the auth stack issues are resolved, you can return to the full deployment:

```bash
# Deploy full stack with authentication
./scripts/deploy.sh
```

## Files Added/Modified

- `backend/cloudformation/temp/main-no-auth.json` - Simplified CloudFormation template without auth
- `frontend/js/auth-mock.js` - Mock authentication module
- `scripts/deploy-no-auth.sh` - Deployment script for frontend-only approach
- `scripts/make-executable.sh` - Helper script to make all deployment scripts executable

## Implementation Details

1. The frontend-only template removes the AuthStack resource from the main template
2. The mock authentication module always returns as authenticated
3. The deployment script uploads the mock auth module as auth.js to S3
4. Config.js is modified to use mock API and authentication

## Troubleshooting

If you encounter issues with the frontend-only deployment:

1. Check CloudFormation events in the AWS Console
2. Verify S3 bucket contents
3. Check CloudFront distribution status
4. Create a CloudFront invalidation if changes aren't visible
