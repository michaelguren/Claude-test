/**
 * API client for TODO application
 * Uses real authentication with JWT tokens
 * TODOs are still mocked until we build the backend
 */

// API client module
const Api = {
  baseUrl: null,
  useMockTodos: true, // Will be true until we build TODO backend
};

// Initialize API client
function init(config) {
  Api.baseUrl = config.apiBaseUrl;
  Api.useMockTodos = true; // Keep TODOs mocked for now

  console.log("API initialized with base URL:", Api.baseUrl);
  console.log("Using real auth, mock TODOs");
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
  if (Api.useMockTodos) {
    return window.MockApi.getTodos();
  }

  // When we build the real TODO backend, this will be:
  // const url = `${Api.baseUrl}/todos`;
  // return await fetchWithAuth(url);

  throw new Error("Real TODO backend not implemented yet");
}

// Create a new TODO
async function createTodo(text) {
  if (!text || text.trim() === "") {
    throw new Error("TODO text cannot be empty");
  }

  if (Api.useMockTodos) {
    return window.MockApi.createTodo(text);
  }

  // When we build the real TODO backend, this will be:
  // const url = `${Api.baseUrl}/todos`;
  // return await fetchWithAuth(url, {
  //   method: 'POST',
  //   body: JSON.stringify({ text })
  // });

  throw new Error("Real TODO backend not implemented yet");
}

// Update a TODO
async function updateTodo(todoId, updates) {
  if (!todoId) {
    throw new Error("TODO ID is required");
  }

  if (Api.useMockTodos) {
    return window.MockApi.updateTodo(todoId, updates);
  }

  // When we build the real TODO backend, this will be:
  // const url = `${Api.baseUrl}/todos/${todoId}`;
  // return await fetchWithAuth(url, {
  //   method: 'PUT',
  //   body: JSON.stringify(updates)
  // });

  throw new Error("Real TODO backend not implemented yet");
}

// Delete a TODO
async function deleteTodo(todoId) {
  if (!todoId) {
    throw new Error("TODO ID is required");
  }

  if (Api.useMockTodos) {
    return window.MockApi.deleteTodo(todoId);
  }

  // When we build the real TODO backend, this will be:
  // const url = `${Api.baseUrl}/todos/${todoId}`;
  // await fetchWithAuth(url, {
  //   method: 'DELETE'
  // });

  throw new Error("Real TODO backend not implemented yet");
}

// Toggle completed status of a TODO
async function toggleTodo(todoId) {
  if (!todoId) {
    throw new Error("TODO ID is required");
  }

  if (Api.useMockTodos) {
    return window.MockApi.toggleTodo(todoId);
  }

  // When we build the real TODO backend, this will be:
  // Get the current TODO first, then update
  // const todos = await getTodos();
  // const todo = todos.find(t => t.todoId === todoId);
  // if (!todo) {
  //   throw new Error(`TODO with ID ${todoId} not found`);
  // }
  // return updateTodo(todoId, { completed: !todo.completed });

  throw new Error("Real TODO backend not implemented yet");
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
