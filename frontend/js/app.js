/**
 * Minimalist TODO App - Main Application Logic
 * HTML5 and CSS-first approach with minimal JavaScript
 * Updated to call correct backend auth endpoints
 */

// Configuration - update these URLs to match your deployment
const CONFIG = {
  apiBaseUrl:
    window.location.hostname === "localhost"
      ? "https://nfwfkybvol.execute-api.us-east-1.amazonaws.com"
      : "https://nfwfkybvol.execute-api.us-east-1.amazonaws.com",
  useMockAuth: window.location.hostname === "localhost",
};

// Simple state management
const state = {
  user: null,
  todos: [],
  filter: "all", // all, active, completed
};

// Utility functions for cleaner code
function $(id) {
  return document.getElementById(id);
}

function show(element) {
  element.classList.remove("hidden");
}

function hide(element) {
  element.classList.add("hidden");
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove("hidden");
}

function hideError(element) {
  element.classList.add("hidden");
}

// Auth step management using CSS classes
function showAuthStep(step) {
  // Hide all auth steps
  document.querySelectorAll(".auth-step").forEach((el) => {
    el.classList.remove("active");
  });

  // Show the requested step
  $(step + "-step").classList.add("active");

  // Clear any error messages
  document.querySelectorAll(".error").forEach((el) => hideError(el));

  // Focus appropriate input
  setTimeout(() => {
    if (step === "login") $("login-email").focus();
    if (step === "register") $("register-email").focus();
    if (step === "verification") $("verification-code").focus();
  }, 100);
}

// Form validation using HTML5 + minimal JS
function validateForm(form) {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  // Let HTML5 handle basic validation
  if (!form.checkValidity()) {
    form.reportValidity();
    return false;
  }

  // Custom validation for password confirmation
  if (data.password && data.passwordConfirm) {
    if (data.password !== data.passwordConfirm) {
      showError($("register-error"), "Passwords do not match");
      return false;
    }
  }

  return data;
}

// API calls with proper error handling
async function apiCall(endpoint, options = {}) {
  const url = CONFIG.apiBaseUrl + endpoint;
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}
// Update the auth functions in frontend/js/app.js:

// Start registration process - sends verification email
async function register(email, password) {
  try {
    // Step 1: Send verification code
    await apiCall("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    // Store password temporarily for step 2
    state.pendingRegistration = { email, password };

    // Success - show verification step
    showAuthStep("verification");
    $("verification-email").textContent = email;
  } catch (error) {
    throw error;
  }
}

// Complete registration with verification code
async function verifyEmail(email, code) {
  try {
    const { password } = state.pendingRegistration || {};
    if (!password) {
      throw new Error("Registration session expired. Please start over.");
    }

    // Step 2: Verify code and create user
    const result = await apiCall("/auth/verify-signup", {
      method: "POST",
      body: JSON.stringify({ email, code, password }),
    });

    // Clear pending registration
    state.pendingRegistration = null;

    // Store auth data and show app
    localStorage.setItem("auth", JSON.stringify(result));
    state.user = result.user;
    showApp();
  } catch (error) {
    throw error;
  }
}

// Login remains the same
async function login(email, password) {
  const result = await apiCall("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("auth", JSON.stringify(result));
  state.user = result.user;
  showApp();
}

// Resend verification code
async function resendCode() {
  const email = $("verification-email").textContent;
  if (!email) return;

  try {
    await apiCall("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    // Show success message
  } catch (error) {
    console.error("Error resending code:", error);
  }
}

function signOut() {
  localStorage.removeItem("token"); // Or whatever key you're using
  location.reload(); // or redirect to login page
}

// App management
function showAuth() {
  hide($("app-section"));
  show($("auth-section"));
  showAuthStep("login"); // Default to login form
}

function showApp() {
  hide($("auth-section"));
  show($("app-section"));

  if (state.user && state.user.email) {
    $("user-info").textContent = `Welcome, ${state.user.email}!`;
  }

  loadTodos();
}

// Todo management
async function loadTodos() {
  try {
    // When real TODO backend is implemented:
    // const todos = await apiCall('/todos');
    // state.todos = todos;

    // For now, start with empty state
    state.todos = [];
    renderTodos();
  } catch (error) {
    console.error("Error loading todos:", error);
  }
}

function renderTodos() {
  const list = $("todo-list");
  const filtered = state.todos.filter((todo) => {
    if (state.filter === "active") return !todo.completed;
    if (state.filter === "completed") return todo.completed;
    return true; // all
  });

  list.innerHTML = filtered.length
    ? filtered
        .map(
          (todo) => `
    <li class="todo-item ${todo.completed ? "completed" : ""}">
      <input type="checkbox" class="todo-checkbox" 
             ${todo.completed ? "checked" : ""} 
             onchange="toggleTodo(${todo.id})">
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <button class="delete-btn" onclick="deleteTodo(${todo.id})">×</button>
    </li>
  `
        )
        .join("")
    : '<li class="todo-item" style="text-align: center; opacity: 0.6">No todos found</li>';
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function addTodo(text) {
  try {
    // When real TODO backend is implemented:
    // const newTodo = await apiCall('/todos', {
    //   method: 'POST',
    //   body: JSON.stringify({ text: text.trim() })
    // });
    // state.todos.push(newTodo);
    // renderTodos();

    console.log("TODO backend not yet implemented");
  } catch (error) {
    console.error("Error adding todo:", error);
    alert("Failed to add todo: " + error.message);
  }
}

function toggleTodo(id) {
  const todo = state.todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    renderTodos();
  }

  // When real backend is implemented:
  // apiCall(`/todos/${id}`, {
  //   method: 'PUT',
  //   body: JSON.stringify({ completed: todo.completed })
  // }).catch(error => {
  //   console.error('Error updating todo:', error);
  //   todo.completed = !todo.completed; // Revert on error
  //   renderTodos();
  // });
}

function deleteTodo(id) {
  const todoIndex = state.todos.findIndex((t) => t.id === id);
  if (todoIndex !== -1) {
    const todo = state.todos[todoIndex];
    state.todos.splice(todoIndex, 1);
    renderTodos();
  }

  // apiCall(`/todos/${id}`, { method: 'DELETE' })
  //   .catch(error => {
  //     console.error('Error deleting todo:', error);
  //     // Restore todo on error
  //     state.todos.splice(todoIndex, 0, todo);
  //     renderTodos();
  //   });
}

// Application initialization
function initializeApp() {
  console.log("Config:", CONFIG);

  // Check for existing authentication
  try {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const authData = JSON.parse(stored);
      // Basic token expiry check (if your tokens include expiry)
      if (authData.email && authData.token) {
        state.user = authData;
        showApp();
        return;
      }
    }
  } catch (error) {
    console.error("Error loading stored auth:", error);
  }

  // Default to showing auth
  showAuth();
}

// Event listeners using modern approaches
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();

  // Form submissions using HTML5 events
  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = validateForm(e.target);
    if (!data) return;

    const btn = e.target.querySelector('button[type="submit"]');
    btn.classList.add("loading");
    hideError($("login-error"));

    try {
      await login(data.email, data.password);
    } catch (error) {
      showError($("login-error"), error.message);
    } finally {
      btn.classList.remove("loading");
    }
  });

  $("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = validateForm(e.target);
    if (!data) return;

    const btn = e.target.querySelector('button[type="submit"]');
    btn.classList.add("loading");
    hideError($("register-error"));

    try {
      await register(data.email, data.password);
    } catch (error) {
      showError($("register-error"), error.message);
    } finally {
      btn.classList.remove("loading");
    }
  });

  $("verification-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = validateForm(e.target);
    if (!data) return;

    const email = $("verification-email").textContent;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.classList.add("loading");
    hideError($("verification-error"));

    try {
      await verifyEmail(email, data.code);
    } catch (error) {
      showError($("verification-error"), error.message);
    } finally {
      btn.classList.remove("loading");
    }
  });

  $("todo-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("todo-input");
    const text = input.value.trim();
    if (!text) return;

    await addTodo(text);
    input.value = "";
  });

  $("sign-out-button").addEventListener("click", signOut);

  // Filter buttons using event delegation
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-btn")) {
      // Update active filter button
      document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.remove("active");
      });
      e.target.classList.add("active");

      // Update filter state
      state.filter = e.target.dataset.filter;
      renderTodos();
    }
  });

  // Handle Enter key in verification code input for better UX
  $("verification-code").addEventListener("input", (e) => {
    // Auto-submit when 6 digits are entered
    if (e.target.value.length === 6 && /^\d{6}$/.test(e.target.value)) {
      $("verification-form").dispatchEvent(new Event("submit"));
    }
  });
});

// Make functions globally available for onclick handlers
window.showAuthStep = showAuthStep;
window.resendCode = resendCode;
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
