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
2. **AWS SAM-first infrastructure**: All infrastructure defined in SAM templates leveraging SAM's strengths.
3. **Lambda per resource**: One Lambda function handles all operations for each business resource (users, todos, etc.).
4. **HTTP API Gateway**: Modern, cost-effective API Gateway with built-in JWT authorization.
5. **Strict data isolation**: Each user's data is isolated at every layer.
6. **Frontend purity**: Vanilla JS with custom micro-utilities for interactivity.
7. **Simple CRUD patterns**: Standard HTTP endpoints with JSON request/response.
8. **Development velocity**: SAM's sync mode and local testing for rapid iteration.

---

## 🚀 Serverless-First Strategy

This scaffold embraces **serverless-first architecture** with a focus on simplicity and cost-effectiveness:

### Strategic Decisions:

- **Lambda over containers** - No server management, automatic scaling
- **HTTP API over REST API** - 50% cost savings, simpler integration
- **JWT authorization** - Built-in HTTP API auth, no custom logic needed
- **One Lambda per resource** - Shared logic, better cold start management
- **DynamoDB single-table design** - Optimized for serverless access patterns

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

## 🔧 Auth Architecture Overview

This scaffold uses a simple, secure authentication system:

- **HTTP API Gateway** with built-in JWT authorizers
- **Amazon Cognito User Pools** for user management
- **JSON Web Tokens (JWT)** for stateless authentication
- **DynamoDB** stores user records with role-based access
- **Lambda functions** handle auth operations (login, register, refresh)

**Key Benefits:**

- **Built-in authorization** - HTTP API handles JWT validation
- **Stateless design** - No session management complexity
- **Role-based access** - Admin vs user permissions
- **AWS-native** - Cognito handles user management, password policies, MFA

---

## 🔧 Bootstrap Strategy

### First Admin User Creation

Since user creation requires admin privileges, we use a **database seeding approach**:

**One-time setup after first deployment:**

```bash
# Run this script once to create your first admin user
./scripts/create-first-admin.sh
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
// src/users.js - Handles all user operations
exports.handler = async (event) => {
  const { httpMethod, pathParameters } = event;

  try {
    switch (httpMethod) {
      case "POST":
        return await createUser(event);
      case "GET":
        return await getUser(pathParameters?.userId);
      case "PUT":
        return await updateUser(pathParameters?.userId, event);
      case "DELETE":
        return await deleteUser(pathParameters?.userId);
      default:
        return { statusCode: 405, body: "Method Not Allowed" };
    }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
```

This pattern provides:

- **Consistent error handling** across all endpoints
- **Shared initialization code** (DB connections, etc.)
- **Better cold start performance**
- **Easier testing and debugging**

---

## 🔐 Secrets Management

Configuration and secrets are handled using AWS-native services:

- **AWS Systems Manager Parameter Store** for application configuration
- **AWS Secrets Manager** for sensitive data (API keys, database credentials)
- **Environment variables** populated from these services via SAM templates
- **No hardcoded secrets** in code or templates

Example usage in SAM templates:

```yaml
Environment:
  Variables:
    DB_NAME: "{{resolve:secretsmanager:/myApp/DbName}}"
    API_KEY: "{{resolve:secretsmanager:/myApp/ApiKey}}"
    LOG_LEVEL: !Ref LogLevelParameter
```

---

## 🌐 Custom Domain & SSL

Professional deployment includes:

- **Custom domain configuration** via Route 53
- **SSL certificate management** via AWS Certificate Manager
- **CloudFront distribution** for global performance
- **Automatic HTTPS redirects**

Domain setup is handled entirely through SAM templates with minimal configuration required.

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
- ✅ JWT authentication with Cognito
- ✅ Custom domain setup
- ✅ Secrets management
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

## ✅ Status

> **MVP Phase** - Stable scaffolding architecture suitable for development and testing.

This scaffold prioritizes **simplicity, maintainability, and cost-effectiveness** over architectural complexity. Perfect for building sustainable, profitable applications that can scale from prototype to significant user base.

**Next Steps:**

1. Deploy core infrastructure
2. Implement first business resource (todos)
3. Build minimal frontend
4. Test end-to-end functionality
5. Iterate toward production readiness
