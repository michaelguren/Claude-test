# Makefile for Minimalist Todo Deployment (One AWS Account Per Env) - DRY VERSION

APP_NAME ?= minimalist-todo-20250528
AWS_REGION ?= us-east-1
ENV ?= dev                 # Used as AWS_PROFILE (e.g., dev, prod)
TEMPLATE_PATH = infra/template.json
STACK_NAME = $(APP_NAME)

SAM_DEPLOY_FLAGS = --profile $(ENV) --region $(AWS_REGION) --stack-name $(STACK_NAME) --template-file $(TEMPLATE_PATH) --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND --resolve-s3
AWS_CLI_FLAGS = --profile $(ENV) --region $(AWS_REGION)

.PHONY: deploy deploy-backend deploy-backend-guided delete-backend build-backend deploy-frontend build-frontend delete-frontend help

# Deploy both backend and frontend
deploy: deploy-backend deploy-frontend

build:
	node scripts/build.js
	
# First-time/interactive backend deploy
deploy-backend-guided: build build-backend
	@echo "Guided deploy for backend to AWS profile $(ENV) in $(AWS_REGION)..."
	sam deploy --guided $(SAM_DEPLOY_FLAGS)

# Backend SAM deploy
deploy-backend: build build-backend
	@echo "Deploying backend (SAM) to AWS profile $(ENV) in $(AWS_REGION)..."
	sam deploy $(SAM_DEPLOY_FLAGS)

sync-backend:
	@echo "Starting SAM sync for backend (dev environment)..."
	sam sync --stack-name $(STACK_NAME) --profile $(ENV) --region $(AWS_REGION) --watch --template-file $(TEMPLATE_PATH)

# Delete backend stack
delete-backend:
	@echo "Deleting backend stack $(STACK_NAME) from AWS profile $(ENV)..."
	./scripts/delete-buckets-with-prefix.sh
	aws cloudformation delete-stack --stack-name $(STACK_NAME) $(AWS_CLI_FLAGS)

# Frontend: Deploy static assets using the script
deploy-frontend:
	@echo "Deploying frontend to AWS profile $(ENV) in $(AWS_REGION)..."
	APP_NAME=$(APP_NAME) ENV=$(ENV) AWS_REGION=$(AWS_REGION) ./scripts/deploy-frontend.sh

# Build frontend assets (customize as needed)
build-frontend:
	@echo "Building frontend assets..."
	# Example: npm run build --prefix frontend

# Delete all frontend assets from S3
delete-frontend:
	@echo "Deleting all frontend assets from frontend bucket in AWS profile $(ENV)..."
	FRONTEND_BUCKET_NAME=$$(aws cloudformation describe-stacks \
		--stack-name $(APP_NAME) \
		$(AWS_CLI_FLAGS) \
		--query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
		--output text --no-paginate 2>/dev/null); \
	if [ -z "$$FRONTEND_BUCKET_NAME" ]; then \
	  echo "⚠️  Could not determine frontend bucket name from stack outputs. Skipping asset deletion."; \
	else \
	  echo "Deleting assets in bucket: $$FRONTEND_BUCKET_NAME"; \
	  aws s3 rm s3://$$FRONTEND_BUCKET_NAME --recursive $(AWS_CLI_FLAGS); \
	fi

repomix:
	@echo "Making repomix file"
	repomix . \
		--style plain \
		--compress \
		--output-show-line-numbers \
		--header-text "Forget all previous project files. Only use the zip file I'm uploading now as the sole source of truth." \
		-o ~/Desktop/repomix-output-minimalist-todo.txt
# Help
help:
	@echo "Common Makefile targets:"
	@echo "  make deploy                  # Deploy both backend and frontend"
	@echo "  make deploy-backend          # Deploy backend infra only"
	@echo "  make deploy-backend-guided   # Interactive backend deploy (first time)"
	@echo "  make delete-backend          # Delete backend CloudFormation stack"
	@echo "  make build-backend           # Build backend (if needed)"
	@echo "  make deploy-frontend         # Deploy frontend assets via bash script"
	@echo "  make build-frontend          # Build frontend assets (customize as needed)"
	@echo "  make delete-frontend         # Remove all frontend assets from S3"
	@echo "Variables: APP_NAME=<name> ENV=<aws profile> AWS_REGION=<region>"
	@echo "  (e.g., make deploy ENV=prod)"