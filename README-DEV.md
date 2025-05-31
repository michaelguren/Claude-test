# Developer Guide: Minimalist Todo Backend

This document outlines the architecture patterns, conventions, and DynamoDB single-table design strategies used across the backend domains. It is designed to persist knowledge beyond the code itself.

---

## Developer to Share Code with AI (always keep this in here when re-drafting this file)

```
repomix . \
 --style plain \
 --compress \
 --output-show-line-numbers \
 --header-text "Forget all previous project files. Only use the zip file I'm uploading now as the sole source of truth." \
 -o ~/Desktop/repomix-output-minimalist-todo.txt
```

## JWT Setup (one-time per Account [we are using AWS accounts for environments])

```
aws ssm put-parameter \
 --name "/minimalist-todo/jwt-secret" \
 --value "$(openssl rand -base64 32)" \
 --type "SecureString" \
 --profile dev \
 --region us-east-1
```

## 🔁 Shared Backend Architecture

- All Lambda functions are declared in a **single consolidated SAM template**: `infra/template.json`
- Each domain lives under `infra/domains/<resource>/`
- All functions share the same **HTTP API Gateway**
- Shared utilities live in `infra/domains/utils-shared/` and are **duplicated per domain** at build time

### 🔑 API Gateway Version

This project uses:

- `AWS::Serverless::HttpApi` (API Gateway **v2.0**).
- All Lambda `event` routing is based on `event.routeKey` (e.g., `"POST /auth/login"`).
- Do **not** use `event.httpMethod` or `event.path` — those are unreliable or missing under v2.0.
- See [API Gateway HTTP API event format 2.0](https://docs.aws.amazon.com/lambda/latest/dg/urls-event.html) for details.

**Routing Pattern:**

````js
if (event.routeKey === "POST /auth/register") return registerHandler(event);

---

## 🗂 Domain Structure Convention

Each resource-based domain follows this structure:

```text
domains/
└── <resource>/
    ├── index.js              # Lambda handler
    └── src/
        ├── controller.js     # Route dispatcher using event.routeKey
        ├── service.js        # Domain logic
        ├── repository.js     # DynamoDB read/write access
        ├── utils/            # Resource-specific utilities
        └── utils-shared/     # Copied from top-level utils-shared (no symlinks)
````

---

## 🧩 Constants

All hardcoded keys, prefixes, and enum-like values must be declared in `utils-shared/constants.js`. Examples:

```js
USER_PREFIX = "USER#";
VERIFICATION_CODE_PREFIX = "VERIFICATION#";
USER_PROFILE_SUFFIX = "PROFILE";
USER_STATUS_PENDING = "PENDING";
USER_STATUS_ACTIVE = "ACTIVE";
```

---

## 🛠 DynamoDB: Single-Table Design

All business entities share a common table (`MainTable`) using **compound primary keys**:

- `PK`: Encodes the entity type and logical identifier (e.g., `USER#mguren@mac.com`)
- `SK`: Defines the sort order and entity subtype (e.g., `PROFILE`, `VERIFICATION#<ulid>`)

Each domain defines its own key patterns and access strategies.

---

## 🔐 AuthFunction Pattern

Implements passwordless signup using email + OTP, with a future path toward Passkeys. Taking patterns from: https://firtman.github.io/authentication/

### Table Design

- `PK`: `USER#<email>`
- `SK` options:
  - `PROFILE` → one record per user
  - `VERIFICATION#<ulid>` → one-time codes with expiration

### Patterns

- New users are created with `status = PENDING`
- Email verification codes are stored as separate items under the same PK
- DynamoDB native TTL is used with a numeric `TTL` attribute
- The latest code is retrieved via:
  - `begins_with(SK, 'VERIFICATION#')`
  - `ScanIndexForward: false`
  - `Limit: 1`

---

## 👤 UsersFunction Pattern

Implements basic user management (CRUD) by email-based ULID identifiers.

### Table Design

- `PK`: `USER#<ulid>`
- `SK`: `PROFILE`

### Patterns

- `GSI1` is used for email lookups
  - `GSI1PK = EMAIL#<email>`
  - `GSI1SK = LOOKUP`
- User creation ensures email uniqueness
- All user-facing updates (PUT) are validated and sanitized

---

## 📦 Utility Strategy

### utils-shared/

All reusable logic across domains should be placed in `infra/domains/utils-shared/`:

- `helpers.js` → ULID, timestamp, body parsing, response formatting
- `logger.js` → standard log formatting
- `dynamodb.js` → convenience wrappers for native commands

> Note: utils-shared **must not import NPM packages**. It is duplicated per domain before deployment using `make sync-utils-shared`.

---

## 📋 Deployment Flow

### Commands

- `make deploy` → Deploy backend + frontend
- `make deploy-backend` → SAM deploy only
- `make sync-utils-shared` → Re-copy shared utils to all active domains

### Environments

Each environment (dev, stage, prod) uses a separate AWS account with independent IAM/SAM stacks.

---

## 💡 Design Principles

- ❌ No nested SAM templates
- ✅ One Lambda per domain (not per endpoint)
- ✅ Route dispatch is handled in `controller.js` using `event.routeKey`
- ✅ All state and business behavior is driven by DynamoDB patterns, not third-party dependencies
- ✅ Keep READMEs focused on durable strategies, not transient implementation detail

---
