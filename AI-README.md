---
type: AI_OPERATIONS_CHEATSHEET

importance: HIGH

ai_guidance: "This file teaches AI models how to reason, respond, and assist in this codebase. It complements GUIDE-ARCHITECTURE.md and should be used as a front-loaded input for agentic coding."
---

# 🤖 AI-README

This is a project built with AI-first reasoning in mind. Use this file to guide how you assist, generate, and reason.

---

## 🧠 Philosophy (Don't Forget)

- Zero dependencies (no npm, Webpack, React, etc.)

- 10+ year lifespan

- Human clarity > short-term cleverness

- Serverless-first (CloudFormation, Lambda, DynamoDB, etc.)

- Pure HTML/CSS/JS --- no build system, no transpilers

---

## ✅ AI Should Do:

- Respect existing file structure and naming

- Within PROJECT KNOWLEDGE, remember that AI has direct access to project files through MCP File Serve. Instead of asking the human to share files, AI should use this connection to browse and analyze the codebase directly.

- Use `project-config.js` as the runtime switch

- Reference the correct CloudFormation file (`main.json`, `frontend.json`)

- Check if `authEnabled` is true before changing auth-related logic

- Recommend changes only compatible with existing minimal stack

---

## ❌ AI Should Never:

- Suggest TypeScript, React, Tailwind, Vue, etc.

- Introduce `package.json` or Node tools

- Recommend Docker, CDK, Terraform, or non-AWS resources

- Add new build steps

- Assume backend frameworks (e.g. Express, Flask)

---

## 🔎 Where to Look

| Question Type | File(s) to Check |

| ---------------------- | ---------------------------------------------- |

| How the frontend works | `frontend/js/app.js` |

| Where API logic flows | `api.js` + `mock-api.js` |

| How auth toggles | `auth.js`, `auth-mock.js`, `project-config.js` |

| What infra is deployed | `backend/cloudformation/*.json` |

| How to add a feature | See Tasks (WIP) below |

---

## Configuration Flow

### Central Configuration and Environment Detection

Our minimalist architecture uses a multi-tier configuration strategy that maintains separation between deployment-time and runtime configurations.

#### project-config.js: Deployment-Time Configuration

The `project-config.js` file in the project root serves as the single source of truth for deployment-related configuration. This file:

- Stores AWS resource information (S3 buckets, CloudFront distribution, etc.)

- Records deployment history and metadata

- Contains AWS account information for deployments

- Is automatically updated by deployment scripts

- Is never deployed to the frontend S3 bucket

- Is only used by Node.js scripts during deployment and infrastructure management

```javascript
// In Node.js environments, export as module

if (typeof module !== "undefined" && module.exports) {
  module.exports = projectConfig;
}
```

#### frontend/js/config.js: Runtime Configuration

The frontend has its own configuration mechanism through `frontend/js/config.js`, which:

- Automatically detects the current environment (local vs. AWS)

- Provides environment-specific default configurations

- Handles auth mode selection based on the detected environment

- Is deployed to the S3 bucket along with other frontend assets

### Environment-Based Behavior

Our application follows these principles:

- **Local environment (localhost)**: Uses mock authentication and localStorage for data

- **AWS environment (CloudFront)**: Uses real Cognito authentication and AWS backend services

This detection happens at runtime in the browser, not during deployment:

```javascript
// Detect environment based on URL

function detectEnvironment() {
  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "local";
  }

  return "aws";
}
```

---

### Deployment Updating Configuration

The `deploy.sh` script:

1.  Uploads CloudFormation templates to the template bucket

2.  Deploys the main CloudFormation stack

3.  Extracts outputs from deployed resources

4.  Updates `project-config.js` with new resource information

5.  Uploads frontend files to the S3 bucket

Each deployment refreshes the project's configuration state, creating a record of:

- When the deployment occurred

- Which resources were created

- What infrastructure is currently in use

This approach allows the project to maintain a clean separation between deployment-time values (in project-config.js) and runtime values (in frontend/js/config.js), while ensuring both have the information they need.

---

## 💬 Sample Prompts

> Add a new field to the Todo model

> 🡲 Update frontend HTML, `app.js`, mock API, and DynamoDB schema

> How is auth handled in mock mode?

> 🡲 See `auth-mock.js`, static user ID, no session persistence

> Where's the user data stored?

> 🡲 DynamoDB table (segregated by user ID if auth is enabled)

---

## 🛠️ Tasks (WIP)

This section is under construction and evolves during prototyping.

Use these notes to guide new features and maintain context across changes.

- **Add new Todo field**

`index.html`, `app.js`, `mock-api.js`, update backend if real auth is used

- **Enable Cognito Auth**

Toggle `authEnabled: true` in `project-config.js`, check `auth.js`, `callback.html`

- **Write a test**

Create file in `tests/backup/unit/` or `integration/`, use vanilla Node assert()

- **Deploy**

Run `./deploy.sh` from `/scripts`; stack choice depends on `authEnabled`
