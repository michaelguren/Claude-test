
# Makefile for Minimalist Todo Deployment

APP_NAME ?= minimal-todo
ENV ?= dev
AWS_REGION ?= us-east-1

.PHONY: deploy backend frontend

deploy: backend frontend

backend:
	@echo "Deploying backend to $(ENV) in $(AWS_REGION)..."
	APP_NAME=$(APP_NAME) ENV=$(ENV) AWS_REGION=$(AWS_REGION) ./scripts/aws-infra/deploy-backend.sh

frontend:
	@echo "Deploying frontend to $(ENV) in $(AWS_REGION)..."; \
	APP_NAME=$(APP_NAME) ENV=$(ENV) AWS_REGION=$(AWS_REGION) ./scripts/aws-infra/deploy-frontend.sh