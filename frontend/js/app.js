/**
 * Main application logic for the TODO app
 * No external dependencies - pure vanilla JavaScript
 */

// Main application module
const App = (function () {
  // DOM Elements
  const elements = {
    todoForm: null,
    todoInput: null,
    todoList: null,
    filterButtons: null,
    signInButton: null,
    signOutButton: null,
    authSection: null,
    appSection: null,
    userInfo: null,
  };

  // Application state
  const state = {
    todos: [],
    filter: "all", // all, active, completed
  };

  // Initialize the application
  function init() {
    // Wait for config and auth to be loaded
    const dependenciesLoaded = setInterval(function () {
      if (window.APP_CONFIG && window.Auth && window.Api) {
        clearInterval(dependenciesLoaded);
        onDependenciesLoaded();
      }
    }, 100);
  }

  // Called when all dependencies are loaded
  function onDependenciesLoaded() {
    // Cache DOM elements
    cacheDomElements();

    // Initialize API
    window.Api.init(window.APP_CONFIG);

    // Initialize authentication
    const isAuthenticated = window.Auth.init();

    // Set up event listeners
    setupEventListeners();

    // Update UI based on authentication state
    updateAuthUI(isAuthenticated);

    // If authenticated, load the TODOs
    if (isAuthenticated) {
      loadTodos();
    }
  }

  // Cache frequently used DOM elements
  function cacheDomElements() {
    elements.todoForm = document.getElementById("todo-form");
    elements.todoInput = document.getElementById("todo-input");
    elements.todoList = document.getElementById("todo-list");
    elements.filterButtons = document.querySelectorAll(".filter-button");
    elements.signInButton = document.getElementById("sign-in-button");
    elements.signOutButton = document.getElementById("sign-out-button");
    elements.authSection = document.getElementById("auth-section");
    elements.appSection = document.getElementById("app-section");
    elements.userInfo = document.getElementById("user-info");
  }

  // Set up event listeners
  function setupEventListeners() {
    // Form submission
    if (elements.todoForm) {
      elements.todoForm.addEventListener("submit", onTodoFormSubmit);
    }

    // Filter buttons
    if (elements.filterButtons) {
      elements.filterButtons.forEach((button) => {
        button.addEventListener("click", onFilterButtonClick);
      });
    }

    // Auth buttons
    if (elements.signInButton) {
      elements.signInButton.addEventListener("click", onSignInClick);
    }

    if (elements.signOutButton) {
      elements.signOutButton.addEventListener("click", onSignOutClick);
    }
  }

  // Handle TODO form submission
  function onTodoFormSubmit(event) {
    event.preventDefault();

    const text = elements.todoInput.value.trim();

    if (text) {
      addTodo(text);
      elements.todoInput.value = "";
    }
  }

  // Handle filter button clicks
  function onFilterButtonClick(event) {
    const filter = event.target.dataset.filter;

    if (filter && filter !== state.filter) {
      state.filter = filter;

      // Update active button
      elements.filterButtons.forEach((button) => {
        if (button.dataset.filter === filter) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }
      });

      // Re-render todo list with the new filter
      renderTodos();
    }
  }

  // Handle sign in button click
  function onSignInClick() {
    window.Auth.signIn();
  }

  // Handle sign out button click
  function onSignOutClick() {
    window.Auth.signOut();
  }

  // Update UI based on authentication state
  function updateAuthUI(isAuthenticated) {
    if (isAuthenticated) {
      // Hide auth section
      if (elements.authSection) {
        elements.authSection.style.display = "none";
      }

      // Show app section
      if (elements.appSection) {
        elements.appSection.style.display = "block";
      }

      // Update user info
      if (elements.userInfo) {
        const userId = window.Auth.getUserId();
        elements.userInfo.textContent = `User ID: ${userId}`;
      }
    } else {
      // Show auth section
      if (elements.authSection) {
        elements.authSection.style.display = "block";
      }

      // Hide app section
      if (elements.appSection) {
        elements.appSection.style.display = "none";
      }
    }
  }

  // Load TODOs from the API
  async function loadTodos() {
    try {
      // Show loading state
      if (elements.todoList) {
        elements.todoList.innerHTML =
          '<li class="loading">Loading TODOs...</li>';
      }

      // Get TODOs from API
      const todos = await window.Api.getTodos();

      // Update state
      state.todos = todos;

      // Render TODOs
      renderTodos();
    } catch (error) {
      console.error("Error loading TODOs:", error);

      if (elements.todoList) {
        elements.todoList.innerHTML = `<li class="error">Error loading TODOs: ${error.message}</li>`;
      }
    }
  }

  // Add a new TODO
  async function addTodo(text) {
    try {
      // Call API to create TODO
      const newTodo = await window.Api.createTodo(text);

      // Add to state
      state.todos.push(newTodo);

      // Re-render todo list
      renderTodos();
    } catch (error) {
      console.error("Error adding TODO:", error);
      alert(`Error adding TODO: ${error.message}`);
    }
  }

  // Update a TODO
  async function updateTodo(todoId, updates) {
    try {
      // Call API to update TODO
      const updatedTodo = await window.Api.updateTodo(todoId, updates);

      // Update in state
      const index = state.todos.findIndex((todo) => todo.todoId === todoId);

      if (index !== -1) {
        state.todos[index] = updatedTodo;
      }

      // Re-render todo list
      renderTodos();
    } catch (error) {
      console.error("Error updating TODO:", error);
      alert(`Error updating TODO: ${error.message}`);
    }
  }

  // Delete a TODO
  async function deleteTodo(todoId) {
    try {
      // Call API to delete TODO
      await window.Api.deleteTodo(todoId);

      // Remove from state
      state.todos = state.todos.filter((todo) => todo.todoId !== todoId);

      // Re-render todo list
      renderTodos();
    } catch (error) {
      console.error("Error deleting TODO:", error);
      alert(`Error deleting TODO: ${error.message}`);
    }
  }

  // Toggle a TODO's completed status
  async function toggleTodo(todoId) {
    try {
      // Find the current todo
      const todo = state.todos.find((todo) => todo.todoId === todoId);

      if (!todo) {
        throw new Error(`TODO with ID ${todoId} not found`);
      }

      // Call API to toggle TODO
      const updatedTodo = await window.Api.toggleTodo(todoId);

      // Update in state
      const index = state.todos.findIndex((todo) => todo.todoId === todoId);

      if (index !== -1) {
        state.todos[index] = updatedTodo;
      }

      // Re-render todo list
      renderTodos();
    } catch (error) {
      console.error("Error toggling TODO:", error);
      alert(`Error toggling TODO: ${error.message}`);
    }
  }

  // Render TODOs based on the current filter
  function renderTodos() {
    if (!elements.todoList) {
      return;
    }

    // Filter TODOs based on current filter
    const filteredTodos = state.todos.filter((todo) => {
      if (state.filter === "active") {
        return !todo.completed;
      } else if (state.filter === "completed") {
        return todo.completed;
      }
      return true; // 'all' filter
    });

    // Clear the list
    elements.todoList.innerHTML = "";

    // Show a message if no TODOs
    if (filteredTodos.length === 0) {
      const message =
        state.todos.length === 0
          ? "No TODOs yet. Add one above!"
          : "No TODOs match the current filter.";

      elements.todoList.innerHTML = `<li class="empty">${message}</li>`;
      return;
    }

    // Add TODOs to the list
    filteredTodos.forEach((todo) => {
      const li = document.createElement("li");
      li.className = "todo-item";
      if (todo.completed) {
        li.classList.add("completed");
      }

      // Checkbox for toggling completion
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "todo-checkbox";
      checkbox.checked = todo.completed;
      checkbox.addEventListener("change", () => toggleTodo(todo.todoId));

      // TODO text
      const span = document.createElement("span");
      span.className = "todo-text";
      span.textContent = todo.text;

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "todo-delete";
      deleteBtn.textContent = "×";
      deleteBtn.title = "Delete";
      deleteBtn.addEventListener("click", () => deleteTodo(todo.todoId));

      // Append elements
      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(deleteBtn);

      elements.todoList.appendChild(li);
    });
  }

  // Public API
  return {
    init,
  };
})();

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", App.init);
