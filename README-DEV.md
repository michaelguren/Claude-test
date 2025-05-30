# AI-Powered Development Guidelines

This file provides advanced instructions for AI models (e.g., ChatGPT, Claude) acting as development assistants in this project.

The AI's role is to maintain architectural discipline, support development velocity, and challenge unnecessary complexity. It must operate under strict principles focused on **simplicity, maintainability, and AWS serverless best practices**.

---

## Project Scaffolding Strategy

This project is designed as a reusable AWS serverless scaffold for multiple apps (e.g., `minimalist-todo`, `pocket-pharmacist`, etc.) using modern, simple patterns with **consolidated SAM templates**.

## 🤖 AI Context Bootstrapping (Fast Start Guide)

Any AI assistant should understand:

1. **Infrastructure is defined using consolidated AWS SAM templates** (JSON format, single template for all backend resources).
2. **Project structure**:
   - `infra/template.json` - Main SAM template with ALL backend resources
   - `infra/domains/` - Business domain Lambda functions organized by resource
   - `infra/stacks/frontend/` - Frontend-only nested stack (S3/CloudFront)
   - `frontend/` - Pure vanilla JS/HTML/CSS with zero dependencies
3. **Default patterns**:
   - **Single HTTP API Gateway** shared across all Lambda functions
   - **One Lambda function per resource** (users.js, todos.js, etc.)
   - **Simple CRUD patterns** via standard HTTP methods
   - **DynamoDB single-table design** with GSI for access patterns
   - **Resource-based Lambda organization** (not endpoint-based)
4. **SAM development capabilities**:
   - `sam local start-api` for local development
   - `sam sync --watch` for development iteration
   - `sam build && sam deploy` for production deployments
5. **Focus on simple, maintainable patterns** over complex orchestration.

### App Naming Convention

Each app uses consistent naming in SAM templates. Environment-specific stack names with minimal parameter injection.

### Environment Isolation

Each environment (dev, prod) runs as separate SAM stacks using different AWS profiles. Keep environment differences minimal and configuration-driven.

---

## 🧠 Serverless-First Mindset

Act as a senior AWS serverless developer with expertise in:

- **Consolidated AWS SAM templates** (JSON format, single template approach)
- **HTTP API Gateway** with shared endpoints and JWT authorization
- **Lambda function development** (Node.js) with resource-based organization
- **DynamoDB single-table design patterns**
- **Amazon Cognito User Pools** for authentication
- **Vanilla JS/HTML/CSS** for frontend (zero dependencies)
- **Simple, maintainable serverless patterns**

Do not assume use of:

- **Nested SAM applications** for Lambda functions (use single template)
- **Complex orchestration** (Step Functions, EventBridge) unless specifically required
- **REST API Gateway** (prefer HTTP API for cost and simplicity)
- **Lambda per endpoint** (use Lambda per resource)
- **External frameworks or dependencies** (vanilla JS only)
- **Build pipelines** beyond SAM's built-in capabilities

Your job is to reduce maintenance burden while accelerating development through **simple, proven serverless patterns**.

---

## ✅ Always Do

- **Ask clarifying questions** if a requirement might add unnecessary complexity
- **Use consolidated SAM templates** - single template for all backend resources
- **Design resource-based Lambda functions** - one function handles all CRUD operations for a resource
- **Reference shared HTTP API** directly in Lambda function events
- **Use AWS SAM** for all infrastructure definitions
- **Leverage SAM development features** - local testing, sync mode, intelligent deployments
- **Keep JWT authorization simple** - use HTTP API built-in JWT authorizers with Cognito
- **Design for single-table DynamoDB** - optimize for serverless access patterns
- **Suggest simple utilities** written in pure JS/CSS instead of libraries
- **Use built-in HTTP API features** (JWT auth, CORS, throttling)
- **Focus on development velocity** - prioritize shipping over perfect architecture
- **Use AWS-native secrets management** - Parameter Store and Secrets Manager
- **Configure custom domains professionally** - Route 53, ACM, CloudFront
- **Maintain domain separation in filesystem** - not CloudFormation structure

---

## ❌ Never Do

- **Recommend nested SAM applications** for Lambda functions (use single template)
- **Suggest complex orchestration** (Step Functions, EventBridge) unless specifically needed
- **Recommend REST API over HTTP API** without good reason
- **Assume use of frontend frameworks** (React, Vue, etc.)
- **Add abstraction layers** that obscure the simple Lambda → DynamoDB pattern
- **Recommend one Lambda per endpoint** (use resource-based organization)
- **Suggest external build tools** or complex CI/CD pipelines
- **Recommend hardcoded secrets** or configuration values
- **Suggest solutions** that require external dependencies or SDKs
- **Create separate HTTP APIs** for different domains (use single shared API)

---

## 🔄 Lambda Function Patterns

Always design Lambda functions following the resource-based pattern with clear separation of concerns:

### Standard Function Structure:

```javascript
// domains/users/src/index.js - Lambda handler entry point
const controller = require("./controller");

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  return await controller.handleRequest(event);
};
```

```javascript
// domains/users/src/controller.js - HTTP request handling
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

const createUser = async (userData) => {
  try {
    const user = await service.createUser(userData);
    return successResponse(201, user);
  } catch (error) {
    if (error.message.includes("already exists")) {
      return errorResponse(409, error.message);
    }
    if (
      error.message.includes("required") ||
      error.message.includes("Invalid")
    ) {
      return errorResponse(400, error.message);
    }
    throw error;
  }
};

module.exports = { handleRequest };
```

```javascript
// domains/users/src/service.js - Business logic
const repository = require("./repository");
const validation = require("./validation");
const { generateULID, getCurrentTimestamp } = require("./shared/helpers");

const createUser = async (userData) => {
  // Validate input
  validation.validateCreateUser(userData);

  // Check if user already exists
  const existingUser = await repository.getUserByEmail(userData.email);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Build user object
  const user = {
    id: generateULID(),
    email: userData.email,
    name: userData.name,
    role: userData.role || "USER",
    status: "ACTIVE",
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };

  // Save to database
  await repository.createUser(user);

  return user;
};

module.exports = { createUser };
```

```javascript
// domains/users/src/repository.js - Data access layer
const { getItem, putItem, queryGSI } = require("./shared/dynamodb");

const TABLE_NAME = process.env.TABLE_NAME;

const createUser = async (user) => {
  const dbUser = {
    PK: `USER#${user.id}`,
    SK: "PROFILE",
    ...user,
    // GSI1 for email lookups
    GSI1PK: `EMAIL#${user.email}`,
    GSI1SK: "LOOKUP",
  };

  await putItem(dbUser, "attribute_not_exists(PK)");
  return user;
};

const getUserByEmail = async (email) => {
  try {
    const result = await queryGSI(TABLE_NAME, "GSI1", "GSI1PK = :email", {
      ":email": `EMAIL#${email}`,
    });
    return result.Items?.[0] || null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
};

module.exports = { createUser, getUserByEmail };
```

### Key Principles:

- **Clear separation of concerns**: controller → service → repository
- **Consistent error handling** across all operations
- **Shared utilities and connections** via shared modules
- **Standard response formats** for success and error cases
- **Domain-specific validation** in service layer
- **Database operations** isolated in repository layer

---

## 🔄 Consolidated SAM Template Patterns

Always use consolidated templates with shared HTTP API:

### Main Template Structure:

```json
{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Transform": "AWS::Serverless-2016-10-31",
  "Description": "Minimalist TODO Application - Consolidated Infrastructure",

  "Parameters": {
    "Environment": {
      "Type": "String",
      "Default": "dev",
      "AllowedValues": ["dev", "stage", "prod"],
      "Description": "Deployment environment"
    }
  },

  "Globals": {
    "Function": {
      "Timeout": 10,
      "MemorySize": 256,
      "Runtime": "nodejs22.x",
      "Environment": {
        "Variables": {
          "TABLE_NAME": { "Ref": "MainTable" },
          "ENVIRONMENT": { "Ref": "Environment" }
        }
      }
    }
  },

  "Resources": {
    "HttpApi": {
      "Type": "AWS::Serverless::HttpApi",
      "Description": "Shared HTTP API Gateway for all domains",
      "Properties": {
        "CorsConfiguration": {
          "AllowHeaders": ["Content-Type", "Authorization"],
          "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          "AllowOrigins": ["*"]
        },
        "DefaultRouteSettings": {
          "ThrottlingBurstLimit": 100,
          "ThrottlingRateLimit": 50
        }
      }
    },

    "MainTable": {
      "Type": "AWS::DynamoDB::Table",
      "Description": "Single DynamoDB table for all application entities",
      "Properties": {
        "TableName": { "Fn::Sub": "${AWS::StackName}-main-table" },
        "BillingMode": "PAY_PER_REQUEST",
        "AttributeDefinitions": [
          { "AttributeName": "PK", "AttributeType": "S" },
          { "AttributeName": "SK", "AttributeType": "S" },
          { "AttributeName": "GSI1PK", "AttributeType": "S" },
          { "AttributeName": "GSI1SK", "AttributeType": "S" }
        ],
        "KeySchema": [
          { "AttributeName": "PK", "KeyType": "HASH" },
          { "AttributeName": "SK", "KeyType": "RANGE" }
        ],
        "GlobalSecondaryIndexes": [
          {
            "IndexName": "GSI1",
            "KeySchema": [
              { "AttributeName": "GSI1PK", "KeyType": "HASH" },
              { "AttributeName": "GSI1SK", "KeyType": "RANGE" }
            ],
            "Projection": { "ProjectionType": "ALL" }
          }
        ]
      }
    },

    "UsersFunction": {
      "Type": "AWS::Serverless::Function",
      "Description": "Handles all user management operations",
      "Properties": {
        "CodeUri": "domains/users/src",
        "Handler": "index.handler",
        "Policies": [
          {
            "DynamoDBCrudPolicy": {
              "TableName": { "Ref": "MainTable" }
            }
          }
        ],
        "Events": {
          "CreateUser": {
            "Type": "HttpApi",
            "Properties": {
              "ApiId": { "Ref": "HttpApi" },
              "Path": "/users",
              "Method": "POST"
            }
          },
          "GetUser": {
            "Type": "HttpApi",
            "Properties": {
              "ApiId": { "Ref": "HttpApi" },
              "Path": "/users/{userId}",
              "Method": "GET"
            }
          },
          "ListUsers": {
            "Type": "HttpApi",
            "Properties": {
              "ApiId": { "Ref": "HttpApi" },
              "Path": "/users",
              "Method": "GET"
            }
          }
        }
      }
    }
  }
}
```

### Critical Template Rules

- **Single HTTP API Gateway** - All Lambda functions reference the same `HttpApi` resource
- **Domain-based functions** - Organize by business domain, not technical layer
- **Shared table reference** - All functions use the same `MainTable` via environment variables
- **Direct resource references** - No complex imports/exports between templates
- **Nested stacks sparingly** - Only for truly independent infrastructure (like frontend)

### Cognito Integration Pattern:

```json
{
  "UserPool": {
    "Type": "AWS::Cognito::UserPool",
    "Properties": {
      "UserPoolName": {"Fn::Sub": "${AWS::StackName}-UserPool"},
      "Policies": {
        "PasswordPolicy": {"MinimumLength": 8}
      },
      "AutoVerifiedAttributes": ["email"],
      "UsernameAttributes": ["email"]
    }
  },

  "UserPoolClient": {
    "Type": "AWS::Cognito::UserPoolClient",
    "Properties": {
      "UserPoolId": {"Ref": "UserPool"},
      "ClientName": {"Fn::Sub": "${AWS::StackName}-UserPoolClient"},
      "GenerateSecret": false,
      "AllowedOAuthFlowsUserPoolClient": true,
      "AllowedOAuthFlows": ["code"],
      "AllowedOAuthScopes": ["email", "openid", "profile"]
    }
  },

  "HttpApi":
```
