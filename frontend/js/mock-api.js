/**
 * Mock API implementation for local development
 * Simulates API responses using localStorage
 */

// Mock API module
const MockApi = (function () {
  const STORAGE_KEY = "mockTodos";

  // Get TODO data from localStorage
  function getStoredTodos() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error getting mock todos:", error);
    }

    return [];
  }

  // Save TODOs to localStorage
  function saveTodos(todos) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (error) {
      console.error("Error saving mock todos:", error);
    }
  }

  // Generate a unique ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get all TODOs
  async function getTodos() {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    return getStoredTodos();
  }

  // Create a new TODO
  async function createTodo(text) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const todos = getStoredTodos();

    const newTodo = {
      todoId: generateId(),
      text: text,
      completed: false,
    };

    todos.push(newTodo);
    saveTodos(todos);

    return newTodo;
  }

  // Update a TODO
  async function updateTodo(todoId, updates) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const todos = getStoredTodos();
    const index = todos.findIndex((todo) => todo.todoId === todoId);

    if (index === -1) {
      throw new Error(`TODO with ID ${todoId} not found`);
    }

    const updatedTodo = {
      ...todos[index],
      ...updates,
    };

    todos[index] = updatedTodo;
    saveTodos(todos);

    return updatedTodo;
  }

  // Delete a TODO
  async function deleteTodo(todoId) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const todos = getStoredTodos();
    const index = todos.findIndex((todo) => todo.todoId === todoId);

    if (index === -1) {
      throw new Error(`TODO with ID ${todoId} not found`);
    }

    todos.splice(index, 1);
    saveTodos(todos);

    return true;
  }

  // Toggle completed status of a TODO
  async function toggleTodo(todoId, completed) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const todos = getStoredTodos();
    const index = todos.findIndex((todo) => todo.todoId === todoId);

    if (index === -1) {
      throw new Error(`TODO with ID ${todoId} not found`);
    }

    const newStatus =
      typeof completed === "boolean" ? completed : !todos[index].completed;

    const updatedTodo = {
      ...todos[index],
      completed: newStatus,
    };

    todos[index] = updatedTodo;
    saveTodos(todos);

    return updatedTodo;
  }

  // Public API
  return {
    getTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
  };
})();

// Export for global access
window.MockApi = MockApi;
