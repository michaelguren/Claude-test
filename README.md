# Minimalist TODO App

This project serves as a reference architecture for building serverless web applications on AWS with **minimal dependencies** and **maximum clarity**. It demonstrates a scalable, modular, and modern backend using:

- 🧱 AWS SAM for consolidated infrastructure-as-code
- ⚡️ ESBuild for fast bundling and deployment
- 🗂 Clean domain-based Lambda structure (`auth`, `users`, `todos`)
- 🧩 Shared utilities via direct imports (`_shared/`)
- 🚫 No nested stacks, no frameworks, no runtime dependencies

---

## 🧠 Core Principles

- **Simplicity beats cleverness**
- **ES modules over CommonJS**
- **AWS-native over 3rd-party**
- **Single-table DynamoDB model**
- **Single shared HTTP API Gateway**
- **Functions grouped by resource, not endpoint**

---

## 📁 Project Structure

```
minimalist-todo/
├── infra/
│   ├── domains/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── todos/
│   │   └── _shared/
│   ├── dist/           # ← Compiled Lambda bundles go here
│   └── template.json   # ← Consolidated SAM template
├── scripts/
│   └── build.js        # ← ESBuild bundler script
├── Makefile            # ← Deploy commands
├── samconfig.toml      # ← SAM environment configs
└── README.md
```

---

## ⚙️ Development

### 🛠 ESBuild

All Lambda functions are authored using **ES modules** (`import/export`) and compiled using **ESBuild** into `infra/dist/` before deployment.

We **do not sync shared utils** — instead, they are imported directly via:

```js
import { logInfo } from "infra/domains/_shared/utils/logger.js";
```

### 🔨 Build

```bash
make build
```

- Compiles all `infra/domains/*/index.js` files into `infra/dist/*/index.js`
- Resolves imports from the project root using alias (`infra/...`)
- Marks AWS SDK packages as `external` to avoid bundling them

### 🚀 Deploy

```bash
make deploy-dev     # deploy to dev account
make deploy-stage   # deploy to staging
make deploy-prod    # deploy to production
```

Each deploy command:

1. Runs `make build` to ensure fresh ESBuild output
2. Packages using `sam package`
3. Deploys using environment-specific `samconfig.toml`

---

## 🪵 Routing Pattern

All Lambda handlers use this routing structure:

```js
if (event.routeKey === "POST /auth/signup") {
  return signupHandler(event);
}
```

Avoid `event.httpMethod` or `event.path`. Use `event.routeKey` only.

---

## 🔒 Authentication

Passwordless signup and login are implemented via:

- ✅ Email + OTP for account verification
- 🚧 WebAuthn passkey support planned

---

## 🗃️ Data Model

DynamoDB single-table structure with access patterns like:

- `PK = USER#<email>`, `SK = PROFILE` — user identity
- `PK = USER#<email>`, `SK = VERIFICATION#<ulid>` — OTP code
- `PK = USER#<email>`, `SK = TODO#<ulid>` — user-scoped todos

---

## 🧪 Testing

Tests are defined as shell scripts in `scripts/test-*.sh`. You can run all tests with:

```bash
make test
```

---

## 🧼 Cleanup

To delete all deployed resources:

```bash
make delete-dev
```

---

## 📌 Notes

- This project assumes one shared `HTTP API` across all resources
- Each Lambda function handles one business domain
- Avoids use of frameworks like CDK, Nest.js, or Express
- Shared AWS SDKs are marked as external for bundling

---

## 📣 Contribute

This repo is designed to scale for internal projects. Contributions should follow the core philosophy:

> "If it’s not minimal, it doesn’t belong."
