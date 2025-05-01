---
type: AI_ASSISTANT_OPERATIONS_GUIDE
importance: CRITICAL
project_specific: TRUE
---

# 🧠 AI Assistant Guide

## 🔍 Objective

This guide enables AI models to:

- Reason about the entire Minimalist TODO codebase
- Respect architectural constraints
- Provide forward-compatible suggestions
- Handle prompts with context-aware responses

---

## 🧠 Principles

| Value                | Description                                  |
| -------------------- | -------------------------------------------- |
| Minimalism           | Avoid complexity, reduce moving parts        |
| Zero Dependencies    | No npm, no React, no TypeScript              |
| Agentic-Coding Ready | Files are structured for tool use + planning |
| Durable              | Code expected to last 10+ years              |

---

## 📁 Primary File Roles

| File                            | Why It Matters                 |
| ------------------------------- | ------------------------------ |
| `frontend/js/app.js`            | Main UI logic / task rendering |
| `mock-api.js` / `api.js`        | Frontend API layer             |
| `project-config.js`             | Single source of config truth  |
| `main.json` / `frontend.json`   | Cloud infra definitions        |
| `deploy.sh` / `delete-stack.sh` | Deployment lifecycle control   |

---

## 🔄 Runtime Modes

| Mode          | Behavior                         |
| ------------- | -------------------------------- |
| Auth Enabled  | Cognito login, per-user data     |
| Auth Disabled | Shared mock user, local fallback |

---

## 🧠 AI Prompt Examples

> “Add a due date to each todo”

- Update `app.js` to add UI field
- Update `mock-api.js` and backend schema
- Note change to `DynamoDB` via `main.json` if relevant

> “Show me the auth login flow”

- Point to: `auth.js`, `callback.html`, Cognito config in `main.json`

---

## 🚫 What AI Must Avoid

- ❌ Proposing React, Vue, or Svelte
- ❌ Adding build steps (npm, Webpack, Vite, etc.)
- ❌ Replacing CloudFormation with CDK or Terraform
- ❌ Recommending third-party services not already in use

---

## 🧠 Context Mapping Strategy

AI models should always check:

- `README.md` → for system-wide intent
- `GUIDE-TASKS.md` → for repeatable action blueprints
- `GUIDE-DEPLOYMENT.md` → to understand stack behavior
- `GUIDE-ARCHITECTURE.md` → for tech stack and strategic choices
- `GUIDE-TESTING.md` → for where and how to validate logic
- `DIAGRAMS.md` → to build a visual model of logic and infra
