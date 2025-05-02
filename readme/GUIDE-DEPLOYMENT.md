---
type: DEPLOYMENT_DOCUMENTATION
importance: HIGH
ai_guidance: "This document explains how deployment works, including configuration strategy, environment management, and infrastructure provisioning patterns."
---

# 🚀 Deployment Guide

## 🔧 Configuration Strategy

### Central Configuration Approach

This project uses a single source of truth for all configuration parameters via `project-config.js`. This approach:

- Centralizes all environment-specific parameters in one file
- Simplifies deployment scripts by providing a consistent interface
- Enables toggling between different configurations (e.g., auth modes)
- Reduces duplication and potential configuration errors

### Key Configuration Parameters

| Parameter Category | Examples                  | Purpose                              |
| ------------------ | ------------------------- | ------------------------------------ |
| Authentication     | `authEnabled`             | Toggle between Cognito and mock auth |
| AWS Resources      | `bucketName`, `stackName` | Resource naming consistency          |
| Region Settings    | `awsRegion`, `accountId`  | Deployment targeting                 |
| Environment        | `stage` (dev/prod)        | Environment-specific configurations  |
| Templates          | `templatesBucket`         | S3 location for nested templates     |

### How Deployment Scripts Use Configuration

The `deploy.sh` script reads from `project-config.js` to:

1. Determine which CloudFormation stack to deploy (auth-enabled or mock)
2. Set appropriate resource names and parameters
3. Configure environment-specific settings
4. Ensure consistent resource naming across deployments

### Adding New Features

When implementing new features:

1. Add any new configuration parameters to `project-config.js`
2. Reference these parameters in CloudFormation templates using parameters
3. Update deployment scripts to pass these parameters during deployment
4. Keep feature toggles (like `authEnabled`) in this central file

This approach ensures that the entire infrastructure remains configurable from a single location while maintaining our zero-dependency philosophy.
