/**
 * Clean main application logic
 * Handles auth flow and TODO management
 */

// Application state
const state = {
  currentView: "auth", // "auth" or "app"
  authStep: "login", // "login", "register", "verification"
  user: null,
  todos: [],
  filter: "all", // "all", "active", "completed"
};

// DOM helpers
const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");

const showError = (el, message) => {
  el.textContent = message;
  el.classList.remove("hidden");
};

const hideError = (el) => {
  el.classList.add("hidden");
};

// Initialize the application
function init() {
  console.log("Initializing application");

  // Initialize API
  window.Api.init();

  // Try to restore auth session
  const restored = window.Auth.init();

  if (restored && window.Auth.isAuthenticated()) {
    state.user = window.Auth.getCurrentUser();
    showApp();
  } else {
    showAuth();
  }
}

// Auth flow management
function showAuth() {
  state.currentView = "auth";
  hide($("app-section"));
  show($("auth-section"));
  showAuthStep("login");
}

function showAuthStep(step) {
  state.authStep = step;

  // Hide all auth steps
  document
    .querySelectorAll(".auth-step")
    .forEach((el) => el.classList.remove("active"));

  // Show current step
  $(`${step}-step`).classList.add("active");

  // Clear errors
  document.querySelectorAll(".error").forEach(hideError);

  // Focus appropriate field
  setTimeout(() => {
    if (step === "login") $("login-email")?.focus();
    if (step === "register") $("register-email")?.focus();
    if (step === "verification") $("verification-code")?.focus();
  }, 100);
}

function showApp() {
  state.currentView = "app";
  hide($("auth-section"));
  show($("app-section"));

  $("user-info").textContent = `Welcome, ${state.user?.email || "User"}!`;
  loadTodos();
}

// Form validation helper
function validateForm(form) {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  if (!form.checkValidity()) {
    form.reportValidity();
    return null;
  }

  // Check password confirmation for register
  if (
    data.password &&
    data.passwordConfirm &&
    data.password !== data.passwordConfirm
  ) {
    showError($("register-error"), "Passwords do not match");
    return null;
  }

  return data;
}

// Auth handlers
async function handleLogin(email, password) {
  const result = await window.Auth.login(email, password);
  state.user = result.user;
  showApp();
}

async function handleRegister(email, password) {
  await window.Auth.signup(email, password);
  $("verification-email").textContent = email;
  showAuthStep("verification");
}

async function handleVerification(email, code) {
  if (!email) {
    throw new Error("Registration session expired. Please start over.");
  }

  await window.Auth.verify(email, code);

  // After verification, we need to login to get the token
  // The backend only activates the user, doesn't return a token
  showAuthStep("login");
  showError(
    $("login-error"),
    "Email verified! Please sign in with your password."
  );
}

function handleSignOut() {
  window.Auth.signOut();
  location.reload();
}

// TODO management
async function loadTodos() {
  try {
    show($("loading-spinner"));
    const todos = await window.Api.getTodos();
    state.todos = todos;
    renderTodos();
  } catch (error) {
    console.error("Error loading todos:", error);
    alert("Failed to load todos: " + error.message);
  } finally {
    hide($("loading-spinner"));
  }
}

async function addTodo(text) {
  try {
    const newTodo = await window.Api.createTodo(text);
    state.todos.push(newTodo);
    renderTodos();
    $("todo-input").value = "";
  } catch (error) {
    console.error("Error adding todo:", error);
    alert("Failed to add todo: " + error.message);
  }
}

async function toggleTodo(todoId) {
  try {
    const todo = state.todos.find((t) => t.todoId === todoId);
    if (!todo) return;

    // Optimistic update
    todo.completed = !todo.completed;
    renderTodos();

    await window.Api.updateTodo(todoId, { completed: todo.completed });
  } catch (error) {
    console.error("Error toggling todo:", error);
    // Revert optimistic update
    const todo = state.todos.find((t) => t.todoId === todoId);
    if (todo) {
      todo.completed = !todo.completed;
      renderTodos();
    }
    alert("Failed to update todo: " + error.message);
  }
}

async function deleteTodo(todoId) {
  try {
    const index = state.todos.findIndex((t) => t.todoId === todoId);
    if (index === -1) return;

    // Optimistic update
    const todo = state.todos.splice(index, 1)[0];
    renderTodos();

    await window.Api.deleteTodo(todoId);
  } catch (error) {
    console.error("Error deleting todo:", error);
    // Revert optimistic update
    state.todos.splice(index, 0, todo);
    renderTodos();
    alert("Failed to delete todo: " + error.message);
  }
}

// UI rendering
function renderTodos() {
  const list = $("todo-list");
  const filtered = state.todos.filter((todo) => {
    if (state.filter === "active") return !todo.completed;
    if (state.filter === "completed") return todo.completed;
    return true; // "all"
  });

  if (filtered.length === 0) {
    list.innerHTML =
      '<li class="todo-item" style="text-align: center; opacity: 0.6">No todos found</li>';
    return;
  }

  list.innerHTML = filtered
    .map(
      (todo) => `
      <li class="todo-item ${todo.completed ? "completed" : ""}">
        <input 
          type="checkbox" 
          class="todo-checkbox" 
          ${todo.completed ? "checked" : ""} 
          data-todo-id="${todo.todoId}"
        />
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <button class="delete-btn" data-todo-id="${todo.todoId}">×</button>
      </li>
    `
    )
    .join("");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Event handlers
function setupEventListeners() {
  // Auth form handlers
  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = validateForm(e.target);
    if (!data) return;

    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');

    try {
      form.classList.add("disabled");
      btn.textContent = "Signing in...";
      hideError($("login-error"));

      await handleLogin(data.email, data.password);
    } catch (error) {
      showError($("login-error"), error.message);
    } finally {
      form.classList.remove("disabled");
      btn.textContent = "Sign In";
    }
  });

  $("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = validateForm(e.target);
    if (!data) return;

    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');

    try {
      form.classList.add("disabled");
      btn.textContent = "Creating account...";
      hideError($("register-error"));

      await handleRegister(data.email, data.password);
    } catch (error) {
      showError($("register-error"), error.message);
    } finally {
      form.classList.remove("disabled");
      btn.textContent = "Create Account";
    }
  });

  $("verification-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = validateForm(e.target);
    if (!data) return;

    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const email = $("verification-email").textContent;

    try {
      form.classList.add("disabled");
      btn.textContent = "Verifying...";
      hideError($("verification-error"));

      await handleVerification(email, data.code);
    } catch (error) {
      showError($("verification-error"), error.message);
    } finally {
      form.classList.remove("disabled");
      btn.textContent = "Verify Email";
    }
  });

  // Auto-submit verification when 6 digits entered
  $("verification-code").addEventListener("input", (e) => {
    if (e.target.value.length === 6 && /^\d{6}$/.test(e.target.value)) {
      $("verification-form").dispatchEvent(new Event("submit"));
    }
  });

  // TODO form handler
  $("todo-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("todo-input");
    const text = input.value.trim();
    if (!text) return;

    await addTodo(text);
  });

  // Sign out handler
  $("sign-out-button").addEventListener("click", handleSignOut);

  // Filter buttons
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-btn")) {
      document
        .querySelectorAll(".filter-btn")
        .forEach((btn) => btn.classList.remove("active"));
      e.target.classList.add("active");
      state.filter = e.target.dataset.filter;
      renderTodos();
    }
  });

  // TODO interactions
  document.addEventListener("click", (e) => {
    const todoId = e.target.dataset.todoId;
    if (!todoId) return;

    if (e.target.classList.contains("todo-checkbox")) {
      toggleTodo(todoId);
    } else if (e.target.classList.contains("delete-btn")) {
      deleteTodo(todoId);
    }
  });
}

// Global functions for HTML onclick handlers
window.showAuthStep = showAuthStep;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  init();
  setupEventListeners();
});
