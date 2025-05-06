---
type: DEPLOYMENT_DOCUMENTATION
importance: HIGH
ai_guidance: "Details deployment and cleanup scripts, configuration, and environment handling."
---

# 🚀 Deployment Guide

## 🔧 Configuration

- **`project-config.js`**: Defines `appName` (e.g., `MinimalistTodoStack`) and `defaultEnvironment` (e.g., `DEV`).
- **Dynamic Values**: `STACK_NAME` (`<appName>-<Environment>`), `TEMPLATE_BUCKET` (`minimalist-todo-templates-<AccountID>`), and `REGION` derived in scripts.

## 📜 Scripts

- **`deploy.sh`**:
  - Creates template bucket if missing (silent).
  - Packages `main.json`, `frontend.json` to S3.
  - Deploys stack (`MinimalistTodoStack-${ENVIRONMENT}`).
  - Syncs `frontend/` to S3 bucket from stack output.
  - Usage: `./deploy.sh` or `ENVIRONMENT=PROD ./deploy.sh`.
- **`delete-stack.sh`**:
  - Cleans template and stack S3 buckets (silent).
  - Deletes stack (`MinimalistTodoStack-${ENVIRONMENT}`).
  - Usage: `./delete-stack.sh` or `ENVIRONMENT=PROD ./delete-stack.sh`.

## 🌍 Multi-Account Setup

- **DEV/PROD**: Separate AWS accounts via SSO.
- **Environment**: Set `ENVIRONMENT` variable (defaults to `DEV`).
- **Region**: Uses `AWS_DEFAULT_REGION` (defaults to `us-east-1`).

## 🛠️ Adding Features

- Update `frontend.json` for new resources.
- Modify `deploy.sh` to pass parameters if needed.
- Test with `./deploy.sh` and clean up with `./delete-stack.sh`.
