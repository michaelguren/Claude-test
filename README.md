# Minimalist TODO App Scaffold

This repository contains a **minimal, reusable scaffolding** for web applications. It is designed to last over a decade with minimal ongoing maintenance, prioritizing simplicity and developer velocity over architectural complexity.

---

## 🧠 Project Purpose

This project serves as a boilerplate for building scalable, secure, and highly maintainable web applications using:

- **AWS serverless infrastructure** (HTTP API + Lambda + DynamoDB)
- **Pure frontend code (Vanilla JS/HTML/CSS)**
- **Zero external dependencies or SDKs**
- **Simple, predictable patterns**

It is intended as a starting point for future apps, prioritizing long-term durability and development speed over architectural purity.

---

## ⚙️ Architectural Principles

1. **Zero runtime dependencies**: No frameworks, SDKs, or bundlers.
2. **Consolidated SAM templates**: Single template for all backend resources with shared HTTP API.
3. **Lambda per resource**: One Lambda function handles all operations for each business resource (auth, users, todos, etc.).
4. **HTTP API Gateway**: Modern, cost-effective API Gateway v2.0 with JWT authorization capability.
5. **Strict data isolation**: Each user's data is isolated at every layer.
6. **Frontend purity**: Vanilla JS with custom micro-utilities for interactivity.
7. **Simple CRUD patterns**: Standard HTTP endpoints with JSON request/response.
8. **Development velocity**: SAM's sync mode and local testing for rapid iteration.

---

## 🏗️ Infrastructure Architecture

### Consolidated SAM Template Approach

This project uses a **single SAM template** (`infra/template.json`) that defines all core infrastructure:

- **Shared HTTP API Gateway** - Single API endpoint for all domains
- **Domain-based Lambda functions** - One function per business resource (auth, users, todos, etc.)
- **Single DynamoDB table** - Multi-tenant design with proper access patterns
- **Frontend infrastructure** - Nested CloudFormation stack for S3/CloudFront

### Why Consolidated Templates?

We moved away from nested SAM applications because:

- **HTTP API sharing complexity** - Nested templates couldn't properly reference shared HTTP APIs
- **Simpler deployment** - Single `sam deploy` command for all backend resources
- **Better resource relationships** - Direct references instead of complex imports/exports
- **Easier debugging** - All infrastructure in one place
- **Reduced CloudFormation complexity** - Fewer stacks to manage and monitor

### Template Structure

```
infra/
├── template.json              # Main SAM template (all backend resources)
├── domains/                   # Business domain Lambda functions
│   ├── utils-shared/         # Shared utilities across domains
│   ├── auth/                 # Authentication domain
│   ├── users/                # User management domain
│   └── todos/                # TODO management domain
└── stacks/
    └── frontend/             # Frontend-only nested stack
        └── frontend.json     # S3, CloudFront, monitoring
```

---

## 🚀 Serverless-First Strategy

This scaffold embraces **serverless-first architecture** with a focus on simplicity and cost-effectiveness:

### Strategic Decisions:

- **Lambda over containers** - No server management, automatic scaling
- **HTTP API over REST API** - 50% cost savings, simpler integration
- **JWT authorization** - Built-in HTTP API auth capability (configurable)
- **One Lambda per resource** - Shared logic, better cold start management
- **DynamoDB single-table design** - Optimized for serverless access patterns
- **Consolidated SAM templates** - Single backend stack for easier management

### Target Scale & Economics:

- **Supports 500,000+ daily active users** cost-effectively
- **~$120/month at 10 requests/second** vs $850+ with complex orchestration
- **Perfect for MVP through significant scale** - simple to understand and maintain

### Core Architecture Pattern:

```
Frontend (Vanilla JS/CSS/HTML)
    ↓
HTTP API Gateway (with optional JWT Auth)
    ↓
Lambda Functions (one per resource)
    ↓
DynamoDB (single table design)
```

---

## 📁 Project Structure

```
minimalist-todo/
├── frontend/                    # Static web assets (vanilla JS/HTML/CSS)
│   ├── index.html
│   ├── callback.html           # Auth callback handler
│   ├── css/style.css
│   └── js/
│       ├── auth.js             # Authentication logic
│       ├── api.js              # API client
│       ├── app.js              # Main application logic
│       └── htmx-lite.js        # Minimal AJAX utility
├── infra/                       # Infrastructure as Code
│   ├── template.json           # Main SAM template (all backend resources)
│   ├── samconfig.toml          # SAM deployment configuration
│   ├── domains/                # Business domain Lambda functions
│   │   ├── utils-shared/       # Shared utilities across domains
│   │   │   ├── dynamodb.js     # DynamoDB operations
│   │   │   ├── helpers.js      # Common utilities
│   │   │   ├── cors.js         # CORS handling
│   │   │   └── logger.js       # Centralized logging
│   │   ├── auth/               # Authentication domain
│   │   │   └── src/
│   │   │       ├── index.js    # Lambda handler entry point
│   │   │       ├── controller.js # HTTP request handling
│   │   │       ├── service.js    # Business logic
│   │   │       ├── repository.js # Data access layer
│   │   │       └── utils/        # Domain-specific utilities
│   │   ├── users/              # User management domain
│   │   └── todos/              # TODO management domain
│   └── stacks/
│       └── frontend/          # Frontend infrastructure (S3/CloudFront)
│           └── frontend.json
├── scripts/                   # Deployment and utility scripts
│   ├── deploy-frontend.sh          # Frontend deployment
│   ├── test-auth.sh                # Auth flow testing
│   ├── verify-auth.sh              # Manual auth verification
│   ├── test-todos.sh               # TODO operations testing
│   └── local-server.js             # Local development server
├── zpatterns/                 # Reference patterns and documentation
│   ├── dynamodb.md            # Single-table design patterns
│   ├── http-api.txt           # HTTP API examples
│   ├── secrets.txt            # Secrets management examples
│   └── step-functions.txt     # Step Functions examples
└── Makefile                   # Deployment commands
```

### Key Changes from Nested Approach

- **Single `template.json`** instead of multiple nested SAM templates
- **Direct HTTP API references** in Lambda function events
- **Domain organization** in filesystem, not CloudFormation structure
- **Simplified deployment** with single stack

---

## 🚀 Deployment Architecture

### Single-Stack Deployment

All backend infrastructure deploys as a single CloudFormation stack:

```bash
# Deploy everything (backend + frontend)
make deploy ENV=dev

# Backend only
make deploy-backend ENV=dev

# Frontend only
make deploy-frontend ENV=dev

# Development mode with auto-sync
make sync-backend ENV=dev
```

### Stack Organization

- **Main Stack**: Named per configuration (e.g., `minimalist-todo-20250528`)

  - HTTP API Gateway
  - All Lambda functions
  - DynamoDB table
  - Nested frontend stack

- **Frontend Nested Stack**: `{MainStack}-FrontendStack-*`
  - S3 bucket for static assets
  - CloudFront distribution (production only)
  - Monitoring alarms

### Environment Isolation

Each environment uses distinct AWS profiles for complete isolation:

- `dev` profile → Development stack
- `prod` profile → Production stack

No shared resources between environments.

---

## 🔧 Auth Architecture Overview

This scaffold uses a simple, secure email/password authentication system:

- **Email verification** with OTP codes for signup
- **JWT tokens** generated server-side for stateless authentication
- **DynamoDB** stores user records and verification codes
- **AWS SES** for sending verification emails
- **AWS Systems Manager** for JWT secret storage

**Key Benefits:**

- **Simple email/password flow** - No external providers required
- **Stateless design** - No session management complexity
- **Role-based access** - Admin vs user permissions built-in
- **AWS-native** - Uses SES, SSM, and DynamoDB
- **Extensible** - Easy to add OAuth providers later

---

## 🔄 Lambda Function Pattern

All Lambda functions follow a consistent resource-based pattern:

```javascript
// domains/auth/index.js - Handles all auth operations
const { withCors } = require("./src/utils-shared/cors");

const authHandler = async (event) => {
  // Route based on event.routeKey (HTTP API v2.0 format)
  if (event.routeKey === "POST /auth/signup") {
    return await signupHandler(event);
  }
  if (event.routeKey === "POST /auth/verify-signup") {
    return await verifySignupHandler(event);
  }
  if (event.routeKey === "POST /auth/login") {
    return await loginHandler(event);
  }
  // ... other routes
};

exports.handler = withCors(authHandler);
```

This pattern provides:

- **Consistent error handling** across all endpoints
- **CORS handling** via shared utilities
- **Better cold start performance**
- **Easier testing and debugging**
- **Clear separation of concerns** (controller → service → repository)

---

## 🗄️ DynamoDB Single-Table Design

The application uses a single DynamoDB table with the following patterns:

### Auth Domain Pattern

**User entities:**

- PK: `USER#<ulid>`
- SK: `PROFILE`
- GSI1PK: `EMAIL#<email>` (for email lookups)

**Verification codes:**

- PK: `USER#<email>` (during signup process)
- SK: `VERIFICATION#<ulid>`
- TTL: Numeric timestamp for auto-expiration

### TODO Domain Pattern

**TODO entities:**

- PK: `USER#<user_ulid>`
- SK: `TODO#<todo_ulid>`

### Access Patterns:

- **Get user by ID**: Query PK=`USER#{ulid}`, SK=`PROFILE`
- **Get user by email**: Query GSI1 where GSI1PK=`EMAIL#{email}`
- **List user's TODOs**: Query PK=`USER#{ulid}`, SK begins_with `TODO#`
- **Get verification code**: Query PK=`USER#{email}`, SK begins_with `VERIFICATION#`

---

## 🔐 Secrets Management

Configuration and secrets are handled using AWS-native services:

- **AWS Systems Manager Parameter Store** for application configuration (JWT secrets)
- **Environment variables** populated from these services via SAM templates
- **No hardcoded secrets** in code or templates

Example setup:

```bash
# One-time JWT secret setup per environment
aws ssm put-parameter \
  --name "/minimalist-todo/jwt-secret" \
  --value "$(openssl rand -base64 32)" \
  --type "SecureString" \
  --profile dev
```

---

## 🛠️ Development Workflow

### Local Development

```bash
# Start local frontend server
node scripts/local-server.js 8080 frontend
```

### Backend Development

```bash
# Sync shared utilities before building
make sync-utils-shared

# Build and deploy
make deploy-backend ENV=dev

# Sync changes to AWS (dev environment)
make sync-backend ENV=dev
```

### Testing

```bash
# Test auth flow
./scripts/test-auth.sh

# Complete email verification manually
./scripts/verify-auth.sh

# Test TODO operations
./scripts/test-todos.sh
```

### Deployment

```bash
# First time deployment (guided)
make deploy-backend-guided ENV=dev

# Regular deployment
make deploy ENV=dev

# Frontend only
make deploy-frontend ENV=dev
```

---

## 💡 Customization & Iteration

This template is intentionally minimal. Additions should:

- Follow the **one Lambda per resource** pattern
- Use **HTTP API Gateway** for all new endpoints
- Maintain **simple CRUD operations**
- Use **event.routeKey** for routing (HTTP API v2.0 format)
- Keep shared utilities in `domains/utils-shared/`
- Document clearly for future developers

### Adding New Resources

1. Create new domain folder: `infra/domains/newresource/src/`
2. Implement resource-based Lambda function following existing patterns
3. Add function and events to main `template.json`
4. Sync shared utilities: `make sync-utils-shared`
5. Update frontend to consume new endpoints

---

## ✅ Cost Estimates

**Monthly costs at 10 requests/second (~26M requests/month):**

- HTTP API Gateway: ~$50
- Lambda Functions: ~$30
- DynamoDB: ~$40
- SES (email): ~$5
- **Total: ~$125/month**

This scales cost-effectively to 500k+ daily active users before requiring architectural changes.

---

## ✅ Status

> **Fully Functional** - Complete scaffolding with auth, users, and todos implemented. Ready for customization and extension.

**Currently Implemented:**

- ✅ HTTP API + Lambda + DynamoDB foundation
- ✅ Consolidated SAM template architecture
- ✅ Email/password authentication with JWT
- ✅ User management domain
- ✅ TODO management domain
- ✅ Frontend with real authentication integration
- ✅ Deployment automation and testing scripts

**Ready for Extension:**

- Additional business resources following established patterns
- Production authentication hardening
- Enhanced frontend features
- Custom domain setup
- Monitoring and alerting

---

## 📚 Architecture Decision Records

### ADR-001: Consolidated SAM Templates

**Decision**: Consolidate all Lambda functions into single SAM template with shared HTTP API.

**Rationale**: Simplified HTTP API sharing, single deployment, direct resource references.

### ADR-002: Resource-Based Lambda Functions

**Decision**: One Lambda function per business resource (not per HTTP endpoint).

**Rationale**: Shared connections, better cold starts, simpler deployment, easier testing.

### ADR-003: Single DynamoDB Table

**Decision**: All entities in one table with composite keys and GSIs.

**Rationale**: Cost optimization, simplified access patterns, better performance for serverless.

### ADR-004: Email/Password Authentication

**Decision**: Build simple email/password auth instead of using Cognito.

**Rationale**: Simpler integration, lower cost, full control over user experience, easier testing.

---

**Remember: Simplicity beats cleverness. Shipping beats perfection. AWS-native beats custom solutions.**
