/**
 * Minimalist API client for TODO application
 * No external dependencies - pure vanilla JavaScript
 */

// API client module
const API = (function () {
  let apiBaseUrl = "";
  let mockMode = false;

  // Initialize API client
  function init(config) {
    apiBaseUrl = config.apiBaseUrl || "";
    mockMode = config.useMockApi || false;

    if (mockMode) {
      console.log("API running in mock mode");
    } else {
      console.log("API initialized with base URL:", apiBaseUrl);
    }
  }

  // Generic fetch wrapper with auth token
  async function fetchWithAuth(url, options = {}) {
    if (!window.Auth.isAuthenticated()) {
      throw new Error("User not authenticated");
    }

    const token = window.Auth.getAccessToken();

    const headers = options.headers || {};
    headers["Authorization"] = `Bearer ${token}`;
    headers["Content-Type"] = headers["Content-Type"] || "application/json";

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Handle unauthorized responses
      if (response.status === 401) {
        window.Auth.signOut();
        throw new Error("Unauthorized - please sign in again");
      }

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        if (response.status === 204) {
          // No content
          return null;
        }

        const data = await response.json();
        return data;
      }

      return null;
    } catch (error) {
      console.error("API fetch error:", error);
      throw error;
    }
  }

  // Get all TODOs for the current user
  async function getTodos() {
    if (mockMode) {
      return window.MockApi.getTodos();
    }

    const url = `${apiBaseUrl}/todos`;
    const response = await fetchWithAuth(url);
    return response.todos || [];
  }

  // Create a new TODO
  async function createTodo(text) {
    if (!text || text.trim() === "") {
      throw new Error("TODO text cannot be empty");
    }

    if (mockMode) {
      return window.MockApi.createTodo(text);
    }

    const url = `${apiBaseUrl}/todos`;
    const todo = await fetchWithAuth(url, {
      method: "POST",
      body: JSON.stringify({ text }),
    });

    return todo;
  }

  // Update a TODO
  async function updateTodo(todoId, updates) {
    if (!todoId) {
      throw new Error("TODO ID is required");
    }

    if (mockMode) {
      return window.MockApi.updateTodo(todoId, updates);
    }

    const url = `${apiBaseUrl}/todos/${todoId}`;
    const todo = await fetchWithAuth(url, {
      method: "PUT",
      body: JSON.stringify(updates),
    });

    return todo;
  }

  // Delete a TODO
  async function deleteTodo(todoId) {
    if (!todoId) {
      throw new Error("TODO ID is required");
    }

    if (mockMode) {
      return window.MockApi.deleteTodo(todoId);
    }

    const url = `${apiBaseUrl}/todos/${todoId}`;
    await fetchWithAuth(url, {
      method: "DELETE",
    });

    return true;
  }

  // Toggle completed status of a TODO
  async function toggleTodo(todoId, completed) {
    if (!todoId) {
      throw new Error("TODO ID is required");
    }

    if (mockMode) {
      return window.MockApi.toggleTodo(todoId, completed);
    }

    // Get the current TODO
    const todos = await getTodos();
    const todo = todos.find((t) => t.todoId === todoId);

    if (!todo) {
      throw new Error(`TODO with ID ${todoId} not found`);
    }

    // Toggle the completed status
    const newStatus =
      typeof completed === "boolean" ? completed : !todo.completed;

    return updateTodo(todoId, {
      text: todo.text,
      completed: newStatus,
    });
  }

  // Public API
  return {
    init,
    getTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
  };
})();

// Export for global access
window.Api = API;
