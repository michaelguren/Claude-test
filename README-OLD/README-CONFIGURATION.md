# Configuration System

This document explains the configuration approach used in the Minimalist TODO Application.

## Overview

The application uses a single, central configuration file (`project-config.js`) that serves multiple purposes:

1. **Deployment configuration** - Stores AWS resource identifiers and deployment information
2. **Environment awareness** - Maintains environment-specific settings
3. **Application configuration** - Provides runtime configuration for the application
4. **Deployment history** - Tracks when, how, and by whom the application was deployed

## Configuration File Structure

The `project-config.js` file is structured as follows:

```javascript
const projectConfig = {
  // Application metadata
  application: {
    name: "minimalist-todo",
    description: "Minimalist TODO Application with zero dependencies"
  },

  // AWS deployment settings
  aws: {
    // Region is determined by AWS CLI default profile
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

## How It Works

### Creation & Updates

The configuration file is:

1. Created automatically by the deployment script (`deploy.sh`) if it doesn't exist
2. Updated during deployment with the latest resource identifiers and deployment history
3. Used to determine if resources already exist or need to be created

### Usage in the Application

The configuration file works in both Node.js and browser environments:

```javascript
// In Node.js
const config = require('./project-config.js');
console.log(config.resources.frontend.bucketName);

// In browser
console.log(window.projectConfig.resources.frontend.cloudfrontDomain);
```

### Environment Handling

Unlike traditional applications that use environment variables or flags, this project:

1. Uses separate AWS accounts for different environments (DEV/STAGING/PROD)
2. Uses AWS CLI profiles to select the environment during deployment
3. Maintains appropriate configuration in each environment's configuration file

## Modifications

If you need to manually modify the configuration file:

1. Edit the `project-config.js` file directly
2. Maintain the existing structure
3. Ensure it's valid JavaScript that works in both Node.js and browser environments

## Deployment History

The configuration file maintains a history of deployments, useful for:

1. Auditing changes
2. Tracking when resources were created or updated
3. Identifying who performed deployments

## Best Practices

- Don't delete the configuration file unless necessary
- Use the deployment script to make changes when possible
- Keep the configuration file in version control
- Review the configuration file after deployments to verify changes