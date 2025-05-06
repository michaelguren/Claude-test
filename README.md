---
type: PROJECT_OVERVIEW
importance: HIGHEST
ai_guidance: "Primary entry point for humans and AI. Summarizes project philosophy, structure, and key files."
---

# 📝 Minimalist TODO Application

A serverless, dependency-free web application template for longevity and simplicity, built with AWS and vanilla web technologies.

## 🧠 Philosophy

- **Zero Dependencies**: No frameworks, npm, or build tools.
- **Longevity**: Designed to run 10+ years without maintenance.
- **Simplicity**: Minimal, human-readable code and infrastructure.
- **AI-Native**: Structured for AI-assisted development and reasoning.

## 📂 Project Highlights

| Area          | Tech                                               |
| ------------- | -------------------------------------------------- |
| UI            | Vanilla HTML, CSS, JavaScript                      |
| Hosting       | S3 + CloudFront                                    |
| Infra-as-Code | CloudFormation JSON (`main.json`, `frontend.json`) |
| Config        | Minimal `project-config.js`                        |
| Deployment    | Bash scripts (`deploy.sh`, `delete-stack.sh`)      |

## 📁 Key Files

| File/Path                              | Purpose                                         |
| -------------------------------------- | ----------------------------------------------- |
| `frontend/index.html`                  | Main HTML entry point                           |
| `frontend/js/app.js`                   | Core UI and API logic                           |
| `backend/cloudformation/main.json`     | Main CloudFormation stack                       |
| `backend/cloudformation/frontend.json` | Frontend infrastructure                         |
| `project-config.js`                    | Static config (`appName`, `defaultEnvironment`) |
| `scripts/deploy.sh`                    | Deploys stack and frontend assets               |
| `scripts/delete-stack.sh`              | Cleans up stack and S3 buckets                  |

## 🚀 Deployment

- **Multi-Account**: Separate AWS accounts for DEV/PROD using AWS SSO.
- **Stack Naming**: `<appName>-<Environment>` (e.g., `MinimalistTodoStack-DEV`).
- **Scripts**:
  - Run `deploy.sh` to package and deploy (`ENVIRONMENT=PROD ./deploy.sh` for PROD).
  - Run `delete-stack.sh` to clean up (`ENVIRONMENT=PROD ./delete-stack.sh` for PROD).
- See `GUIDE-DEPLOYMENT.md` for details.

## 🤖 AI Readiness

- **Metadata**: Files tagged with `type`, `importance`, `ai_guidance`.
- **Prompts**: See `AI-GUIDE.md` for AI interaction examples.
- **Constraints**: No frameworks, TypeScript, or non-AWS services.

## 📚 Documentation

- `/README/AI-GUIDE.md`: AI reasoning and prompt guide.
- `/README/GUIDE-DEPLOYMENT.md`: Deployment and script details.
- `/docs/archive/`: Historical guides (e.g., `GUIDE-ARCHITECTURE.md`).
