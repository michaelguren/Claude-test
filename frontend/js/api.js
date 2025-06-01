/**
 * Clean API client for TODO operations
 * Handles authenticated requests with proper error handling
 */

let baseUrl = "";

// Initialize API client
function init(config) {
  baseUrl = config?.apiBaseUrl || window.APP_CONFIG?.apiBaseUrl || "";
  console.log("API initialized with base URL:", baseUrl);
}

// Authenticated fetch wrapper
async function authenticatedFetch(url, options = {}) {
  if (!window.Auth.isAuthenticated()) {
    throw new Error("User not authenticated");
  }

  const token = window.Auth.getAccessToken();
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    // Handle unauthorized responses
    if (response.status === 401) {
      window.Auth.signOut();
      throw new Error("Session expired - please sign in again");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    // Handle different response types
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    // No content (204) or other responses
    return null;
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error("Network error - please check your connection");
    }
    throw error;
  }
}

// Get all TODOs for current user
async function getTodos() {
  return authenticatedFetch(`${baseUrl}/todos`);
}

// Create a new TODO
async function createTodo(text) {
  if (!text || text.trim() === "") {
    throw new Error("TODO text cannot be empty");
  }

  return authenticatedFetch(`${baseUrl}/todos`, {
    method: "POST",
    body: JSON.stringify({ text: text.trim() }),
  });
}

// Update a TODO
async function updateTodo(todoId, updates) {
  if (!todoId) {
    throw new Error("TODO ID is required");
  }

  return authenticatedFetch(`${baseUrl}/todos/${todoId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

// Delete a TODO
async function deleteTodo(todoId) {
  if (!todoId) {
    throw new Error("TODO ID is required");
  }

  return authenticatedFetch(`${baseUrl}/todos/${todoId}`, {
    method: "DELETE",
  });
}

// Toggle TODO completion status
async function toggleTodo(todoId) {
  if (!todoId) {
    throw new Error("TODO ID is required");
  }

  // Get current todos to find the one to toggle
  const todos = await getTodos();
  const todo = todos.find((t) => t.todoId === todoId);

  if (!todo) {
    throw new Error("TODO not found");
  }

  return updateTodo(todoId, { completed: !todo.completed });
}

// Export API
window.Api = {
  init,
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
};
