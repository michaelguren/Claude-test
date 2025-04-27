# Minimalist TODO App - Deployment Guide

This document explains how to deploy the application with or without the auth component using a single deployment script.

## Approach Overview

We've created a simplified deployment script that:

1. Works with any configuration of `main.json` (with or without auth components)
2. Automatically detects which stacks are present
3. Configures the frontend appropriately
4. Uses mock authentication when auth is not present

## Available Scripts

This project includes the following deployment scripts:

1. **deploy-simple.sh** - Recommended deployment script that handles both auth and no-auth cases
2. **deploy.sh** - Original deployment script (maintained for backward compatibility)
3. **delete-stack.sh** - Script to delete a CloudFormation stack
4. **local-server.js** - Simple Node.js server for local development
5. **verify-deployment.sh** - Script to verify deployment resources

## How to Deploy

### Step 1: Make the deployment script executable

```bash
chmod +x scripts/deploy-simple.sh
```

### Step 2: To deploy without authentication

1. Edit `main.json` to remove the AuthStack resource and related outputs
2. Run the deployment script:

```bash
./scripts/deploy-simple.sh
```

### Step 3: To deploy with authentication

1. Edit `main.json` to add back the AuthStack resource and related outputs
2. Run the same deployment script:

```bash
./scripts/deploy-simple.sh
```

## Script Features

The deployment script (`deploy-simple.sh`) includes the following improvements:

1. **Automatic template detection**:
   - Uploads all CloudFormation templates found in the backend/cloudformation directory
   - Works with any combination of nested stacks

2. **Robust output handling**:
   - Safely handles missing outputs (when auth is disabled)
   - Provides appropriate defaults

3. **Automatic auth detection**:
   - Detects whether auth stack is present
   - Creates appropriate frontend configuration
   - Uses mock authentication when auth is not present

4. **Improved nested stack handling**:
   - Searches through all nested stacks for resources
   - More robustly finds resources like the S3 bucket and CloudFront distribution

## Common Operations

### Temporarily Removing Auth

To temporarily disable authentication (for faster development):

```bash
# Edit main.json to remove AuthStack resource and related outputs
# Then deploy normally
./scripts/deploy-simple.sh
```

### Adding Auth Back

To add authentication back:

```bash
# Edit main.json to add back AuthStack resource and related outputs
# Then deploy normally
./scripts/deploy-simple.sh
```

### Specifying Parameters

You can specify various parameters to the deployment script:

```bash
# Deploy to production environment
./scripts/deploy-simple.sh -e prod

# Specify a different region
./scripts/deploy-simple.sh -r us-west-2

# Use a specific AWS profile
./scripts/deploy-simple.sh -p my-profile

# Combine multiple options
./scripts/deploy-simple.sh -e prod -r us-west-2 -p my-profile -n custom-app-name
```

## Conclusion

This simplified approach allows you to easily toggle authentication on and off by simply editing the `main.json` file, without needing different deployment scripts or processes. The same script handles both scenarios automatically.
