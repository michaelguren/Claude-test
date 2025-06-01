# 01 — ARCHITECTURE OVERVIEW

This project provides a reusable reference architecture for building minimal, maintainable serverless web applications on AWS.

---

## 🔑 Core Philosophy

- **Simplicity over cleverness**
- **AWS-native over 3rd-party**
- **ES modules over CommonJS**
- **Consolidation over fragmentation**
- **One Lambda per resource, not per route**

---

## 🧱 Infrastructure Stack

- **AWS SAM** for infrastructure-as-code (`infra/template.json`)
- **Single shared HTTP API** for all Lambda routes
- **DynamoDB single-table design**
- **No nested stacks**
- **No runtime dependencies**

---

## 🧩 Code Organization

```txt
infra/
├── domains/
│   ├── auth/
│   │   ├── handler.js
│   │   ├── service.js
│   │   └── utils/
│   ├── users/
│   ├── todos/
│   └── _shared/
│       ├── utils/
├── dist/               ← Compiled Lambda bundles (per domain)
├── template.json       ← Consolidated SAM template
```

All domains follow a consistent structure:  
`handler.js → service.js → shared utils or services`

---

## ⚡️ Build + Deploy

- **All Lambdas use ES module syntax**
- **ESBuild** bundles each domain to `infra/dist/<domain>`
- **AWS SDKs** are marked `external` — not bundled

### Build:

```bash
make build
```

### Deploy:

```bash
make deploy-dev    # or deploy-stage, deploy-prod
```

Build always runs first. Deployment uses `samconfig.toml` per environment.

---

## 🧠 Routing Pattern

Handlers use:

```js
if (event.routeKey === "POST /auth/signup") {
  return signupHandler(event);
}
```

🚫 Never use `event.httpMethod` or `event.path`.

---

## 🔐 Auth Flow

- Email-based **OTP signup + verification**
- JWT issued upon successful login
- WebAuthn support planned

---

## 🗃️ Data Design

DynamoDB single-table model with entity prefixes:

| Entity       | PK             | SK                    |
| ------------ | -------------- | --------------------- |
| User Profile | `USER#<email>` | `PROFILE`             |
| OTP Code     | `USER#<email>` | `VERIFICATION#<ulid>` |
| TODO Item    | `USER#<email>` | `TODO#<ulid>`         |

All items are scoped by user.

---

## 🧪 Testing + Cleanup

Run all shell-based integration tests:

```bash
make test
```

Tear down dev stack:

```bash
make delete-dev
```

---

## 🧭 Next Steps

Read:

- `02-DEVELOPER-GUIDE.md` for implementation patterns and code walkthrough
- `03-PATTERNS.md` for data modeling and AWS best practices
