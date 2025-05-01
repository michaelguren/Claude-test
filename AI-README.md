---
type: AI_OPERATIONS_CHEATSHEET
importance: HIGH
ai_guidance: "This file teaches AI models how to reason, respond, and assist in this codebase. It complements GUIDE-ARCHITECTURE.md and should be used as a front-loaded input for agentic coding."
---

# 🤖 AI-README

This is a project built with AI-first reasoning in mind. Use this file to guide how you assist, generate, and reason.

---

## 🧠 Philosophy (Don’t Forget)

- Zero dependencies (no npm, Webpack, React, etc.)
- 10+ year lifespan
- Human clarity > short-term cleverness
- Serverless-first (CloudFormation, Lambda, DynamoDB, etc.)
- Pure HTML/CSS/JS — no build system, no transpilers

---

## ✅ AI Should Do:

- Respect existing file structure and naming
- Use `project-config.js` as the runtime switch
- Reference the correct CloudFormation file (`main.json`, `frontend.json`)
- Check if `authEnabled` is true before changing auth-related logic
- Recommend changes only compatible with existing minimal stack

---

## ❌ AI Should Never:

- Suggest TypeScript, React, Tailwind, Vue, etc.
- Introduce `package.json` or Node tools
- Recommend Docker, CDK, Terraform, or non-AWS resources
- Add new build steps
- Assume backend frameworks (e.g. Express, Flask)

---

## 🔎 Where to Look

| Question Type          | File(s) to Check                               |
| ---------------------- | ---------------------------------------------- |
| How the frontend works | `frontend/js/app.js`                           |
| Where API logic flows  | `api.js` + `mock-api.js`                       |
| How auth toggles       | `auth.js`, `auth-mock.js`, `project-config.js` |
| What infra is deployed | `backend/cloudformation/*.json`                |
| How to add a feature   | See Tasks (WIP) below                          |

---

## 💬 Sample Prompts

> Add a new field to the Todo model  
> 🡲 Update frontend HTML, `app.js`, mock API, and DynamoDB schema

> How is auth handled in mock mode?  
> 🡲 See `auth-mock.js`, static user ID, no session persistence

> Where’s the user data stored?  
> 🡲 DynamoDB table (segregated by user ID if auth is enabled)

---

## 🛠️ Tasks (WIP)

This section is under construction and evolves during prototyping.  
Use these notes to guide new features and maintain context across changes.

- **Add new Todo field**  
  `index.html`, `app.js`, `mock-api.js`, update backend if real auth is used

- **Enable Cognito Auth**  
  Toggle `authEnabled: true` in `project-config.js`, check `auth.js`, `callback.html`

- **Write a test**  
  Create file in `tests/backup/unit/` or `integration/`, use vanilla Node assert()

- **Deploy**  
  Run `./deploy.sh` from `/scripts`; stack choice depends on `authEnabled`
