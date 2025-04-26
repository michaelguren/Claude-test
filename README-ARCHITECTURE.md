---
type: STRATEGIC_ARCHITECTURE
scope: GLOBAL
importance: HIGH
project_independent: TRUE
author: "Michael Guren (with Claude AI assistance)"
creation_date: "April 2025"
updated_date: "April 2025"
ai_guidance: "This document contains foundational architectural principles and strategic decisions that apply across all projects. It is not project-specific and should inform all implementation decisions."
---

# Minimalist Cloud Architecture

## Origin Story & Philosophy

This architecture was born from the frustration of a pharmacist-turned-developer who built successful applications only to be forced into constant rebuilds due to changing frameworks, dependencies, and technologies.

The experience with two specific applications crystallized this frustration:

1. **Pocket Pharmacist (iOS, 2010)**: Despite being a successful app generating $100,000/year, it has required constant maintenance and updates due to Apple's ecosystem. Every single year brought breaking changes in either the Swift language or iOS SDK requiring code updates. At one point, Apple completely changed the development language from Objective-C to Swift, forcing a massive rewrite.

2. **LTCC (2005)**: A long-term care communication system for a Connecticut pharmacy that has required rebuilding twice in 15 years due to technology changes.

The stark contrast became clear: While iOS development demanded constant updates from 2009-2025, the core web technologies (HTML, CSS, JavaScript) remained remarkably stable during the same period. A website built with vanilla web technologies in 2010 would still work perfectly today, while an iOS app from the same era would be completely non-functional without major updates.

After being asked to rebuild the LTCC application for the second time (with a $10,000 budget), a fundamental question emerged: **How can we build software that truly stands the test of time?**

The answer came through a critical insight: **Advanced AI assistants fundamentally change the equation of software development.** While most developers use AI to write more complex code with more dependencies, our approach recognizes that AI enables a return to simplicity.

### The Core Insight

With an AI partner that can easily create and maintain vanilla code, we no longer need frameworks and libraries to manage complexity. The traditional tradeoff between simplicity and capability disappears. We can have both:

- Simple, dependency-free code
- Modern, capable applications
- Reduced maintenance burden
- Extended application lifespan

This approach isn't just about technical preferences—it's about recognizing a paradigm shift in how software can be built in the AI era.

## Architectural Principles

### 1. Minimal Dependencies

- **Zero External Frontend Frameworks**: No React, Vue, Angular, or other frontend frameworks
- **Vanilla Web Technologies**: Pure HTML, CSS, and JavaScript
- **Micro-Utilities Over Libraries**: Custom micro-utilities (<100 lines) instead of external libraries
- **No Build Process**: Direct browser execution without transpilers, bundlers, or preprocessors
- **No Tailwind or CSS Frameworks**: Plain CSS for maximum longevity

### 2. Cloud Integration Strategy

- **AWS as Primary Platform**: Leveraging AWS's proven longevity and stability
- **Managed Services First**: Prefer managed services over custom infrastructure
- **VTL for Direct Integration**: Use Velocity Template Language for API Gateway to DynamoDB
- **Minimal Lambda Usage**: Use Lambda functions only when absolutely necessary
- **S3 for Static Hosting**: Simple, stable hosting for frontend assets
- **CloudFormation for Infrastructure**: JSON-based templates for reliable infrastructure as code
- **Nested Stacks for Modularity**: Main template orchestrating component-specific templates

### 3. Data Persistence Approach

- **DynamoDB as Primary Database**: NoSQL with proven stability and scalability
- **Single-Table Design**: Optimize for access patterns with GSIs
- **User-Specific Data Model**: Partition key based on userId for data isolation
- **Global Tables for Replication**: Multi-region resilience
- **Events via Streams**: Process data asynchronously through DynamoDB Streams
- **S3 for Content Storage**: Immutable content storage when appropriate

### 4. API Design

- **API Gateway with VTL**: Direct integration to DynamoDB without Lambda where possible
- **REST-Based Interfaces**: Standard HTTP methods and resource-oriented design
- **Unified PUT Pattern**: Using PUT with operation field for all operations
- **Asynchronous Processing Model**: Store first, process via streams
- **AppSync Considerations**: Avoiding GraphQL/AppSync in favor of simpler REST APIs with proven longevity
  - GraphQL adds schema definitions and resolvers that could change over time
  - REST has demonstrated decades of stability and simplicity
  - Our minimalist approach favors technologies with proven track records

### 5. Authentication Strategy

- **Cognito Hosted UI**: Leverage AWS's managed authentication experience for AWS-hosted environments
- **Mock Authentication for Local Development**: Skip Cognito authentication flow in local development
- **Environment-Specific Authentication**:
  - **Local**: Use mock authentication that bypasses Cognito completely
  - **AWS (DEV/STAGING/PROD)**: Use real Cognito authentication with environment-specific configurations
- **Passkey Support**: Modern, passwordless authentication for enhanced security
- **Token-Based API Access**: JWT tokens validated via API Gateway authorizers
- **Per-User Data Isolation**: User identity as partition key for secure data access
- **Zero Auth Dependencies**: Pure vanilla JS for token handling and storage

### 6. What We Explicitly Avoid

- **Frontend Frameworks**: No React, Vue, Angular, or similar
- **CSS Frameworks**: No Tailwind, Bootstrap, or similar
- **Build Tools**: No webpack, Babel, or similar
- **Package Managers**: Minimal npm usage, no complex dependency trees
- **Server Frameworks**: No Express, NestJS, or similar
- **ORMs**: No complex data mapping layers
- **CI/CD Complexity**: Simple deployment scripts over complex pipelines
- **YAML for Infrastructure**: Using JSON for CloudFormation due to its explicit syntax and reliability
- **Optional/Conditional Resources**: Keeping infrastructure templates simple and explicit

## CloudFormation Strategy

Our approach to infrastructure as code emphasizes simplicity, reliability, and explicit declarations:

### 1. JSON Over YAML

- **Explicit Structure**: JSON's strict syntax makes templates more predictable
- **No Whitespace Issues**: Avoiding YAML's whitespace sensitivity
- **Better IDE Support**: More consistent tooling support
- **No Ambiguity**: Clear delineation of strings, numbers, and booleans

### 2. Nested Stack Architecture

- **Main Stack Pattern**: A parent stack that orchestrates component stacks
- **Component Modularity**: Separate templates for frontend, data, auth, and API
- **Cross-Component References**: Outputs and exports for resource sharing
- **Incremental Deployment**: Deploy individual components or the entire stack

### 3. Deployment Automation

- **Simple Shell Scripts**: Bash scripts for reliable deployments
- **Environment Awareness**: dev/prod environment support
- **Multi-Account Strategy**: Support for separate AWS accounts per environment
- **Complete Cleanup**: Tools for removing all resources including non-empty S3 buckets

## Authentication Implementation

Our authentication approach prioritizes security, simplicity, and longevity:

### 1. Cognito Hosted UI with Passkeys

- **Zero Dependencies**: No authentication libraries or frameworks
- **Hosted UI Experience**: AWS-managed login screens reduce implementation burden
- **Passkey Support**: Modern, phishing-resistant authentication
- **Multi-Environment Strategy**: Works across local, dev, and prod environments

### 2. Token Management

- **JWT Validation**: API Gateway validates tokens without custom code
- **Secure Storage**: Browser-based secure token storage
- **Auto-Refresh Logic**: Simple token refresh implementation
- **User-Specific APIs**: All data operations tied to authenticated user context

### 3. Local Development Mode

- **Mock Authentication**: Required mock auth for local development
- **Authentication Strategy**:
  - **LOCAL (localhost)**: Always use mock authentication for sign-in
  - **AWS-hosted (DEV/STAGING/PROD)**: Always use real Cognito authentication
- **Simplified Local Testing**: Focus on validating UI functionality with mock user context
- **Environment Detection**: Automatic detection and configuration based on URL

## AI's Critical Role

This architecture is fundamentally enabled by AI assistance. While traditional development approaches needed frameworks and libraries to manage complexity, our AI partnership allows us to:

1. **Write and maintain vanilla code** at scale without cognitive overload
2. **Create custom micro-utilities** instead of importing libraries
3. **Implement custom functionality** without increasing long-term maintenance burden
4. **Debug and test** efficiently without testing frameworks
5. **Update code** when needed without dependency conflicts

The AI doesn't just help write code—it fundamentally changes what's possible with a minimalist approach. This is not about avoiding modern capabilities, but about implementing them in the most direct, dependency-free way possible.

## Business Objectives

This architecture serves specific business goals:

1. **Eliminate Annual Maintenance Burden**: End the cycle of yearly updates forced by framework and language changes
2. **Longevity**: Create applications that remain functional for 10+ years without major rewrites
3. **Cost Efficiency**: Reduce ongoing maintenance costs through simplicity
4. **Expansion**: Enable the pharmacy app (LTCC) to operate reliably for another decade
5. **Cross-Platform Growth**: Rebuild Pocket Pharmacist (currently generating $100k/year on iOS only) to expand to Android and web without maintaining separate codebases for each platform
6. **Focus on Value**: Spend development time on adding features users want rather than keeping up with technology changes

## Folder Structure

```
/
├── frontend/             # Static web assets
│   ├── index.html        # Main HTML file
│   ├── callback.html     # Authentication callback handler
│   ├── css/              # CSS stylesheets
│   ├── js/               # JavaScript files
│   │   ├── app.js        # Application logic
│   │   ├── auth.js       # Authentication module
│   │   ├── api.js        # API client
│   │   └── [micro-utilities]/ # Custom minimal utilities
│   └── assets/           # Static assets
├── backend/
│   ├── cloudformation/   # CloudFormation templates (JSON)
│   │   ├── main.json     # Main stack template
│   │   ├── frontend.json # Frontend infrastructure
│   │   ├── auth.json     # Authentication resources
│   │   ├── data.json     # Data resources
│   │   └── api.json      # API resources
│   └── api/
│       └── mappings/     # VTL templates for API Gateway
├── scripts/              # Deployment and utility scripts
│   ├── deploy.sh         # Multi-environment deployment
│   ├── delete-stack.sh   # Stack deletion
│   ├── verify-deployment.js # Deployment verification
│   └── local-server.js   # Local development server
└── tests/                # Testing framework and tests
    ├── unit/             # Unit tests
    ├── integration/      # Integration tests
    └── e2e/              # End-to-end tests
```

## AWS Services

Our architecture primarily leverages these stable AWS services:

- **S3**: Static website hosting (proven stable since 2006)
- **CloudFront**: Content delivery with global CDN

  - Origin Access Control for S3 security
  - Custom error responses for SPA routing
  - HTTPS by default with CloudFront domain
  - Long-term caching with proper invalidation

- **Cognito**: User authentication and management

  - Hosted UI with passkey support
  - JWT tokens for API authorization
  - Email verification and account recovery
  - Multi-environment configuration

- **API Gateway**: RESTful API endpoints

  - VTL templates for direct integration
  - Cognito authorizer for token validation
  - User context in mapping templates
  - Minimal Lambda functions
  - Standard request/response patterns

- **DynamoDB**: NoSQL database

  - Single-table design for efficient access
  - User-specific data using userId partition key
  - On-demand capacity for cost optimization
  - Proven stability since 2012

- **DynamoDB Streams**: For data change events and basic event processing
- **EventBridge**: For complex cross-service workflows (used selectively)
- **Lambda**: Serverless computing (minimal usage)
- **CloudFormation**: Infrastructure as code
  - JSON templates for reliability
  - Nested stacks for modularity
  - Cross-stack references
- **Route 53**: DNS and routing (optional)

### Event Processing Strategy

We use a tiered approach to event processing:

1. **DynamoDB Streams** (Primary): For direct data change events and simple processing

   - Tightly integrated with our primary data store
   - Simpler configuration with guaranteed ordering
   - Built-in retry logic and direct connection to data changes

2. **EventBridge** (Secondary): Used selectively for more complex scenarios
   - Complex cross-service workflows
   - Events needing distribution to multiple targets
   - When sophisticated event filtering/transformation is required

This dual approach maintains our minimalist philosophy for the core data flow while allowing flexibility for more complex integration scenarios when truly needed.

## Testing Philosophy

Testing follows the same minimalist principles:

- **Zero-Dependency Testing**: Custom minimal testing framework
- **Readable Tests**: Clear, self-documenting test structure
- **Comprehensive Coverage**: Unit, integration, API, and E2E tests
- **Deployment Verification**: Test AWS infrastructure post-deployment

## Monorepo Approach

We use a monorepo structure to:

- Maintain a single source of truth
- Ensure frontend and backend stay in sync
- Simplify deployment processes
- Provide better context for AI assistance

## Benefits of This Approach

1. **End the Yearly Update Cycle**: Escape the treadmill of mandatory updates from OS vendors and framework creators
2. **Extended Lifespan**: Applications built on this architecture can function for 10+ years without major rewrites
3. **Cross-Platform by Default**: Build once, run anywhere with browser support
4. **Reduced Maintenance Burden**: Minimal dependencies mean fewer breaking changes
5. **Simplified Reasoning**: Easier to understand the entire system
6. **Performance**: Direct browser execution without framework overhead
7. **Cost Efficiency**: Pay-per-use model with minimal compute costs
8. **Future-Proofing**: Core web technologies have demonstrated exceptional backward compatibility

## Implementation Guidelines

1. When faced with a choice between:

   - A dependency vs. custom code → Choose custom code (AI can maintain it)
   - Lambda vs. direct integration → Choose direct integration
   - Complex solution vs. simple solution → Choose simplicity
   - YAML vs. JSON → Choose JSON for explicit syntax
   - Conditional resources vs. explicit resources → Choose explicit resources

2. Ask: "Will this approach still work in 10 years?" If not, reconsider.

3. For each feature, implement the simplest solution that works directly in the browser without intermediaries.

4. Use progressive enhancement: core functionality works without JS, enhanced with JS.

5. Document decisions and rationales clearly for future reference.

## Comparison to Traditional Approaches

| Traditional Approach              | Our Approach                   | Advantage                                |
| --------------------------------- | ------------------------------ | ---------------------------------------- |
| Native mobile apps (Swift/Kotlin) | Web technologies               | No yearly SDK/language updates           |
| React/Vue framework               | Vanilla JS + custom utilities  | No framework updates/migrations          |
| CSS frameworks (Tailwind)         | Pure CSS                       | No class churn or build steps            |
| Complex build pipeline            | Direct browser execution       | Simplified deployment                    |
| External auth libraries           | Vanilla JS + Cognito Hosted UI | Fewer dependencies, managed service      |
| Heavy Lambda usage                | API Gateway + VTL              | Reduced cold starts, better performance  |
| Many dependencies                 | Few/no dependencies            | Fewer security updates, less maintenance |
| Framework-specific authentication | Standard JWT authentication    | Works across all browsers and platforms  |
| Frequent migrations               | Stable architecture            | Longer application lifespan              |
| Multiple codebases for platforms  | Single web codebase            | Update once, works everywhere            |
| YAML for CloudFormation           | JSON for CloudFormation        | Explicit syntax, no whitespace issues    |

## Proven Historical Examples

This approach is inspired by systems that have demonstrated exceptional longevity:

1. **Basic HTML/CSS sites** from the early 2000s still function perfectly in modern browsers
2. **S3** - Has maintained the same API since 2006
3. **DynamoDB** - Has maintained backward compatibility since 2012
4. **HTTP Cookies** - Authentication pattern stable since the 1990s

---

This architecture represents a fundamental rethinking of how applications can be built in the AI era. By embracing simplicity and stability over framework trends, and leveraging AI to manage the complexity that would normally require frameworks, we create applications with vastly extended lifespans and reduced maintenance burdens.
