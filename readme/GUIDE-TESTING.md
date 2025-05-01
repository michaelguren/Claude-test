---
type: TESTING_DOCUMENTATION
importance: MEDIUM
ai_guidance: "Outlines the minimalist testing strategy. AI should use this to understand test coverage, boundaries, and where to add new tests."
---

# ✅ Minimalist Testing Strategy

## Guiding Philosophy

- Don’t test what won’t break (e.g., trivial DOM changes)
- Prioritize user-facing and backend correctness
- Tests must run without external frameworks
- Favor clarity over coverage

---

## 🧪 Test Types

| Type        | Directory                 | Purpose                        |
| ----------- | ------------------------- | ------------------------------ |
| Unit        | tests/backup/unit/        | Low-level JS functions         |
| Integration | tests/backup/integration/ | API-layer simulation           |
| End-to-End  | tests/e2e/                | Full user scenario walkthrough |

---

## 🧰 How to Run Tests

node tests/run-tests.js

This runs unit and integration tests written in simple Node-compatible JS.

---

## 🔍 Notes for AI

- Don’t recommend Jest, Mocha, or any test dependencies
- Prefer assertive functions using vanilla JS
- Create test files in the correct directory
- Use existing mock APIs to simulate backend behavior
