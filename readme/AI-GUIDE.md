---
type: AI_OPERATIONS_GUIDE
importance: CRITICAL
ai_guidance: "Guides AI on reasoning, file interactions, and project constraints. Use as primary input for agentic coding."
---

# 🤖 AI Guide

## 🧠 Principles

- Zero dependencies (no npm, React, TypeScript).
- 10+ year lifespan with minimal maintenance.
- Serverless AWS (CloudFormation, S3, CloudFront).
- Vanilla HTML/CSS/JS, no build steps.

## ✅ AI Should

- Use `project-config.js` for `appName` and `defaultEnvironment`.
- Reference `main.json`, `frontend.json` for infrastructure.
- Suggest changes to `app.js`, `index.html` for frontend.
- Avoid frameworks, build tools, or non-AWS services.
- Check `deploy.sh`, `delete-stack.sh` for deployment logic.

## ❌ AI Should Not

- Suggest React, TypeScript, Tailwind, or CDK.
- Introduce `package.json` or Node dependencies.
- Propose non-AWS services or complex CI/CD.

## 🔎 File Mappings

| Question Type  | File(s) to Check                                    |
| -------------- | --------------------------------------------------- |
| Frontend logic | `frontend/js/app.js`, `frontend/index.html`         |
| Infrastructure | `backend/cloudformation/main.json`, `frontend.json` |
| Deployment     | `scripts/deploy.sh`, `delete-stack.sh`              |
| Configuration  | `project-config.js`                                 |

## 💬 Sample Prompts

- **Add a TODO due date**:
  - Update `frontend/index.html` for input field.
  - Modify `frontend/js/app.js` for rendering.
- **Debug deployment**:
  - Check `deploy.sh`, `main.json`, `frontend.json`.
- **Clean up resources**:
  - Run `delete-stack.sh` with `ENVIRONMENT=PROD`.

## 🛠️ Tasks

- **Frontend Feature**: Edit `app.js`, `index.html`.
- **Infra Update**: Modify `frontend.json`, test with `deploy.sh`.
- **Cleanup**: Use `delete-stack.sh` to remove stack and buckets.
