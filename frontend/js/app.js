// app.js - Minimalist TODO App Core Logic (Auth + Todos)

// Global config
window.APP_CONFIG = {
  apiBaseUrl: "https://nfwfkybvol.execute-api.us-east-1.amazonaws.com",
};

// State
const state = {
  user: null,
  todos: [],
  filter: "all",
};

// DOM helpers
const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");
const showError = (el, msg) => {
  el.textContent = msg;
  el.classList.remove("hidden");
};
const hideError = (el) => el.classList.add("hidden");

async function apiCall(endpoint, options = {}) {
  const url = window.APP_CONFIG.apiBaseUrl + endpoint;
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    const body = isJson ? await response.json() : {};

    if (!response.ok) {
      throw new Error(body.error || `HTTP ${response.status}`);
    }

    return body;
  } catch (err) {
    console.error("API call failed:", err);
    throw err;
  }
}

// Auth flow helpers
function showAuthStep(step) {
  document
    .querySelectorAll(".auth-step")
    .forEach((el) => el.classList.remove("active"));
  $(`${step}-step`).classList.add("active");
  document.querySelectorAll(".error").forEach(hideError);
  setTimeout(() => {
    $(`${step}-email`)?.focus();
    if (step === "verification") $("verification-code")?.focus();
  }, 100);
}

function validateForm(form) {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  if (!form.checkValidity()) {
    form.reportValidity();
    return false;
  }
  if (
    data.password &&
    data.passwordConfirm &&
    data.password !== data.passwordConfirm
  ) {
    showError($("register-error"), "Passwords do not match");
    return false;
  }
  return data;
}

// Auth logic
async function register(email, password) {
  await apiCall("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  state.pendingRegistration = { email, password };
  $("verification-email").textContent = email;
  showAuthStep("verification");
}

async function verifyEmail(email, code) {
  const { password } = state.pendingRegistration || {};
  if (!password)
    throw new Error("Registration session expired. Please start over.");
  await window.Auth.completeRegistration(email, code);
  const result = await window.Auth.login(email, password);
  state.user = result.user;
  showApp();
}

async function login(email, password) {
  const result = await window.Auth.login(email, password);
  state.user = result.user;
  showApp();
}

function signOut() {
  window.Auth.signOut();
  location.reload();
}

// App flow
function showApp() {
  hide($("auth-section"));
  show($("app-section"));
  $("user-info").textContent = `Welcome, ${state.user?.email || "User"}!`;
  loadTodos();
}

function showAuth() {
  hide($("app-section"));
  show($("auth-section"));
  showAuthStep("login");
}

function renderTodos() {
  const list = $("todo-list");
  const filtered = state.todos.filter((todo) =>
    state.filter === "active"
      ? !todo.completed
      : state.filter === "completed"
      ? todo.completed
      : true
  );

  list.innerHTML = filtered.length
    ? filtered
        .map(
          (todo) => `
        <li class="todo-item ${todo.completed ? "completed" : ""}">
          <input type="checkbox" class="todo-checkbox"
                 ${todo.completed ? "checked" : ""}
                 onchange="toggleTodo('${todo.todoId}')">
          <span class="todo-text">${escapeHtml(todo.text)}</span>
          <button class="delete-btn" onclick="deleteTodo('${
            todo.todoId
          }')">×</button>
        </li>
      `
        )
        .join("")
    : `<li class="todo-item" style="text-align: center; opacity: 0.6">No todos found</li>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// TODO actions
async function loadTodos() {
  try {
    $("todo-list").innerHTML = "";
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
  } catch (err) {
    console.error("Add error:", err);
    alert("Could not add TODO");
  }
}

async function toggleTodo(todoId) {
  try {
    const todo = state.todos.find((t) => t.todoId === todoId);
    if (!todo) return;
    const updated = await window.Api.updateTodo(todoId, {
      completed: !todo.completed,
    });
    todo.completed = updated.completed;
    renderTodos();
  } catch (err) {
    console.error("Toggle error:", err);
  }
}

async function deleteTodo(todoId) {
  const idx = state.todos.findIndex((t) => t.todoId === todoId);
  if (idx === -1) return;
  const todo = state.todos[idx];
  try {
    await window.Api.deleteTodo(todoId);
    state.todos.splice(idx, 1);
    renderTodos();
  } catch (err) {
    console.error("Delete error:", err);
    state.todos.splice(idx, 0, todo); // restore if failed
    renderTodos();
  }
}

// App startup
function initializeApp() {
  window.Api.init(); // <--- This was likely missing
  console.log("Config:", window.APP_CONFIG);

  const restored = window.Auth.init();
  if (restored && window.Auth.isAuthenticated()) {
    state.user = window.Auth.getCurrentUser();
    showApp();
  } else {
    showAuth();
  }
}

// Bind events
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = validateForm(e.target);
    if (!data) return;

    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = "Signing in...";
    form.classList.add("disabled");
    hideError($("login-error"));

    try {
      await login(data.email, data.password);
    } catch (error) {
      showError($("login-error"), error.message);
      btn.disabled = false;
      btn.textContent = "Sign In";
    } finally {
      form.classList.remove("disabled");
    }
  });

  $("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = validateForm(form);
    if (!data) return;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "...Creating...";
    form.classList.add("disabled");
    hideError($("register-error"));

    try {
      await register(data.email, data.password);
    } catch (err) {
      showError($("register-error"), err.message);
      btn.disabled = false;
      btn.textContent = "Create Account";
    } finally {
      form.classList.remove("disabled");
    }
  });

  $("verification-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = validateForm(e.target);
    if (!data) return;
    try {
      await verifyEmail($("verification-email").textContent, data.code);
    } catch (err) {
      showError($("verification-error"), err.message);
    }
  });

  $("todo-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("todo-input");
    if (!input.value.trim()) return;
    await addTodo(input.value.trim());
    input.value = "";
  });

  $("sign-out-button").addEventListener("click", signOut);

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

  $("verification-code").addEventListener("input", (e) => {
    if (e.target.value.length === 6 && /^\d{6}$/.test(e.target.value)) {
      $("verification-form").dispatchEvent(new Event("submit"));
    }
  });
});

// Export global access
window.showAuthStep = showAuthStep;
window.resendCode = async () => {
  const email = $("verification-email").textContent;
  if (email) await window.Auth.sendVerificationCode(email);
};
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
