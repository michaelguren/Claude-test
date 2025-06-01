/**
 * API client for TODO application
 * Uses real authentication with JWT tokens
 */
const Api = {};

// Initialize API client
function init(config) {
  Api.baseUrl = "https://nfwfkybvol.execute-api.us-east-1.amazonaws.com";

  console.log("API initialized with base URL:", Api.baseUrl);
}

// Generic fetch wrapper with auth token
async function fetchWithAuth(url, options = {}) {
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
      throw new Error("Unauthorized - please sign in again");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    // No content
    return null;
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error("Network error - please check your connection");
    }
    throw error;
  }
}

// Get all TODOs for the current user
async function getTodos() {
  const url = `${Api.baseUrl}/todos`;
  return await fetchWithAuth(url);
}

// Create a new TODO
async function createTodo(text) {
  if (!text || text.trim() === "") {
    throw new Error("TODO text cannot be empty");
  }

  const url = `${Api.baseUrl}/todos`;
  return await fetchWithAuth(url, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

// Update a TODO
async function updateTodo(todoId, updates) {
  if (!todoId) {
    throw new Error("TODO ID is required");
  }

  const url = `${Api.baseUrl}/todos/${todoId}`;
  return await fetchWithAuth(url, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

// Delete a TODO
async function deleteTodo(todoId) {
  if (!todoId) {
    throw new Error("TODO ID is required");
  }

  const url = `${Api.baseUrl}/todos/${todoId}`;
  await fetchWithAuth(url, {
    method: "DELETE",
  });
}

// Toggle completed status of a TODO
async function toggleTodo(todoId) {
  if (!todoId) {
    throw new Error("TODO ID is required");
  }

  const todos = await getTodos();
  const todo = todos.find((t) => t.todoId === todoId);
  if (!todo) {
    throw new Error(`TODO with ID ${todoId} not found`);
  }
  return updateTodo(todoId, { completed: !todo.completed });
}

// Public API
Api.init = init;
Api.getTodos = getTodos;
Api.createTodo = createTodo;
Api.updateTodo = updateTodo;
Api.deleteTodo = deleteTodo;
Api.toggleTodo = toggleTodo;

// Export for global access
window.Api = Api;
