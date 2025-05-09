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
2. **CloudFormation-first infrastructure**: All infrastructure defined in explicit JSON templates.
3. **Direct integration preferred**: Use VTL and native service integrations over Lambda when possible.
4. **Strict data isolation**: Each user’s data is isolated at every layer.
5. **Frontend purity**: Vanilla JS with custom micro-utilities for interactivity.
6. **Extensible by composition**: Small, composable parts rather than monolithic design.

---

## 🤖 AI Pair Programming Expectations

When used in conjunction with an AI code assistant:

- Assume CloudFormation, VTL, and serverless design as default.
- Do **not** suggest third-party tooling (e.g., CDK, Amplify, SST).
- Suggest durable, low-maintenance solutions.
- Avoid introducing complexity unless explicitly requested.
- Prioritize simple, human-readable code that reflects best practices.

Use AI to:

- Help with VTL mappings and IAM permissions
- Validate CloudFormation template structures
- Scaffold new backend/frontend features in AWS-native style
- Challenge architectural decisions where appropriate

---

## 💡 Customization & Iteration

This template is intentionally minimal. Additions and modifications should:

- Be implemented as isolated, composable modules
- Respect boundaries between data, logic, and presentation
- Avoid tight coupling or unnecessary abstraction
- Be documented clearly for future developers (including your future self)

Examples of where customization is expected:

- Adding additional DynamoDB indexes or tables
- Extending API Gateway with more routes
- Introducing additional user workflows or features

---

## ✅ Status

> Early scaffolding phase. Expect frequent iteration. Stability not guaranteed yet.

If you are reading this with the intent to contribute or replicate, please reach out or open an issue to align on the project's current trajectory.
