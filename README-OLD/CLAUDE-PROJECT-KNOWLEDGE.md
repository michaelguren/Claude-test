# Minimalist TODO Application – Project Knowledge

## Architectural Philosophy

This project strictly follows a Minimalist Cloud Architecture designed for maximum longevity, maintainability, and operational simplicity. All solutions must optimize for:

- **Longevity**: Target 10+ years of stable operation without rewrites.
- **Minimalism**: Only the essential features and infrastructure are implemented.
- **Zero External Dependencies**: No frontend frameworks, libraries, package managers, build steps, or server-side frameworks unless absolutely unavoidable.
- **AWS Native Services**: Only use well-established AWS managed services, specifically:
  - S3 (Static hosting)
  - CloudFront (CDN + HTTPS)
  - Cognito (Authentication via Hosted UI, Passkey support)
  - API Gateway (REST APIs with direct VTL mapping to DynamoDB)
  - DynamoDB (Single-table NoSQL design)
  - CloudFormation (Infrastructure as Code, explicit JSON templates)

## Core Principles

- **Frontend**: Pure HTML5, CSS3, and vanilla JavaScript. No React, Vue, Angular, HTMX, Tailwind, Bootstrap, or similar.
- **Infrastructure as Code**: Use plain JSON CloudFormation templates, not YAML, CDK, Terraform, Amplify CLI, or Serverless Framework.
- **Authentication**: Use AWS Cognito Hosted UI. No custom authentication logic.
- **Deployment**: Use simple Bash scripts. No complex CI/CD pipelines unless explicitly justified.
- **Data Persistence**: Single-table DynamoDB design based on known access patterns.
- **Cross-Environment Support**: Separate dev and prod environments. Environment-aware configurations.
- **Explicitness Over Magic**: Prefer explicit parameter passing, outputs, and resource names over implicit discovery or automation magic.
- **Stable Services First**: Only use AWS services/features with at least 5+ years of proven stability and adoption.

## Decision-Making Rules

When assisting with this project:

- Prefer simplicity over cleverness.
- Prioritize solutions that can survive the next decade without forced rewrites, major updates, or framework obsolescence.
- Default to direct AWS managed service integrations (avoid Lambda middle layers unless absolutely necessary).
- Avoid dependency trees. No npm installs, no package managers unless explicitly requested.
- Document any assumptions or decisions if deviating from the minimalist baseline.
- Be cost-aware: solutions should not introduce unnecessary recurring costs.
- Prefer boring, proven technologies over trendy solutions.

If ever faced with two technically viable options, choose the simpler, more explicit, less dependency-heavy one.

## MCP File Server Usage

This project stores critical documentation files in the MCP file server.
Before answering any technical question, recommending a solution, or suggesting changes, always:

- Search and review the following documentation files (if present):
  - README-ARCHITECTURE.md – Strategic architectural principles
  - README.md – Project-specific implementation details
  - README-DEPLOY.md – Deployment procedures
  - Any additional README-\*.md files
- Ensure your response aligns with the principles, standards, and processes described in these files.
- If a conflict exists between standard AWS best practices and the project's README-ARCHITECTURE.md guidelines, prefer the project's documented standards unless explicitly instructed otherwise.
- If no relevant information is found, or if clarification is needed, ask for clarification before assuming architectural decisions.

## Codebase Exploration Directive

In addition to consulting documentation, always proactively explore and understand the following core project folders:

- **backend/cloudformation/**
  - Contains CloudFormation templates in JSON format.
  - Follow explicit, modular nested stack structure.
  - Understand resource definitions, parameters, outputs, and cross-stack references.
- **scripts/**
  - Bash scripts orchestrate deployment (deploy.sh), frontend upload (deploy-frontend.sh), and deletion (delete-stack.sh).
  - Understand deployment flow: upload templates → deploy stacks → sync frontend assets.
- **frontend/js/**
  - Vanilla JavaScript for application logic.
  - Contains custom micro-utilities.
  - No external frontend libraries allowed unless explicitly added.

Always base reasoning on the actual code and structure found in these folders. Respect existing structures and patterns unless there is a critical reason to change. If any information is missing, ask for clarification before making assumptions.

## Conflict Resolution

- If AWS service behavior changes over time (e.g., deprecations, new requirements), prefer adjustments that preserve the project's simplicity, stability, and longevity goals.
- If project documentation and AWS best practices conflict, project documentation wins unless explicitly authorized otherwise.

## Tone and Style of Assistance

- Be direct, structured, and clear.
- Prioritize readability, long-term maintainability, and future-proofing.
- Avoid overly technical jargon unless necessary.
- Be pragmatic and focused on solving real-world deployment and maintenance challenges.
