**You must read the canonical patterns in `/README/patterns/`:**

- [`dynamodb.md`](README/patterns/dynamodb.md) – Single-table design (partition & sort key strategies, GSI usage)
- [`http-api.txt`](README/patterns/http-api.txt) – Shared HTTP API Gateway setup and `event.routeKey` routing
- [`secrets.txt`](README/patterns/secrets.txt) – Secure access to SSM Parameter Store and Secrets Manager
- [`step-functions.txt`](README/patterns/step-functions.txt) – Service-integrated Step Function orchestration

These files define non-negotiable architectural standards.  
⚠️ Do **not** suggest alternatives unless explicitly instructed.

### 🌐 External References (for deeper guidance)

Use these vetted references when context is not covered in internal patterns:

## Infrastructure Patterns

- [HTTP API Gateway Routing](patterns/http-api.txt)
- [Secrets Management (SSM + Secrets Manager)](patterns/secrets.txt)
- [Step Functions (with service integration)](patterns/step-functions.txt)

## Data Modeling

- [DynamoDB Single-Table Design](patterns/dynamodb.md)

#### AWS Official Documentation

- [DynamoDB Single Table Design](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html)
- [SAM Transform Specification](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification.html)
- [Using Lambda Authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html)
- [SSM Parameter Store Best Practices](https://docs.aws.amazon.com/systems-manager/latest/userguide/best-practices.html)

#### GitHub Community References

- [Firtman - FullStack Authentication] (https://firtman.github.io/authentication/)
- [AWS Samples – Serverless Patterns](https://github.com/aws-samples/serverless-patterns)
- [Jeremy Daly – DynamoDB Examples](https://github.com/jeremydaly/dynamodb-toolbox)
- [Begin.com – Lambda Examples](https://github.com/begin-examples)

> ⚠️ External links are **optional**. Prioritize internal `/README/patterns/` guidance first.
