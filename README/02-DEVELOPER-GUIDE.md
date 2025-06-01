# 02-DEVELOPER-GUIDE.md

## Minimalist TODO – Developer Guide

_Last updated: June 2025_

This guide documents conventions and patterns for working on Minimalist TODO – a clean, modular, serverless web application template built entirely on AWS.

---

## 🧠 Core Development Principles

- **Simplicity over cleverness**
- **One Lambda per domain**
- **Zero runtime dependencies**
- **All infrastructure in one SAM template**
- **Direct imports from shared modules**
- **ES modules only (import/export)**

---

## 🛠 Stack Overview

**Backend:**

- AWS Lambda (Node.js 22.x)
- Amazon DynamoDB (single-table)
- Amazon API Gateway (HTTP v2)
- AWS SAM (`infra/template.json`)
- ESBuild → `infra/dist/<domain>` per Lambda

**Frontend:**

- Vanilla JS / HTML / CSS
- Hosted via S3 + CloudFront (multi-env ready)

---

## 📁 Project Layout

```
minimalist-todo/
├── infra/
│   ├── domains/
│   │   ├── auth/
│   │   │   ├── handler.js
│   │   │   ├── service.js
│   │   │   └── utils/
│   │   ├── users/
│   │   ├── todos/
│   │   └── _shared/
│   │       ├── utils/       # helpers, logger, cors
│   ├── dist/                # ESBuild outputs per domain
│   └── template.json        # SAM template for all backend infra
├── frontend/
│   └── js/, css/, html/
├── scripts/
│   └── build.js             # ESBuild bundler
├── Makefile
└── samconfig.toml
```

---

## 🔁 Code Patterns

### 1. Lambda Routing

Each Lambda uses a single entrypoint (`handler.js`) and routes based on:

```js
if (event.routeKey === "POST /auth/signup") { ... }
```

Avoid `event.httpMethod` or `event.path`.

### 2. Modular Functions

- One Lambda per business domain (`auth`, `users`, `todos`, etc.)
- All business logic lives in `service.js`
- Utility files (like `email.js`, `jwt.js`, `logger.js`) are in `utils/`

### 3. Shared Code

Shared code is imported directly:

```js
import { logInfo } from "infra/domains/_shared/utils/logger.js";
```

No copying or syncing is needed.

### 4. ES Module Syntax

All code uses native `import/export`. No CommonJS.

---

## ⚙️ Build & Deploy

### 🔨 Build (ESBuild)

```bash
make build
```

- Uses `scripts/build.js`
- Bundles all domains to `infra/dist/*`

### 🚀 Deploy (SAM)

```bash
make deploy-dev     # dev environment
make deploy-stage   # staging
make deploy-prod    # production
```

Each deploy will:

1. Run `make build`
2. Package via SAM
3. Deploy using env-specific settings in `samconfig.toml`

---

## 🗃️ DynamoDB Design

Single-table pattern using partition/sort keys:

| PK           | SK                  | Description  |
| ------------ | ------------------- | ------------ |
| USER#<email> | USERPROFILE         | User profile |
| USER#<email> | VERIFICATION#<ulid> | OTP code     |
| USER#<email> | TODO#<ulid>         | Todo item    |

GSI1 is used for some cross-lookups.

Item formats are defined in shared `constants.js`.

---

## 🧪 Debugging

- Use `console.log(event)` to debug inputs
- Tail logs via:

```bash
make logs NAME=auth
```

- Run handlers locally with:

```bash
sam local invoke -e event.json
```

---

## 🧼 Cleanups

To delete deployed resources:

```bash
make delete-dev
```

---

## 📌 Contributions

- Match existing file structure
- Keep PRs minimal and modular
- Follow the rules in `00-AI-SYSTEM-PROMPT.md`

---

## 🧭 Start Here

If you're new, start with:

- `00-AI-SYSTEM-PROMPT.md` – architectural guardrails for AI/humans
- `01-ARCHITECTURE.md` – system design overview

Then explore `infra/` and `Makefile` for real examples.
