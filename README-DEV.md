# Developer Guide: Minimalist Todo Backend

This document outlines the architecture patterns, conventions, and DynamoDB single-table design strategies used across the backend domains. It is designed to persist knowledge beyond the code itself.

---

## Developer Code Sharing with AI

When sharing code with AI assistants, use this command to generate a complete codebase snapshot:

```bash
repomix . \
 --style plain \
 --compress \
 --output-show-line-numbers \
 --header-text "Forget all previous project files. Only use the zip file I'm uploading now as the sole source of truth." \
 -o ~/Desktop/repomix-output-minimalist-todo.txt
```

---

## JWT Setup (One-time per Environment)

Each environment requires a JWT secret stored in AWS Systems Manager:

```bash
aws ssm put-parameter \
 --name "/minimalist-todo/jwt-secret" \
 --value "$(openssl rand -base64 32)" \
 --type "SecureString" \
 --profile <environment> \
 --region <region>
```

This is referenced in the auth Lambda function environment variables.

---

## 🔁 Shared Backend Architecture

### Template Strategy

- All Lambda functions are declared in a **single consolidated SAM template**: `infra/template.json`
- Each domain lives under `infra/domains/<resource>/`
- All functions share the same **HTTP API Gateway**
- Shared utilities live in `infra/domains/utils-shared/` and are **duplicated per domain** at build time

### API Gateway Version

This project uses `AWS::Serverless::HttpApi` (API Gateway **v2.0**):

- All Lambda `event` routing is based on `event.routeKey` (e.g., `"POST /auth/login"`)
- Do **not** use `event.httpMethod` or `event.path` — those are v1.0 patterns
- CORS is handled via shared utility wrapper functions

**Routing Pattern:**

```js
if (event.routeKey === "POST /auth/signup") return signupHandler(event);
if (event.routeKey === "POST /auth/verify-signup")
  return verifySignupHandler(event);
if (event.routeKey === "POST /auth/login") return loginHandler(event);
```

---

## 🗂 Domain Structure Convention

Each resource-based domain follows this structure:

```text
domains/
├── utils-shared/             # Shared utilities (source of truth)
└── <resource>/
    ├── index.js              # Lambda handler entry point
    ├── package.json          # Dependencies (currently just ulid)
    └── src/
        ├── controller.js     # Route dispatcher using event.routeKey
        ├── service.js        # Domain logic
        ├── repository.js     # DynamoDB read/write access
        ├── utils/            # Resource-specific utilities
        │   ├── constants.js  # Domain constants
        │   └── validation.js # Domain validation
        └── utils-shared/     # Copied from top-level utils-shared
            ├── cors.js       # CORS handling
            ├── dynamodb.js   # DynamoDB utilities
            ├── helpers.js    # Common utilities
            └── logger.js     # Centralized logging
```

### Shared Utilities Strategy

- Source files live in `infra/domains/utils-shared/`
- Copied to each domain's `src/utils-shared/` before deployment
- Use `make sync-utils-shared` to update all domains
- No symlinks - actual file duplication for Lambda packaging

---

## 🧩 Constants Pattern

All hardcoded keys, prefixes, and enum-like values must be declared in domain-specific `utils/constants.js`. Examples:

```js
// Auth domain constants
const USER_PREFIX = "USER#";
const VERIFICATION_CODE_PREFIX = "VERIFICATION#";
const EMAIL_PREFIX = "EMAIL#";
const USER_STATUS_PENDING = "PENDING";
const USER_STATUS_ACTIVE = "ACTIVE";

// Export patterns
module.exports = {
  // Prefixes
  USER_PREFIX,
  VERIFICATION_CODE_PREFIX,
  EMAIL_PREFIX,

  // Statuses
  USER_STATUS_PENDING,
  USER_STATUS_ACTIVE,

  // Validation arrays
  VALID_STATUSES: [USER_STATUS_PENDING, USER_STATUS_ACTIVE],
};
```

---

## 🛠 DynamoDB: Single-Table Design

All business entities share a common table (`MainTable`) using **compound primary keys**:

- `PK`: Encodes the entity type and logical identifier
- `SK`: Defines the sort order and entity subtype
- `GSI1PK/GSI1SK`: Global Secondary Index for alternative access patterns
- `TTL`: Numeric timestamp for automatic item expiration (where applicable)

### Key Design Principles

- Entity relationships are encoded using key patterns
- Access patterns drive table design, not entities
- Use sparse indexes (GSI) for optional lookups
- Leverage TTL for self-expiring data (verification codes)

---

## 🔐 Auth Domain Pattern

Implements email/password signup with email verification and JWT tokens.

### Table Design

**User entities (after verification):**

- `PK`: `USER#<ulid>`
- `SK`: `PROFILE`
- `GSI1PK`: `EMAIL#<email>` (for email lookups)
- `GSI1SK`: `LOOKUP`

**Verification codes (during signup):**

- `PK`: `USER#<email>` (temporary, email-based)
- `SK`: `VERIFICATION#<ulid>`
- `TTL`: Numeric UNIX timestamp for auto-expiration

### Access Patterns

- **Create verification code**: Put item with TTL
- **Get latest verification code**: Query PK=`USER#<email>`, SK begins_with `VERIFICATION#`, limit 1, descending
- **Get user by email**: Query GSI1 where GSI1PK=`EMAIL#<email>`
- **Get user by ID**: Query PK=`USER#<ulid>`, SK=`PROFILE`

### Implementation Notes

- New users start in `PENDING` status during verification
- Email verification creates user with `ACTIVE` status and ULID-based PK
- JWT tokens contain user ULID as subject
- Password hashing uses Node.js built-in crypto (pbkdf2)

---

## 👤 Users Domain Pattern

Implements user management (CRUD) with role-based access control.

### Table Design

- `PK`: `USER#<ulid>`
- `SK`: `PROFILE`
- `GSI1PK`: `EMAIL#<email>` (inherited from auth pattern)
- `GSI1SK`: `LOOKUP`

### Access Patterns

- **Get user by ID**: Query PK=`USER#<ulid>`, SK=`PROFILE`
- **Get user by email**: Query GSI1 where GSI1PK=`EMAIL#<email>`
- **List all users**: Query where PK begins_with `USER#` and SK=`PROFILE`
- **Update user**: UpdateItem with conditional checks

### Business Rules

- Email uniqueness enforced via GSI1PK
- Role validation against allowed values (`USER`, `ADMIN`)
- Status validation against allowed values (`PENDING`, `ACTIVE`, `INACTIVE`)

---

## 📋 TODO Domain Pattern

Implements user-scoped TODO management.

### Table Design

- `PK`: `USER#<user_ulid>` (groups all user data)
- `SK`: `TODO#<todo_ulid>`

### Access Patterns

- **List user's TODOs**: Query PK=`USER#<user_ulid>`, SK begins_with `TODO#`
- **Get specific TODO**: Query PK=`USER#<user_ulid>`, SK=`TODO#<todo_ulid>`
- **Create TODO**: PutItem with generated ULID
- **Update TODO**: UpdateItem with conditional existence check
- **Delete TODO**: DeleteItem

### Data Isolation

- TODOs are automatically scoped to user via PK pattern
- No cross-user data access possible through table design
- User ID extraction from JWT or temporary fallback headers

---

## 📦 Utility Strategy

### utils-shared/ Components

**helpers.js** - Common utilities across all domains:

- `generateULID()` - Unique identifier generation
- `getCurrentTimestamp()` - ISO timestamp
- `parseBody()` - JSON body parsing with error handling
- `errorResponse()` / `successResponse()` - Standard HTTP responses
- `isValidEmail()` / `isValidULID()` - Format validation
- `sanitizeString()` - Input sanitization

**dynamodb.js** - DynamoDB operation wrappers:

- `putItem()` - Put with optional conditions
- `getItem()` - Simple get operations
- `updateItem()` - Update with error handling
- `deleteItem()` - Delete operations
- `listItems()` - Query with PK and optional SK prefix
- `queryGSI()` - Global Secondary Index queries

**cors.js** - CORS handling:

- `withCors()` - Higher-order function wrapper
- `addCorsHeaders()` - Add headers to responses
- `handleOptions()` - OPTIONS request handling
- `isOptionsRequest()` - Request type detection

**logger.js** - Centralized logging:

- `logInfo()` / `logError()` / `logWarning()` - Structured logging
- Consistent timestamp and context formatting

### Domain-Specific Utils

**constants.js** - Domain constants and enums
**validation.js** - Input validation and sanitization specific to domain

### Dependency Strategy

- **Zero external dependencies** in Lambda runtime
- Only `ulid` package for ID generation
- Node.js built-ins for all other functionality
- No bundling or compilation required

---

## 🔄 Request Flow Pattern

### Standard Flow

```
HTTP Request → API Gateway → Lambda Handler (index.js)
  ↓
Controller (route based on event.routeKey)
  ↓
Service (business logic and validation)
  ↓
Repository (DynamoDB operations)
  ↓
Response (JSON with CORS headers)
```

### Error Handling Strategy

- Controllers catch all errors and return standard error responses
- Services throw descriptive error messages
- Repositories log errors with context
- CORS wrapper ensures headers on all responses

### Authentication Integration

- JWT tokens validated by HTTP API Gateway (when configured)
- User ID extracted from JWT claims or fallback headers
- All operations scoped to authenticated user

---

## 💡 Development Guidelines

### Adding New Domains

1. Create folder: `infra/domains/<resource>/src/`
2. Implement standard pattern: `index.js` → `controller.js` → `service.js` → `repository.js`
3. Add function definition to `infra/template.json`
4. Run `make sync-utils-shared` to copy shared utilities
5. Follow established DynamoDB key patterns

### Modifying Shared Utilities

1. Edit files in `infra/domains/utils-shared/`
2. Run `make sync-utils-shared` to propagate changes
3. Test across all domains
4. Update this documentation if patterns change

### Testing Strategy

- Use provided test scripts for integration testing
- Manual testing via `scripts/test-*.sh` files
- Local development with `scripts/local-server.js`
- SAM sync for rapid iteration

### Code Quality Standards

- Use consistent error handling patterns
- Follow established naming conventions
- Document business logic in service layer
- Keep repository layer focused on data access
- Validate all inputs at service boundary

---

## 📚 Reference Patterns

The `zpatterns/` directory contains reference examples:

- `dynamodb.md` - Single-table design patterns and examples
- `http-api.txt` - HTTP API Gateway configuration examples
- `secrets.txt` - AWS secrets management patterns
- `step-functions.txt` - State machine examples (for future use)

These are for reference only and represent proven AWS patterns applicable to this architecture.

---

## 🛣️ Extension Roadmap

### Current Architecture Supports

- Additional CRUD resources following established patterns
- Role-based access control extensions
- Real-time features via WebSocket APIs
- Background processing via SQS/Lambda
- File upload via S3 presigned URLs

### Scaling Considerations

- Single-table design scales to millions of items
- Lambda concurrency handles traffic spikes
- HTTP API Gateway has built-in throttling
- DynamoDB auto-scaling handles capacity

### Future Enhancements

- JWT refresh token patterns
- OAuth provider integration
- Multi-tenant data isolation
- Advanced query patterns with GSI

---

**Remember: This architecture prioritizes simplicity and maintainability. When adding complexity, ensure it follows established patterns and provides clear business value.**
