---
type: PROJECT_DOCUMENTATION
scope: TODO_APPLICATION
importance: HIGH
project_specific: TRUE
references: "ARCHITECTURE.md, DEPLOYMENT.md, TESTING.md"
author: "Michael Guren (with Claude AI assistance)"
creation_date: "April 2025"
updated_date: "April 2025"
ai_guidance: "This document serves as the primary entry point for understanding the Minimalist TODO application. It provides an overview of the project, its architecture, and implementation details."
---

# Minimalist TODO Application

A prototype TODO application built with minimal dependencies and maximum longevity in mind. This project serves as a foundation for understanding our architectural pattern for building long-lasting web applications.

## Table of Contents
- [Project Overview](#project-overview)
- [Architectural Philosophy](#architectural-philosophy)
- [Project Structure](#project-structure)
- [Features](#features)
- [Technical Approach](#technical-approach)
- [Configuration System](#configuration-system)
- [Development](#development)
- [AWS Architecture](#aws-architecture)
- [Project Goals](#project-goals)
- [Authentication Strategy](#authentication-strategy)

## Project Overview

This TODO application demonstrates a minimal approach to web development:

- Zero external frontend frameworks or libraries
- Pure HTML, CSS, and vanilla JavaScript
- Custom micro-utilities instead of dependencies
- Direct AWS service integration
- Minimalist testing focusing on end-to-end functionality

## Architectural Philosophy

This project follows our Minimalist Cloud Architecture, designed for maximum longevity, maintainability, and operational simplicity. All solutions optimize for:

- **Longevity**: Target 10+ years of stable operation without rewrites
- **Minimalism**: Only the essential features and infrastructure
- **Zero External Dependencies**: No frameworks, libraries, package managers, build steps
- **AWS Native Services**: Well-established AWS managed services only

The core architectural principles include:

- **Minimal Dependencies**: Vanilla web technologies, micro-utilities over libraries
- **Cloud Integration**: AWS managed services with direct integration where possible
- **Data Persistence**: Single-table DynamoDB design optimized for access patterns
- **API Design**: API Gateway with VTL for direct DynamoDB integration
- **Authentication**: Cognito Hosted UI with mock authentication for local development

For the complete architectural philosophy, see [ARCHITECTURE.md](ARCHITECTURE.md).

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
│   └── local-server.js   # Simple development server
├── README/               # Project documentation
│   ├── README.md         # Main documentation (this file)
│   ├── ARCHITECTURE.md   # Architectural principles
│   ├── DEPLOYMENT.md     # Deployment guide
│   └── TESTING.md        # Testing approach
└── tests/                # Testing framework
    ├── e2e/              # End-to-end tests
    ├── test-utils.js     # Minimal testing utilities
    └── run-tests.js      # Test execution script
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

### Backend

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
- **Multi-account deployment** - Separate AWS accounts for DEV, STAGING, PROD
- **Central configuration** - Single project-config.js file for all settings
- **Deployment history** - Tracking of all deployments with timestamps

See [DEPLOYMENT.md](DEPLOYMENT.md) for a comprehensive deployment guide.

## Configuration System

The application uses a single, central configuration file (`project-config.js`) that serves multiple purposes:

1. **Deployment configuration** - Stores AWS resource identifiers and deployment information
2. **Environment awareness** - Maintains environment-specific settings
3. **Application configuration** - Provides runtime configuration for the application
4. **Deployment history** - Tracks when, how, and by whom the application was deployed

### Configuration File Structure

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

### Environment Handling

Unlike traditional applications that use environment variables or flags, this project:

1. Uses separate AWS accounts for different environments (DEV/STAGING/PROD)
2. Uses AWS CLI profiles to select the environment during deployment
3. Maintains appropriate configuration in each environment's configuration file

## Development

### Local Setup

1. Clone the repository
2. No build step required - open `frontend/index.html` directly in a browser
3. For API testing, run the local development server:

```bash
node scripts/local-server.js
```

### Testing

We use a minimalist testing approach focused on end-to-end testing. For details, see [TESTING.md](TESTING.md).

```bash
# Run all tests
node tests/run-tests.js

# Run end-to-end tests
node tests/run-tests.js e2e
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
