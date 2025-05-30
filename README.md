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
3. **Lambda per resource**: One Lambda function handles all operations for each business resource (users, todos, etc.).
4. **HTTP API Gateway**: Modern, cost-effective API Gateway with built-in JWT authorization.
5. **Strict data isolation**: Each user's data is isolated at every layer.
6. **Frontend purity**: Vanilla JS with custom micro-utilities for interactivity.
7. **Simple CRUD patterns**: Standard HTTP endpoints with JSON request/response.
8. **Development velocity**: SAM's sync mode and local testing for rapid iteration.

---

## 🏗️ Infrastructure Architecture

### Consolidated SAM Template Approach

This project uses a **single SAM template** (`infra/template.json`) that defines all core infrastructure:

- **Shared HTTP API Gateway** - Single API endpoint for all domains
- **Domain-based Lambda functions** - One function per business resource (users, todos, etc.)
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
│   ├── shared/               # Shared utilities across domains
│   └── users/                # User management domain
│       └── src/              # Lambda function code
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
- **JWT authorization** - Built-in HTTP API auth, no custom logic needed
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
Custom Domain → HTTP API Gateway (JWT Auth)
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
│       ├── config.js           # Environment configuration
│       ├── auth.js             # Authentication logic
│       ├── api.js              # API client
│       ├── app.js              # Main application logic
│       └── mock-api.js         # Local development mock
├── infra/                       # Infrastructure as Code
│   ├── template.json           # Main SAM template (all backend resources)
│   ├── samconfig.toml          # SAM deployment configuration
│   ├── domains/                # Business domain Lambda functions
│   │   ├── shared/            # Shared utilities across domains
│   │   │   ├── dynamodb.js    # DynamoDB operations
│   │   │   ├── helpers.js     # Common utilities
│   │   │   ├── responses.js   # Standard HTTP responses
│   │   │   └── validation.js  # Input validation
│   │   └── users/             # User management domain
│   │       └── src/
│   │           ├── index.js   # Lambda handler entry point
│   │           ├── controller.js # HTTP request handling
│   │           ├── service.js    # Business logic
│   │           ├── repository.js # Data access layer
│   │           └── validation.js # Domain-specific validation
│   └── stacks/
│       └── frontend/          # Frontend infrastructure (S3/CloudFront)
│           └── frontend.json
├── scripts/                   # Deployment and utility scripts
│   ├── create-first-admin-user.sh  # Bootstrap admin user
│   ├── deploy-frontend.sh          # Frontend deployment
│   └── local-server.js             # Local development server
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

- **Main Stack**: `minimalist-todo-20250526`

  - HTTP API Gateway
  - All Lambda functions
  - DynamoDB table
  - Nested frontend stack

- **Frontend Nested Stack**: `minimalist-todo-20250526-FrontendStack-*`
  - S3 bucket for static assets
  - CloudFront distribution (prod only)
  - Monitoring alarms

### Environment Isolation

Each environment uses distinct AWS profiles for complete isolation:

- `dev` profile → Development stack
- `prod` profile → Production stack

No shared resources between environments.

---

## 🔧 Auth Architecture Overview

This scaffold uses a simple, secure authentication system:

- **HTTP API Gateway** with built-in JWT authorizers
- **Amazon Cognito User Pools** for user management (production)
- **Mock authentication** for local development
- **JSON Web Tokens (JWT)** for stateless authentication
- **DynamoDB** stores user records with role-based access
- **Lambda functions** handle auth operations (login, register, refresh)

**Key Benefits:**

- **Built-in authorization** - HTTP API handles JWT validation
- **Stateless design** - No session management complexity
- **Role-based access** - Admin vs user permissions
- **AWS-native** - Cognito handles user management, password policies, MFA
- **Development-friendly** - Mock auth for local testing

---

## 🔧 Bootstrap Strategy

### First Admin User Creation

Since user creation requires admin privileges, we use a **database seeding approach**:

**One-time setup after first deployment:**

```bash
# Run this script once to create your first admin user
./scripts/create-first-admin-user.sh
```

**The script directly inserts the admin user into DynamoDB:**

- Bypasses API authorization (runs with your AWS credentials)
- Creates admin user with `role: "ADMIN"`
- Only needs to be run once per environment
- Can be customized for your admin email/details

**After the first admin exists:**

- All subsequent users created via `/users` API endpoints
- Admin users can create/manage other users through the web interface
- No special bootstrap code paths in your application

---

## 🔄 Lambda Function Pattern

All Lambda functions follow a consistent resource-based pattern:

```javascript
// domains/users/src/index.js - Handles all user operations
const controller = require("./controller");

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  return await controller.handleRequest(event);
};
```

```javascript
// domains/users/src/controller.js - HTTP request routing
const {
  parseBody,
  errorResponse,
  successResponse,
} = require("./shared/helpers");
const service = require("./service");

const handleRequest = async (event) => {
  const { httpMethod, pathParameters } = event;

  try {
    switch (httpMethod) {
      case "POST":
        return await createUser(parseBody(event.body));
      case "GET":
        return pathParameters?.userId
          ? await getUser(pathParameters.userId)
          : await listUsers();
      case "PUT":
        return await updateUser(pathParameters?.userId, parseBody(event.body));
      case "DELETE":
        return await deleteUser(pathParameters?.userId);
      default:
        return errorResponse(405, "Method Not Allowed");
    }
  } catch (error) {
    console.error("Error in user controller:", error);
    return errorResponse(500, error.message);
  }
};
```

This pattern provides:

- **Consistent error handling** across all endpoints
- **Shared initialization code** (DB connections, etc.)
- **Better cold start performance**
- **Easier testing and debugging**
- **Clear separation of concerns** (controller → service → repository)

---

## 🗄️ DynamoDB Single-Table Design

The application uses a single DynamoDB table with the following patterns:

### User Entity Pattern:

```javascript
{
  PK: "USER#01HVN8T7G8K9M2Q3R4S5T6U7V8",
  SK: "PROFILE",
  id: "01HVN8T7G8K9M2Q3R4S5T6U7V8",
  email: "user@example.com",
  name: "John Doe",
  role: "USER", // or "ADMIN"
  status: "ACTIVE",
  createdAt: "2025-05-26T10:00:00Z",
  updatedAt: "2025-05-26T10:00:00Z",

  // GSI1 for email lookups
  GSI1PK: "EMAIL#user@example.com",
  GSI1SK: "LOOKUP"
}
```

### Access Patterns:

- **Get user by ID**: Query PK=`USER#{id}`, SK=`PROFILE`
- **Get user by email**: Query GSI1 where GSI1PK=`EMAIL#{email}`
- **List all users**: Query PK=`USER#`, SK begins_with `PROFILE`

### Future Entity Patterns:

```javascript
// TODO entities (when implemented)
{
  PK: "USER#01HVN8T7G8K9M2Q3R4S5T6U7V8",
  SK: "TODO#01HVN8T7G8K9M2Q3R4S5T6U7V9",
  todoId: "01HVN8T7G8K9M2Q3R4S5T6U7V9",
  text: "Buy groceries",
  completed: false,
  createdAt: "2025-05-26T10:00:00Z"
}
```

---

## 🔐 Secrets Management

Configuration and secrets are handled using AWS-native services:

- **AWS Systems Manager Parameter Store** for application configuration
- **AWS Secrets Manager** for sensitive data (API keys, database credentials)
- **Environment variables** populated from these services via SAM templates
- **No hardcoded secrets** in code or templates

Example usage in SAM templates:

```json
{
  "Environment": {
    "Variables": {
      "DB_NAME": "{{resolve:secretsmanager:/myApp/DbName}}",
      "API_KEY": "{{resolve:secretsmanager:/myApp/ApiKey}}",
      "LOG_LEVEL": { "Ref": "LogLevelParameter" }
    }
  }
}
```

---

## 🌐 Custom Domain & SSL

Professional deployment includes:

- **Custom domain configuration** via Route 53
- **SSL certificate management** via AWS Certificate Manager
- **CloudFront distribution** for global performance (production)
- **Automatic HTTPS redirects**

Domain setup is handled entirely through SAM templates with minimal configuration required.

---

## 🛠️ Development Workflow

### Local Development

```bash
# Start local frontend server
node scripts/local-server.js 8080 frontend

# Run with mock authentication and API
# Edit frontend/js/config.js to set useMockApi: true
```

### Backend Development

```bash
# Build and test locally
sam build --template-file infra/template.json
sam local start-api --template-file infra/template.json

# Sync changes to AWS (dev environment)
make sync-backend ENV=dev
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
- Keep **JWT authorization** consistent
- Document clearly for future developers

Examples of expected customization:

- Adding new business resources (todos, comments, etc.)
- Extending user management capabilities
- Adding background job processing
- Creating admin dashboard endpoints

### Adding New Resources

1. Create new domain folder: `infra/domains/todos/src/`
2. Implement resource-based Lambda function
3. Add function and events to main `template.json`
4. Update frontend to consume new endpoints

---

## ✅ Cost Estimates

**Monthly costs at 10 requests/second (~26M requests/month):**

- HTTP API Gateway: ~$50
- Lambda Functions: ~$30
- DynamoDB: ~$40
- Cognito: ~$0 (under free tier)
- **Total: ~$120/month**

This scales cost-effectively to 500k+ daily active users before requiring architectural changes.

---

## 🛣️ Development Roadmap

### MVP Phase (Current)

- ✅ HTTP API + Lambda + DynamoDB foundation
- ✅ Consolidated SAM template architecture
- ✅ JWT authentication with Cognito
- ✅ Custom domain setup
- ✅ Secrets management
- ✅ User management domain
- 🔄 First business resource (todos)

### Production Phase (Later)

- Safe deployment strategies (canary/blue-green)
- Governance and compliance (AWS Config)
- Monitoring and alerting
- Performance optimization

### Scale Phase (Much Later)

- Multi-region deployment
- Advanced caching strategies
- Microservice decomposition (if needed)

---

## 📚 Architecture Decision Records

### ADR-001: Consolidated SAM Templates

**Context**: Initially used nested SAM applications to organize domains, but encountered HTTP API sharing issues.

**Decision**: Consolidate all Lambda functions into single SAM template with shared HTTP API.

**Consequences**:

- ✅ Simplified HTTP API event configuration
- ✅ Single deployment command for all backend resources
- ✅ Direct resource references (no complex imports/exports)
- ✅ Easier debugging and monitoring
- ❌ Slightly larger template file
- ❌ Less modular at CloudFormation level (but domain separation maintained in filesystem)

### ADR-002: Resource-Based Lambda Functions

**Decision**: One Lambda function per business resource (not per HTTP endpoint).

**Rationale**: Shared connections, better cold starts, simpler deployment, easier testing.

### ADR-003: Single DynamoDB Table

**Decision**: All entities in one table with composite keys and GSIs.

**Rationale**: Cost optimization, simplified access patterns, better performance for serverless.

---

## ✅ Status

> **MVP Phase** - Stable scaffolding architecture suitable for development and testing.

This scaffold prioritizes **simplicity, maintainability, and cost-effectiveness** over architectural complexity. Perfect for building sustainable, profitable applications that can scale from prototype to significant user base.

**Next Steps:**

1. Deploy core infrastructure
2. Implement first business resource (todos)
3. Build minimal frontend
4. Test end-to-end functionality
5. Iterate toward production readiness

---

**Remember: Simplicity beats cleverness. Shipping beats perfection. AWS-native beats custom solutions.**
