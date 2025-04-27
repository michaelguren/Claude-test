# Deployment Scripts

This directory contains scripts for deploying and managing the Minimalist TODO Application.

## Available Scripts

- `deploy.sh` - Deploys CloudFormation stacks and frontend files to AWS
- `delete-stack.sh` - Deletes CloudFormation stacks and associated resources
- `delete-specific-bucket.sh` - Utility to delete a specific S3 bucket
- `local-server.js` - Simple development server for local testing

## Deployment Script (`deploy.sh`)

The main deployment script follows our minimalist philosophy:

- **Zero external dependencies** - Uses only bash and Node.js
- **Configuration persistence** - Uses and updates project-config.js
- **AWS account separation** - Relies on AWS profile for environment selection
- **Idempotent execution** - Can be run multiple times with consistent results

### Usage

```bash
# Make the script executable (first time only)
chmod +x scripts/deploy.sh

# Deploy to AWS (uses default AWS profile)
./scripts/deploy.sh

# Deploy with a specific AWS profile (for different environments)
AWS_PROFILE=production ./scripts/deploy.sh
```

### What It Does

1. Creates/verifies a unique S3 bucket for CloudFormation templates
2. Uploads CloudFormation templates to the bucket
3. Deploys the main CloudFormation stack
4. Captures CloudFormation outputs in the project configuration
5. Uploads frontend files to the S3 bucket created by CloudFormation
6. Displays the application URL

## Environment Handling

Unlike traditional applications that use flags for environment selection, this project uses separate AWS accounts for each environment:

- Development environment - Uses the dev AWS account
- Staging environment - Uses the staging AWS account
- Production environment - Uses the production AWS account

To deploy to a specific environment, simply use the corresponding AWS profile:

```bash
# Deploy to development
AWS_PROFILE=dev ./scripts/deploy.sh

# Deploy to staging
AWS_PROFILE=staging ./scripts/deploy.sh

# Deploy to production
AWS_PROFILE=prod ./scripts/deploy.sh
```

## Configuration File

The deployment script maintains a `project-config.js` file in the project root that contains:

- AWS account information
- Resource identifiers (stack name, S3 bucket, CloudFront distribution)
- Deployment history

This configuration file is used by:
- Deployment scripts
- Frontend application (for environment-specific behavior)
- Documentation and reference