Developer Guide - Minimalist TODO

Updated: June 2025

This guide outlines development conventions, architectural structure, and best practices for working with the Minimalist TODO application.

⸻

Overview

Minimalist TODO is a modular, serverless web app template leveraging the AWS ecosystem with a strong emphasis on:
• 🔹 Simplicity over cleverness
• 🔹 Consolidated templates and folder discipline
• 🔹 Zero runtime dependencies (where possible)
• 🔹 Fast build and deploy via Makefile + ESBuild

⸻

Tech Stack

Backend
• AWS Lambda
• Amazon DynamoDB (single-table design)
• Amazon API Gateway (HTTP v2)
• AWS SAM (one consolidated template.json)
• ESBuild (output to infra/dist) for bundling per domain

Frontend
• Vanilla JS, HTML, CSS (no framework)
• Hosted via S3 + CloudFront (multi-env ready)

⸻

Project Structure

infra/
domains/
auth/
index.js → Lambda entrypoint (bundled)
src/
controller.js → Handles routeKey dispatch
service.js → Business logic
repository.js → DynamoDB access layer
utils/
validation.js
users/
todos/
\_shared/
services/ → Shared cross-domain services
utils/ → Helpers, logger, cors, etc.
template.json → All infrastructure defined here
frontend/
js/, css/, index.html → Static web client
scripts/
build.js → ESBuild bundler for each domain
README.md
README-DEV.md → This file
Makefile → Dev workflow automation

⸻

Dev Patterns

1. Lambda Routing

Each Lambda dispatches based on event.routeKey (e.g., "POST /auth/signup"). Route handlers live in src/controller.js.

2. Function Segmentation
   • One Lambda per resource (auth, todos, users, etc.)
   • Each has its own index.js
   • Shared logic goes in \_shared/

3. Shared Modules

All shared utilities and services live under:

infra/domains/\_shared/

These are consumed via absolute imports like:

import { logInfo } from "infra/domains/\_shared/utils/logger.js";

4. ES Modules

All code uses native ESM syntax (import / export). Each Lambda domain is bundled via ESBuild into infra/dist/<domain>.

⸻

Build & Deploy

Build Functions

make build

This uses scripts/build.js to run ESBuild on each domain.

Deploy with SAM

make deploy-dev
make deploy-stage
make deploy-prod

Each runs build → SAM deploy. You can configure environments in the Makefile.

⸻

DynamoDB Design

All data is stored in a single DynamoDB table using composite keys:

| PK            | SK                | Notes              |
| ------------- | ----------------- | ------------------ |
| USER#<email>  | USERPROFILE       | One user profile   |
| USER#<email>  | VERIFICATION#<id> | One-time codes     |
| USERID#<ulid> | GSI1              | GSI lookup by ULID |
| TODO#<ulid>   | TODO              | Todo item          |

Each item type uses its own prefix and secondary index strategy, as defined in constants.js.

⸻

Debugging Tips
• Run individual Lambdas locally using sam local invoke
• Add console.log(event) at the top of index.js
• Use make logs NAME=auth to tail logs

⸻

Utilities

To sync shared code (if needed in other projects):

make sync-utils-shared

(This is not needed inside Minimalist TODO itself anymore since all modules import from \_shared/ directly.)

⸻

Contributions

Follow existing structure. Keep changes modular. Run make build and test before commit.

Questions? Use README-AI-prompt.md to understand core design constraints.
