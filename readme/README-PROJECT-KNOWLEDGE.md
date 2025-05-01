---
type: AI_PROJECT_MEMORY_GUIDE
importance: HIGH
ai_guidance: "This file defines which project files should be uploaded to Claude’s persistent Project Knowledge and why. It complements live file browsing via MCP File Serve."
---

# 🧠 Project Knowledge Upload Guide (for Claude)

This file documents **which files should be uploaded to Claude’s Project Knowledge**, even when the full codebase is exposed via MCP File Serve.

## 🧩 What’s the Difference?

- **MCP File Serve**: Enables live browsing and indexing of your files during a session.
- **Project Knowledge**: Loads persistent memory Claude uses for reasoning _before_ any file is read.

> Think of it this way:  
> **Project Knowledge = context Claude remembers**  
> **MCP = files Claude reads when needed**

---

## ✅ Files to Upload to Project Knowledge

| File                            | Purpose                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `AI-README.md`                  | Tells Claude how to think, act, and respond in this codebase. AI behavioral contract.                   |
| `GUIDE-ARCHITECTURE.md`         | Explains core design choices, serverless stack, auth modes, and runtime flow.                           |
| `GUIDE-DEPLOYMENT.md`           | Describes how deployments work and what controls environment config.                                    |
| `README-STRATEGY.md`            | Documents the reasoning behind the README system, guide separation, and long-term maintenance strategy. |
| _(optional)_ `README.md`        | The project’s executive summary and entry point. Useful for agents with no initial context.             |
| _(optional)_ `GUIDE-TESTING.md` | Lightweight reference if Claude will be helping generate tests.                                         |

---

## 🚫 Files Not Needed in Project Knowledge

| File or Folder           | Why Not                                                                          |
| ------------------------ | -------------------------------------------------------------------------------- |
| `frontend/js/*.js`       | Claude can browse these via MCP File Serve when needed.                          |
| `project-config.js`      | Used dynamically during deployments; no static reasoning needed.                 |
| CloudFormation templates | Unless explaining complex infra strategies, keep these out of persistent memory. |
| `tests/`                 | Load on demand instead of storing. Easier to reason live.                        |
| Scripts                  | Referenced only during task execution. Don’t require persistent memory.          |

---

## 🧠 Summary

Upload only those files that Claude should remember _before_ doing anything — especially docs that shape:

- Project philosophy
- Agent behavior
- Design constraints
- Prompt safety
- Infrastructure intent

All other files can be safely served via MCP File Serve.
