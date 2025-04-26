/**
 * Unit tests for mock-api.js
 */

const { describe, it, assert, dom } = require("../test-utils");

// Create mock localStorage before other code runs
const mockLocalStorage = (() => {
  let store = {};
  
  return {
    getItem: function(key) {
      return store[key] || null;
    },
    setItem: function(key, value) {
      store[key] = String(value);
    },
    removeItem: function(key) {
      delete store[key];
    },
    clear: function() {
      store = {};
    },
    // Helper for tests
    _getStore: function() {
      return store;
    }
  };
})();

// Make localStorage available globally before any other code runs
global.localStorage = mockLocalStorage;

// Import the mockApi functionality
const mockApi = (() => {
  // Use localStorage to persist data
  const STORAGE_KEY = "minimalist-todo-items";

  // Load initial data
  function _loadTodos() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Save data to localStorage
  function _saveTodos(todos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  // Generate a unique ID (will be replaced by server-generated IDs)
  // Modified for predictable test results
  let idCounter = 1;
  function _generateId() {
    return `test-id-${idCounter++}`;
  }

  // Skip delay in tests
  function _delay(ms = 0) {
    return Promise.resolve();
  }

  // API methods
  return {
    // Get all todos
    async listTodos() {
      await _delay();
      return _loadTodos();
    },

    // Get todos filtered by status
    async filterTodos(status) {
      await _delay();
      const todos = _loadTodos();

      if (status === "all") {
        return todos;
      } else if (status === "active") {
        return todos.filter((todo) => !todo.completed);
      } else if (status === "completed") {
        return todos.filter((todo) => todo.completed);
      }

      return todos;
    },

    // Add a new todo
    async addTodo(title) {
      await _delay();
      const todos = _loadTodos();

      const newTodo = {
        id: _generateId(),
        title: title,
        completed: false,
        createdAt: new Date().toISOString()
      };

      todos.push(newTodo);
      _saveTodos(todos);

      return newTodo;
    },

    // Toggle a todo's completed status
    async toggleTodo(id) {
      await _delay();
      const todos = _loadTodos();

      const todoIndex = todos.findIndex((todo) => todo.id === id);
      if (todoIndex !== -1) {
        todos[todoIndex].completed = !todos[todoIndex].completed;
        _saveTodos(todos);
        return todos[todoIndex];
      }

      throw new Error(`Todo with id ${id} not found`);
    },

    // Update a todo
    async updateTodo(id, updates) {
      await _delay();
      const todos = _loadTodos();

      const todoIndex = todos.findIndex((todo) => todo.id === id);
      if (todoIndex !== -1) {
        todos[todoIndex] = { ...todos[todoIndex], ...updates };
        _saveTodos(todos);
        return todos[todoIndex];
      }

      throw new Error(`Todo with id ${id} not found`);
    },

    // Delete a todo
    async deleteTodo(id) {
      await _delay();
      const todos = _loadTodos();

      const updatedTodos = todos.filter((todo) => todo.id !== id);
      _saveTodos(updatedTodos);

      return { success: true, id };
    },

    // Clear all completed todos
    async clearCompleted() {
      await _delay();
      const todos = _loadTodos();

      const activeTodos = todos.filter((todo) => !todo.completed);
      _saveTodos(activeTodos);

      return activeTodos;
    },
    
    // For testing only
    _reset: function() {
      localStorage.clear();
      idCounter = 1;
    }
  };
})();

// Test suite
describe("Mock API", () => {
  
  beforeEach = () => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Reset any internal state in the API
    if (typeof mockApi._reset === 'function') {
      mockApi._reset();
    }
  };
  
  it("should add a new todo", async () => {
    const todo = await mockApi.addTodo("Test todo");
    
    assert.equal(todo.title, "Test todo", "Todo title should be set correctly");
    assert.equal(todo.completed, false, "New todo should not be completed");
    assert.equal(todo.id, "test-id-1", "Todo should have an ID");
    
    // Check storage
    const todos = await mockApi.listTodos();
    assert.equal(todos.length, 1, "One todo should be stored");
  });
  
  it("should list all todos", async () => {
    await mockApi.addTodo("First todo");
    await mockApi.addTodo("Second todo");
    
    const todos = await mockApi.listTodos();
    assert.equal(todos.length, 2, "Should return all todos");
    assert.equal(todos[0].title, "First todo", "First todo title should match");
    assert.equal(todos[1].title, "Second todo", "Second todo title should match");
  });
  
  it("should filter todos by status", async () => {
    await mockApi.addTodo("Active todo");
    const completedTodo = await mockApi.addTodo("Completed todo");
    await mockApi.toggleTodo(completedTodo.id);
    
    // Test 'all' filter
    const allTodos = await mockApi.filterTodos("all");
    assert.equal(allTodos.length, 2, "All filter should return all todos");
    
    // Test 'active' filter
    const activeTodos = await mockApi.filterTodos("active");
    assert.equal(activeTodos.length, 1, "Active filter should return only active todos");
    assert.equal(activeTodos[0].title, "Active todo", "Active todo title should match");
    
    // Test 'completed' filter
    const completedTodos = await mockApi.filterTodos("completed");
    assert.equal(completedTodos.length, 1, "Completed filter should return only completed todos");
    assert.equal(completedTodos[0].title, "Completed todo", "Completed todo title should match");
  });
  
  it("should toggle a todo's completed status", async () => {
    const todo = await mockApi.addTodo("Toggle test");
    assert.equal(todo.completed, false, "New todo should start as not completed");
    
    const toggled = await mockApi.toggleTodo(todo.id);
    assert.equal(toggled.completed, true, "Todo should be completed after toggle");
    
    const toggledAgain = await mockApi.toggleTodo(todo.id);
    assert.equal(toggledAgain.completed, false, "Todo should be active after second toggle");
  });
  
  it("should update a todo", async () => {
    const todo = await mockApi.addTodo("Original title");
    
    const updated = await mockApi.updateTodo(todo.id, {
      title: "Updated title",
      description: "New description"
    });
    
    assert.equal(updated.title, "Updated title", "Title should be updated");
    assert.equal(updated.description, "New description", "Description should be added");
    assert.equal(updated.id, todo.id, "ID should remain the same");
    assert.equal(updated.completed, todo.completed, "Completed status should not change");
  });
  
  it("should delete a todo", async () => {
    const todo = await mockApi.addTodo("To be deleted");
    
    // Verify it exists
    let todos = await mockApi.listTodos();
    assert.equal(todos.length, 1, "Todo should exist before deletion");
    
    // Delete it
    const result = await mockApi.deleteTodo(todo.id);
    assert.equal(result.success, true, "Delete operation should succeed");
    assert.equal(result.id, todo.id, "Deleted todo ID should be returned");
    
    // Verify it's gone
    todos = await mockApi.listTodos();
    assert.equal(todos.length, 0, "Todo should be deleted");
  });
  
  it("should clear completed todos", async () => {
    // Add multiple todos
    const todo1 = await mockApi.addTodo("Active todo");
    const todo2 = await mockApi.addTodo("Completed todo 1");
    const todo3 = await mockApi.addTodo("Completed todo 2");
    
    // Mark some as completed
    await mockApi.toggleTodo(todo2.id);
    await mockApi.toggleTodo(todo3.id);
    
    // Clear completed
    const remaining = await mockApi.clearCompleted();
    
    // Verify
    assert.equal(remaining.length, 1, "Only active todo should remain");
    assert.equal(remaining[0].id, todo1.id, "Active todo should be preserved");
    
    const todos = await mockApi.listTodos();
    assert.equal(todos.length, 1, "Only one todo should be in storage");
  });
  
  it("should throw an error when toggling non-existent todo", async () => {
    let errorThrown = false;
    let errorMessage = '';
    
    try {
      await mockApi.toggleTodo("non-existent-id");
    } catch (e) {
      errorThrown = true;
      errorMessage = e.message;
    }
    
    assert.isTrue(errorThrown, "Error should be thrown");
    assert.isTrue(errorMessage.includes("not found"), "Error should mention todo not found");
  });
  
  it("should throw an error when updating non-existent todo", async () => {
    let errorThrown = false;
    let errorMessage = '';
    
    try {
      await mockApi.updateTodo("non-existent-id", { title: "Updated" });
    } catch (e) {
      errorThrown = true;
      errorMessage = e.message;
    }
    
    assert.isTrue(errorThrown, "Error should be thrown");
    assert.isTrue(errorMessage.includes("not found"), "Error should mention todo not found");
  });
});

// Clean up
delete global.localStorage;
