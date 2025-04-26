---
type: PROJECT_DOCUMENTATION
scope: TODO_APPLICATION
importance: MEDIUM
project_specific: TRUE
references: "README-ARCHITECTURE.md"
author: "Michael Guren (with Claude AI assistance)"
creation_date: "April 2025"
updated_date: "April 2025"
ai_guidance: "This document contains project-specific implementation details for the TODO application. For strategic architectural principles that apply across all projects, refer to README-ARCHITECTURE.md."
---

# Minimalist TODO Application

A prototype TODO application built with minimal dependencies and maximum longevity in mind. This project serves as a foundation for understanding our architectural pattern for building long-lasting web applications.

## Overview

This TODO application demonstrates a minimal approach to web development:

- Zero external frontend frameworks or libraries
- Pure HTML, CSS, and vanilla JavaScript
- Custom micro-utilities instead of dependencies
- Direct AWS service integration
- Minimalist testing focusing on end-to-end functionality

## Project Structure

```
/
├── frontend/
│   ├── index.html        # Main HTML file
│   ├── css/
│   │   └── style.css     # Main stylesheet
│   ├── js/
│   │   ├── app.js        # Main application logic
│   │   ├── htmx-lite.js  # Custom AJAX utility
│   │   ├── mock-api.js   # Mock API for development
│   │   └── config.js     # Environment configuration
│   └── assets/           # Static assets
├── backend/
│   ├── cloudformation/   # CloudFormation templates (JSON format)
│   │   ├── main.json     # Main stack template
│   │   ├── frontend.json # Frontend infrastructure (S3, CloudFront)
│   │   ├── data.json     # DynamoDB resources (coming soon)
│   │   └── api.json      # API Gateway resources (coming soon)
│   └── api/
│       └── mappings/     # VTL templates for API Gateway
├── scripts/              # Deployment scripts
│   ├── deploy.sh         # Main deployment script
│   ├── delete-stack.sh   # Stack deletion script
│   ├── verify-deployment.js # Deployment verification
│   └── local-server.js   # Simple development server
└── tests/                # Testing framework
    ├── e2e/              # End-to-end tests
    ├── test-utils.js     # Minimal testing utilities
    ├── run-tests.js      # Test execution script
    └── TESTING.md        # Testing documentation
```

## Features

- Create, read, update, and delete TODO items
- Filter by status (all, active, completed)
- Persistent storage (localStorage during development, DynamoDB in production)
- Responsive design for all device sizes
- Clean, intuitive user interface

## Technical Approach

### Frontend

- **HTML5** semantic markup with progressive enhancement
- **CSS3** for styling without preprocessors
- **Vanilla JavaScript** with no external dependencies
- **htmx-lite**: A custom 100-line AJAX utility for user interactivity and reactivity
  - Provides AJAX capabilities for seamless user experiences
  - Handles DOM updates without page reloads
  - Manages UI states (loading, success, error)
  - Similar functionality to HTMX but with zero dependencies and minimal code

### Infrastructure as Code

- **CloudFormation (JSON)** for infrastructure as code
  - Main stack template orchestrates all resources
  - Component templates for modular deployment:
    - Frontend template (S3 + CloudFront)
    - Data template (DynamoDB - coming soon)
    - API template (API Gateway - coming soon)
  - Outputs and exports for cross-stack references

### Backend (In Progress)

- **S3** for static website hosting
- **CloudFront** for content delivery and HTTPS
- **API Gateway** with VTL templates for direct DynamoDB integration (coming soon)
- **DynamoDB** for data persistence with single-table design (coming soon)
- **DynamoDB Streams** for asynchronous processing (planned)

### Deployment

Our approach to deployment follows the same minimalist philosophy:

- **CloudFormation** for declarative infrastructure
- **Bash scripts** for automation
- **S3 bucket** for CloudFormation template storage
- **Multi-environment support** (dev/prod)
- **Multi-account support** for strict environment separation

## Development

### Local Setup

1. Clone the repository
2. No build step required - open `frontend/index.html` directly in a browser
3. For API testing, run the local development server:

```bash
node scripts/local-server.js
```

### Testing

We use a minimalist testing approach focused on end-to-end testing:

```bash
# Run all tests
node tests/run-tests.js

# Run end-to-end tests
node tests/run-tests.js e2e
```

See [TESTING.md](TESTING.md) for detailed testing documentation.

## Deployment

### Initial Deployment

Deploy to AWS with:

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Deploy to dev environment (default)
./scripts/deploy.sh

# Deploy to production
./scripts/deploy.sh -e prod

# For multi-account setup
AWS_PROFILE=prod ./scripts/deploy.sh -e prod
```

### Stack Deletion

To delete a stack (including non-empty S3 buckets):

```bash
# Make deletion script executable
chmod +x scripts/delete-stack.sh

# Delete the dev stack
./scripts/delete-stack.sh --stack minimalist-todo-dev

# Delete the prod stack with a specific AWS profile
./scripts/delete-stack.sh --stack minimalist-todo-prod --profile prod
```

### Deployment Verification

Verify deployment with:

```bash
node scripts/verify-deployment.js <stack-name> <region>
```

## AWS Architecture

When deployed, the application uses:

- **S3** for static website hosting

  - Private bucket with website configuration
  - Versioning enabled for content management
  - Secured via bucket policy (no public access)

- **CloudFront** for content delivery

  - Global CDN with low latency
  - HTTPS by default
  - Custom error responses for SPA routing
  - Origin Access Control for S3 security

- **DynamoDB** for persistent storage (coming soon)

  - Single-table design for TODO items
  - On-demand capacity for cost optimization

- **API Gateway** for API endpoints (coming soon)
  - REST API with VTL templates
  - Direct DynamoDB integration
  - Minimal Lambda usage

## Project Goals

This TODO application serves as:

1. A proof of concept for our minimalist architecture
2. A template for larger, more complex applications
3. A demonstration of zero-dependency development
4. A foundation for understanding AWS serverless architecture

By proving these concepts with a simple TODO app, we establish patterns that can be applied to larger applications.

## Authentication Strategy

Our application follows a dual authentication approach based on the environment:

### Local Development

- When running on localhost, clicking "SIGN IN" will always use mock authentication
- No actual Cognito authentication flow is triggered in local development
- User is automatically signed in with a mock identity
- Perfect for UI testing without needing to test actual authentication flows

### AWS Hosted Environments

- When accessing the app from any AWS hosted environment (S3+CloudFront), Cognito authentication is always used
- Supports multiple AWS accounts for different environments (DEV, STAGING, PROD)
- Environment-specific Cognito User Pools and Client IDs are configured at deployment time
- Frontend automatically detects current environment based on URL and uses appropriate authentication settings

---

See [README-ARCHITECTURE.md](README-ARCHITECTURE.md) for our broader architectural principles and decisions that apply across projects.
