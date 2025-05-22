# Minimalist TODO App Scaffold

This repository contains a **minimal, reusable scaffolding** for web applications. It is designed to last over a decade with minimal ongoing maintenance, and aims to simplify development by favoring clear, dependency-free patterns using native AWS services.

---

## 🧠 Project Purpose

This project serves as a boilerplate for building scalable, secure, and highly maintainable web applications using:

- **AWS serverless infrastructure**
- **Pure frontend code (Vanilla JS/HTML/CSS)**
- **Zero external dependencies or SDKs**

It is intended as a starting point for future apps, prioritizing long-term durability over short-term productivity hacks.

---

## ⚙️ Architectural Principles

1. **Zero runtime dependencies**: No frameworks, SDKs, or bundlers.
2. **AWS SAM-first infrastructure**: All infrastructure defined in SAM JSON templates with enhanced deployment capabilities and domain-based organization.
3. **VTL-first integration**: Use VTL and REST API Gateway direct service integrations; avoid Lambda unless compute is required.
4. **Strict data isolation**: Each user's data is isolated at every layer.
5. **Frontend purity**: Vanilla JS with custom micro-utilities for interactivity.
6. **Simple CRUD patterns**: All operations designed to be VTL-compatible for predictable performance and maintainability.
7. **Development velocity**: SAM's sync mode and intelligent change detection for rapid iteration.

---

## 🤖 AI Pair Programming Expectations

When used in conjunction with an AI code assistant:

- Assume **REST API Gateway + VTL** as the default integration pattern.
- Prefer **AWS SAM JSON** for all infrastructure definitions with auto-formatting support.
- Do **not** suggest any other third-party tooling (e.g., CDK, Amplify, SST).
- Suggest durable, low-maintenance solutions.
- Avoid introducing complexity unless explicitly requested.
- Prioritize simple, human-readable code that reflects best practices.

Use AI to:

- Help with VTL mappings and IAM permissions
- Validate AWS SAM template structures and deployment strategies
- Scaffold new backend/frontend features in AWS-native style
- Challenge architectural decisions where appropriate

---

## 🚀 Infrastructure & Development Workflow (SAM-Powered)

This scaffold leverages **AWS SAM** for superior infrastructure management and development velocity:

**Key SAM Advantages Over Raw CloudFormation:**

- **Intelligent deployment**: Only changed resources are updated, dramatically reducing deployment time
- **Stack management**: Proper dependency resolution and rollback capabilities
- **Development sync mode**: `sam sync` provides real-time cloud synchronization during development
- **Drift detection**: Automatic detection and management of infrastructure drift
- **Built-in best practices**: SAM templates include security and performance optimizations by default
- **Local testing**: `sam local` for testing API Gateway and Lambda integrations offline
- **Domain-based organization**: Nested stacks separated by business domain for maintainability

**Template Strategy:**

- **SAM JSON templates** for all infrastructure (auto-formatting friendly, no indentation issues)
- **Domain-based nested stacks**: API, AUTHENTICATION, TODO, TODO_COMMENTS, etc.
- **Clear separation of concerns** with isolated deployable units per domain

**Development Workflow:**

```bash
# Development mode with real-time sync
sam sync --watch --stack-name myapp-dev

# Production deployment with change detection
sam build && sam deploy --stack-name myapp-prod
```

This eliminates the need for custom bash scripts and provides enterprise-grade deployment capabilities out of the box.

---

## 🔧 Auth Architecture Overview (as of May 2025)

This scaffold includes a custom user authentication system built from first principles using:

- **AWS REST API Gateway** — predictable performance, built-in throttling, request validation
- **VTL (Velocity Template Language)** — direct service integrations without Lambda cold starts
- **DynamoDB** — stores normalized user records (phone-first, email optional)
- **Amazon SNS** — used for SMS-based OTP delivery
- **Optional passkey (WebAuthn) support** — planned for secure, passwordless login

We intentionally avoid AWS Cognito and Lambda-heavy patterns to simplify customization, ensure predictable performance, and maximize long-term maintainability. Rather, we are building authentication taking inspiration from: https://firtman.github.io/authentication/.

**Key Benefits of REST API + VTL Pattern:**

- **50-100ms response times** with no cold start variability
- **Built-in request validation** and throttling
- **Predictable performance** for all operations
- **Lower operational costs** (no Lambda invocation charges)
- **Future-proof**: positioned for AWS's enhanced API Gateway capabilities

---

## 🔄 Application Pattern Philosophy

All operations are designed to be **VTL-compatible**, meaning:

- **Simple CRUD operations** with minimal data transformation
- **Direct service integrations** (DynamoDB, SNS, SES)
- **Complex business logic** handled in frontend or async processing
- **Clear data contracts** that map cleanly to VTL transformations

This constraint forces architectural discipline and creates inherently maintainable, portable operations.

## 💡 Customization & Iteration

This template is intentionally minimal. Additions and modifications should:

- Be implemented as isolated, composable modules
- Respect boundaries between data, logic, and presentation
- Maintain VTL-compatible patterns
- Avoid tight coupling or unnecessary abstraction
- Be documented clearly for future developers (including your future self)

Examples of where customization is expected:

- Adding additional DynamoDB indexes or tables
- Extending API Gateway with more VTL-integrated routes
- Introducing additional user workflows or features
- Creating frontend micro-utilities for enhanced interactivity

---

## ✅ Status

> Early scaffolding phase. Expect frequent iteration. Stability not guaranteed yet.

If you are reading this with the intent to contribute or replicate, please reach out or open an issue to align on the project's current trajectory.
