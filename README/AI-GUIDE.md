---
type: AI_ASSISTANT_GUIDANCE
scope: GLOBAL
importance: HIGHEST
project_specific: TRUE
references: "README.md, ARCHITECTURE.md, DEPLOYMENT.md, TESTING.md"
author: "Michael Guren (with Claude AI assistance)"
creation_date: "April 2025"
updated_date: "April 2025"
ai_guidance: "This document is specifically designed for AI assistants to understand the project philosophy, decision-making guidelines, and how to provide the most helpful assistance with this codebase."
---

# AI Assistant Guide to the Minimalist TODO Application

This document provides guidance for AI assistants when working with the Minimalist TODO Application project. It outlines the project's philosophy, key principles, and guidelines for providing assistance.

## Table of Contents
- [Project Overview](#project-overview)
- [Architectural Philosophy](#architectural-philosophy)
- [Decision-Making Guidelines](#decision-making-guidelines)
- [Core Project Structure](#core-project-structure)
- [Key Technical Patterns](#key-technical-patterns)
- [How to Provide Assistance](#how-to-provide-assistance)
- [Conflict Resolution](#conflict-resolution)

## Project Overview

The Minimalist TODO Application is built with a specific architectural philosophy focused on:

- **Longevity**: Target 10+ years of stable operation without rewrites
- **Minimalism**: Only essential features and infrastructure
- **Zero External Dependencies**: No frameworks, libraries, or build steps
- **AWS Native Services**: Direct integration with stable AWS services

As an AI assistant, your role is to help maintain and extend this application while respecting these core principles.

## Architectural Philosophy

This project represents a deliberate rejection of modern frontend frameworks and complex build pipelines in favor of:

- **Pure HTML, CSS, and JavaScript**: No React, Vue, Angular, or similar frameworks
- **Micro-Utilities**: Custom utilities (<100 lines) instead of external libraries
- **Direct Browser Execution**: No transpiling, bundling, or build steps
- **CloudFormation (JSON)**: Infrastructure as code with explicit JSON templates
- **Minimal Lambda Usage**: Prefer direct service integration via VTL templates

The inspiration for this approach stems from the observation that while frameworks require constant updates, pure web technologies have remained stable for decades.

## Decision-Making Guidelines

When assisting with this project, apply these decision-making guidelines:

1. **Prefer simplicity over cleverness**
   - Choose the most straightforward solution, even if it's not the most elegant
   - Avoid complex patterns that may be difficult to understand or maintain

2. **Prioritize long-term stability**
   - Ask: "Will this approach still work in 10 years?"
   - Prefer stable, proven technologies over cutting-edge solutions

3. **Default to direct AWS service integration**
   - Use API Gateway with VTL to connect directly to DynamoDB when possible
   - Only recommend Lambda functions when absolutely necessary

4. **Avoid dependencies**
   - Never suggest npm packages, libraries, or frameworks
   - Recommend custom micro-utilities instead of external dependencies

5. **Document decisions explicitly**
   - Clearly explain the reasoning behind your suggestions
   - Note any tradeoffs or compromises made

## Core Project Structure

Always explore and understand these key project folders before providing assistance:

- **backend/cloudformation/**
  - Contains CloudFormation templates in JSON format
  - Follows a modular nested stack structure
  - Each template has specific resource definitions, parameters, and outputs

- **scripts/**
  - Bash scripts for deployment, deletion, and local development
  - The deployment flow: upload templates → deploy stacks → sync frontend
  - Scripts maintain the project-config.js file

- **frontend/js/**
  - Vanilla JavaScript for application logic
  - Contains custom micro-utilities
  - No external libraries are allowed

## Key Technical Patterns

Familiarize yourself with these core patterns used throughout the codebase:

1. **JSON CloudFormation templates**
   - Main stack template references nested stacks
   - Explicit parameter passing between stacks
   - Outputs used for cross-stack references

2. **Authentication**
   - Mock authentication for local development
   - Cognito Hosted UI for deployed environments
   - Token-based API authorization

3. **API Design**
   - API Gateway with VTL templates for DynamoDB integration
   - User context propagation through mapping templates
   - Unified request/response patterns

4. **Frontend Application**
   - Progressive enhancement approach
   - Custom event handling and DOM manipulation
   - Environment-aware configuration

## How to Provide Assistance

When helping with this project:

1. **Be direct, structured, and clear**
   - Prioritize readability and maintainability
   - Use explicit, straightforward language

2. **Respect the minimalist philosophy**
   - Never recommend frameworks, libraries, or build tools
   - Suggest vanilla solutions that align with the project's goals

3. **Use existing patterns where possible**
   - Look for similar code in the project to maintain consistency
   - Follow established conventions for naming and structure

4. **Focus on practical solutions**
   - Address real-world deployment and maintenance challenges
   - Consider operational simplicity and troubleshooting

5. **Provide complete code examples**
   - Include all necessary code, not just snippets
   - Explain the code and its integration with existing components

## Conflict Resolution

When facing conflicts between different approaches:

1. **If AWS service behavior changes over time**
   - Prefer adjustments that preserve simplicity and stability
   - Focus on maintaining the application's longevity

2. **If project documentation and AWS best practices conflict**
   - Prefer the project's documented standards
   - Only suggest deviations when absolutely necessary for functionality

3. **When suggesting alternative approaches**
   - Clearly explain the tradeoffs involved
   - Provide both options while recommending the one that best aligns with project principles

Remember, this project intentionally prioritizes stability and simplicity over modern trends. Your assistance should align with this philosophy to provide the most value.
