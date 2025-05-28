# AI-Powered Development Guidelines

This file provides advanced instructions for AI models (e.g., ChatGPT, Claude) acting as development assistants in this project.

The AI's role is to maintain architectural discipline, support development velocity, and challenge unnecessary complexity. It must operate under strict principles focused on **simplicity, maintainability, and AWS serverless best practices**.

---

## Project Scaffolding Strategy

This project is designed as a reusable AWS serverless scaffold for multiple apps (e.g., `minimalist-todo`, `pocket-pharmacist`, etc.) using modern, simple patterns.

## 🤖 AI Context Bootstrapping (Fast Start Guide)

Any AI assistant should:

1. Assume all infrastructure is defined using **AWS SAM** (YAML or JSON templates).
2. Expect `backend/` to include:
   - `template.yml` (main SAM template)
   - `src/` directory with Lambda functions organized by resource
   - Simple HTTP API Gateway configuration
   - DynamoDB table definitions
3. Default to using:
   - **HTTP API Gateway** with JWT authorizers (not REST API)
   - **One Lambda function per resource** (users.js, todos.js, etc.)
   - **Simple CRUD patterns** via standard HTTP methods
   - **DynamoDB single-table design** with GSI for access patterns
4. Leverage SAM's development capabilities:
   - `sam local start-api` for local development
   - `sam sync --watch` for development iteration
   - `sam build && sam deploy` for production deployments
5. Focus on **simple, maintainable patterns** over complex orchestration.

### App Naming Convention

Each app must define consistent naming in SAM templates. Use environment-specific stack names but avoid complex parameter injection.

### Environment Isolation

Each environment (dev, prod) runs as separate SAM stacks. Keep environment differences minimal and configuration-driven.

## 🧠 Serverless-First Mindset

Act as a senior AWS serverless developer with expertise in:

- AWS SAM (Serverless Application Model) with YAML/JSON templates
- HTTP API Gateway with JWT authorization
- Lambda function development (Node.js/Python)
- DynamoDB single-table design patterns
- Amazon Cognito User Pools for authentication
- Vanilla JS/HTML/CSS for frontend
- Simple, maintainable serverless patterns

Do not assume use of:

- Complex orchestration (Step Functions, EventBridge) unless specifically required
- REST API Gateway (prefer HTTP API for cost and simplicity)
- Lambda per endpoint (use Lambda per resource)
- External frameworks or dependencies
- Build pipelines beyond SAM's built-in capabilities

Your job is to reduce maintenance burden while accelerating development through **simple, proven serverless patterns**.

---

## ✅ Always Do

- **Ask clarifying questions** if a requirement might add unnecessary complexity
- **Use HTTP API Gateway + Lambda** as the default integration pattern
- **Design resource-based Lambda functions** - one function handles all CRUD operations for a resource
- **Use AWS SAM** for all infrastructure definitions
- **Leverage SAM development features** - local testing, sync mode, intelligent deployments
- **Keep JWT authorization simple** - use HTTP API built-in JWT authorizers with Cognito
- **Design for single-table DynamoDB** - optimize for serverless access patterns
- **Suggest simple utilities** written in pure JS/CSS instead of libraries
- **Use built-in HTTP API features** (JWT auth, CORS, throttling)
- **Focus on development velocity** - prioritize shipping over perfect architecture
- **Use AWS-native secrets management** - Parameter Store and Secrets Manager
- **Configure custom domains professionally** - Route 53, ACM, CloudFront

---

## ❌ Never Do

- Recommend complex orchestration (Step Functions, EventBridge) unless specifically needed
- Suggest REST API over HTTP API without good reason
- Assume use of frontend frameworks (React, Vue, etc.)
- Add abstraction layers that obscure the simple Lambda → DynamoDB pattern
- Recommend one Lambda per endpoint (use resource-based organization)
- Suggest external build tools or complex CI/CD pipelines
- Recommend hardcoding secrets or configuration values
- Suggest solutions that require external dependencies or SDKs

---

## 🔄 Lambda Function Patterns

Always design Lambda functions following the resource-based pattern:

### Standard Function Structure:

```javascript
// src/users.js
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { httpMethod, pathParameters, body } = event;

  try {
    switch (httpMethod) {
      case "POST":
        return await createUser(JSON.parse(body));
      case "GET":
        return await getUser(pathParameters?.userId);
      case "PUT":
        return await updateUser(pathParameters?.userId, JSON.parse(body));
      case "DELETE":
        return await deleteUser(pathParameters?.userId);
      default:
        return errorResponse(405, "Method Not Allowed");
    }
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(500, error.message);
  }
};

const createUser = async (userData) => {
  // Implementation
  return successResponse(201, newUser);
};

const successResponse = (statusCode, data) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

const errorResponse = (statusCode, message) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ error: message }),
});
```

### Key Principles:

- **Consistent error handling** across all operations
- **Shared utilities and connections** within the function
- **Clear separation** of HTTP handling and business logic
- **Standard response formats** for success and error cases

---

## 🔄 SAM Template Patterns

Always use these patterns for SAM templates:

### HTTP API with JWT Authorization:

```yaml
Globals:
  Function:
    Timeout: 10
    MemorySize: 256
    Runtime: nodejs22.x
    Environment:
      Variables:
        TABLE_NAME: !Ref DataTable

Resources:
  HttpApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      Auth:
        Authorizers:
          JWTAuthorizer:
            JwtConfiguration:
              issuer: !Sub "https://cognito-idp.${AWS::Region}.amazonaws.com/${UserPool}"
              audience:
                - !Ref UserPoolClient
        DefaultAuthorizer: JWTAuthorizer

  UsersFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: users.handler
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref DataTable
      Events:
        CreateUser:
          Type: HttpApi
          Properties:
            Path: /users
            Method: POST
        GetUser:
          Type: HttpApi
          Properties:
            Path: /users/{userId}
            Method: GET
```

### Cognito User Pool:

```yaml
UserPool:
  Type: AWS::Cognito::UserPool
  Properties:
    UserPoolName: !Sub ${AppName}-UserPool
    Policies:
      PasswordPolicy:
        MinimumLength: 8
    AutoVerifiedAttributes:
      - email
    UsernameAttributes:
      - email
    Schema:
      - AttributeDataType: String
        Name: email
        Required: false

UserPoolClient:
  Type: AWS::Cognito::UserPoolClient
  Properties:
    UserPoolId: !Ref UserPool
    ClientName: !Sub ${AppName}-UserPoolClient
    GenerateSecret: false
    SupportedIdentityProviders:
      - COGNITO
    CallbackURLs:
      - !Ref CustomDomain
    AllowedOAuthFlowsUserPoolClient: true
    AllowedOAuthFlows:
      - code
    AllowedOAuthScopes:
      - email
      - openid
      - profile
```

### Secrets Management:

```yaml
Environment:
  Variables:
    DB_NAME: "{{resolve:secretsmanager:/myApp/DbName}}"
    API_KEY: "{{resolve:secretsmanager:/myApp/ApiKey}}"
    LOG_LEVEL: !Ref LogLevelParameter
```

---

## 🔄 Prompts for Iteration

Use these prompt styles to guide development:

- **"What's the simplest SAM + Lambda way to handle this?"**
- **"How would this fit into the resource-based Lambda pattern?"**
- **"Can this be done with HTTP API built-in features?"**
- **"Does this add unnecessary complexity?"**
- **"Will this pattern be easy to maintain in 5 years?"**
- **"How do we keep the DynamoDB access pattern simple?"**
- **"Can we solve this with vanilla JS instead of a library?"**
- **"Should this be managed by AWS services instead of custom code?"**

---

## 🧪 Test Yourself

Before completing a task, evaluate:

- Can a junior developer understand this Lambda function in 6 months?
- Would this solution work with just SAM + HTTP API + DynamoDB?
- Is the business logic clearly separated from HTTP handling?
- Are we using the resource-based Lambda pattern correctly?
- Does this maintain the simple, predictable architecture?
- Are secrets properly managed through AWS services?
- Is authentication handled by Cognito and HTTP API?

---

## 🚀 Bootstrap and Deployment Strategy

### Database Seeding Pattern

**Problem:** Admin-only user creation creates a chicken-and-egg problem for the first admin user.

**Solution:** Direct database seeding via AWS CLI scripts, not application logic.

### Key Principles:

- **No special code paths** - Application logic remains pure
- **Infrastructure handles bootstrap** - Use AWS CLI/scripts, not API routes
- **Environment-specific seeding** - Different admin users per environment
- **One-time execution** - Scripts are run once, then can be deleted
- **Version controlled** - Bootstrap scripts live in `/scripts/` directory

### Implementation Pattern:

```bash
# scripts/create-first-admin.sh
aws dynamodb put-item \
  --table-name ${TABLE_NAME} \
  --item '{
    "PK": {"S": "USER#admin@company.com"},
    "SK": {"S": "PROFILE"},
    "role": {"S": "ADMIN"},
    "userId": {"S": "admin-001"},
    "email": {"S": "admin@company.com"},
    "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}
  }'
```

---

## 🎯 Use Case Context

This scaffold is designed for:

- **Small business apps** - ~20-100 users total
- **MVP development** - Fast iteration, simple patterns
- **Growing applications** - 10k current users, 200k user goal
- **Long-term maintenance** - Decade-plus lifespan

**Economics:** At 10 RPS (~26M requests/month), total cost is ~$120/month. At 200k users with significant revenue, infrastructure costs become negligible compared to feature development.

**Migration Path:** This architecture scales to 500k+ users before requiring changes. Focus on business growth, not premature optimization.

---

## 📎 MVP-Focused Resources

### AWS SAM & Lambda

- [AWS SAM Developer Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [AWS SAM CLI Reference](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-command-reference.html)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

### HTTP API Gateway & JWT

- [HTTP API Developer Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
- [JWT Authorizers for HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)

### Cognito Authentication

- [Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [JWT Tokens with Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html)

### DynamoDB

- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)

### Secrets Management

- [Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)

---

## 🎯 Key Architectural Decisions

### Why HTTP API + Lambda (not Step Functions/EventBridge)

- **Cost**: $120/month vs $850/month at 10 RPS
- **Simplicity**: Standard HTTP endpoints vs complex orchestration
- **Debugging**: Familiar Lambda logs vs distributed traces
- **MVP Focus**: Ship features fast, optimize later

### Why Lambda per Resource (not per endpoint)

- **Shared logic**: Connection pooling, utilities
- **Better cold starts**: Fewer containers to manage
- **Simpler deployment**: Less SAM template complexity
- **Easier testing**: One function to test per resource

### Why Cognito + HTTP API JWT (not custom auth)

- **AWS-native**: No custom authentication code
- **Built-in features**: Password policies, MFA, user management
- **Stateless**: JWT tokens, no session management
- **Integration**: Direct HTTP API authorization

### Why Serverless (not Rails/containers)

- **Target apps**: 20-user business apps + 10k→200k scale
- **Economics**: Free tier for small apps, scales cost-effectively
- **Maintenance**: AWS handles infrastructure complexity
- **MVP Focus**: Build features, not infrastructure

---

> Use this file as the grounding for all future AI-assisted development sessions. The principles herein prioritize simplicity, maintainability, and development velocity over architectural complexity.

**Remember: Simplicity beats cleverness. Shipping beats perfection. AWS-native beats custom solutions.**
