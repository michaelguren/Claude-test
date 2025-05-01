---
type: PROJECT_OVERVIEW
importance: HIGHEST
ai_guidance: "This file provides AI and humans with a high-level entry point. It summarizes the philosophy, structure, and how all pieces of the project fit together."
---

# 📝 Minimalist TODO Application Template

A modern, AI-native web application template built with zero dependencies and long-term maintainability in mind.

This repo serves as the foundation for all web apps I create going forward. It prioritizes:

- 🧠 **AI-optimized architecture** (agentic coding ready)
- 💡 **Human-friendly structure** (readable, modular, maintainable)
- 🌐 **Serverless backend** (AWS-native: Lambda, DynamoDB, CloudFormation)
- ⚙️ **Zero frontend frameworks** (pure HTML, CSS, JavaScript)
- 🧪 **Minimalist testing** (unit, integration, and E2E, no test dependencies)
- 🔐 **Dual-mode authentication** (Cognito or mock fallback)

---

## 📂 Project Highlights

| Area            | Tech                                                  |
| --------------- | ----------------------------------------------------- |
| UI              | Vanilla JS, no frameworks                             |
| Hosting         | AWS S3 + CloudFront                                   |
| API Layer       | API Gateway + Lambda                                  |
| Database        | DynamoDB                                              |
| Auth (optional) | Cognito User Pools                                    |
| Infra-as-Code   | Pure CloudFormation JSON                              |
| Config          | Central `project-config.js`                           |
| Deployment      | Simple shell scripts (`deploy.sh`, `delete-stack.sh`) |

---

## 📚 Key Documentation (in /README)

- `GUIDE-ARCHITECTURE.md` – System design and stack
- `GUIDE-DEPLOYMENT.md` – Infra and deploy logic
- `AI-README.md` – AI-specific reasoning guide

---

## 🧠 AI & Agentic Coding Ready

This project is built with the future in mind:

- Every doc is tagged with metadata (type, scope, ai_guidance)
- `GUIDE-AI.md` tells LLMs how to reason about this codebase
- `GUIDE-TASKS.md` provides plan-step-action blueprints
- Folder and file names are contextually chunkable for AI embeddings

This isn’t just a TODO app — it’s a living blueprint for how AI and humans can build great software together.

---

## 🔄 Auth Modes

You can run the app in two modes:

| Mode                 | Behavior                            |
| -------------------- | ----------------------------------- |
| `authEnabled: true`  | Uses Cognito for login              |
| `authEnabled: false` | Uses mock identity (static user ID) |

Control this via `project-config.js`

---

## 🛠️ Setup (Minimal Requirements)

```bash
# Configure AWS CLI and edit project-config.js
cd scripts
./deploy.sh     # Deploy full or mock stack based on config
```
