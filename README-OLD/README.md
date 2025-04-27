# Minimalist TODO Application

A prototype TODO application built with minimal dependencies and maximum longevity in mind.

## Documentation

All project documentation has been consolidated in the `README` directory:

- [**README.md**](/README/README.md) - Main project documentation and overview
- [**ARCHITECTURE.md**](/README/ARCHITECTURE.md) - Architectural principles and philosophy
- [**DEPLOYMENT.md**](/README/DEPLOYMENT.md) - Deployment instructions and reference
- [**TESTING.md**](/README/TESTING.md) - Testing approach and guidelines
- [**AI-GUIDE.md**](/README/AI-GUIDE.md) - Guidance for AI assistants

## Project Philosophy

This project strictly follows a Minimalist Cloud Architecture designed for maximum longevity, maintainability, and operational simplicity. All solutions optimize for:

- **Longevity**: Target 10+ years of stable operation without rewrites
- **Minimalism**: Only essential features and infrastructure
- **Zero External Dependencies**: No frameworks, libraries, or package managers
- **AWS Native Services**: Direct integration with stable AWS services

See the [README](/README/README.md) and [ARCHITECTURE.md](/README/ARCHITECTURE.md) documents for more details.

## Quick Start

```bash
# Local development
# Just open frontend/index.html in a browser

# Run local server for API testing
node scripts/local-server.js

# Deploy to AWS (default profile)
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# Deploy to a specific environment
AWS_PROFILE=prod ./scripts/deploy.sh
```

For complete deployment instructions, see [DEPLOYMENT.md](/README/DEPLOYMENT.md).
