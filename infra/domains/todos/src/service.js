// infra/domains/todos/src/service.js
// Business logic for TODO management

const { generateULID, getCurrentTimestamp } = require("./utils-shared/helpers");
const { logError, logInfo } = require("./utils-shared/logger");
const repository = require("./repository");
const validation = require("./utils/validation");
const constants = require("./utils/constants");

const createTodo = async (todoData, userEmail) => {
  try {
    // Validate input
    const validatedData = validation.validateCreateTodo(todoData);

    // Build TODO object
    const todo = {
      todoId: generateULID(),
      userEmail: userEmail,
      text: validatedData.text,
      completed: false,
      status: constants.TODO_STATUS_ACTIVE,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    // Save to database
    await repository.createTodo(todo);
    logInfo("Service.createTodo", "TODO created successfully", {
      todoId: todo.todoId,
      userEmail: todo.userEmail,
    });

    return todo;
  } catch (error) {
    logError("Service.createTodo", error, { todoData, userEmail });
    throw error;
  }
};

const getTodoById = async (todoId, userEmail) => {
  try {
    validation.validateTodoId(todoId);

    const todo = await repository.getTodoById(todoId, userEmail);
    return todo;
  } catch (error) {
    logError("Service.getTodoById", error, { todoId, userEmail });
    throw error;
  }
};

const listTodos = async (userEmail, filters = {}) => {
  try {
    const todos = await repository.listTodosByUserEmail(userEmail);

    // Apply client-side filtering if needed
    let filteredTodos = todos;

    if (filters.completed !== undefined) {
      filteredTodos = todos.filter(
        (todo) => todo.completed === filters.completed
      );
    }

    if (filters.status) {
      filteredTodos = filteredTodos.filter(
        (todo) => todo.status === filters.status
      );
    }

    logInfo(
      "Service.listTodos",
      `Retrieved ${filteredTodos.length} todos for user`,
      {
        userEmail,
        totalTodos: todos.length,
        filteredTodos: filteredTodos.length,
      }
    );

    return filteredTodos;
  } catch (error) {
    logError("Service.listTodos", error, { userEmail, filters });
    throw error;
  }
};

const updateTodo = async (todoId, todoData, userEmail) => {
  try {
    validation.validateTodoId(todoId);
    const validatedUpdates = validation.validateUpdateTodo(todoData);

    // Check if TODO exists and belongs to user
    const existingTodo = await repository.getTodoById(todoId, userEmail);
    if (!existingTodo) {
      throw new Error("TODO not found");
    }

    // Build update object
    const updatedTodo = {
      ...existingTodo,
      ...validatedUpdates,
      updatedAt: getCurrentTimestamp(),
    };

    // Update status based on completed flag
    if (validatedUpdates.completed !== undefined) {
      updatedTodo.status = validatedUpdates.completed
        ? constants.TODO_STATUS_COMPLETED
        : constants.TODO_STATUS_ACTIVE;
    }

    // Save changes
    await repository.updateTodo(updatedTodo);
    logInfo("Service.updateTodo", "TODO updated successfully", {
      todoId,
      userEmail,
      updates: Object.keys(validatedUpdates),
    });

    return updatedTodo;
  } catch (error) {
    logError("Service.updateTodo", error, { todoId, todoData, userEmail });
    throw error;
  }
};

const deleteTodo = async (todoId, userEmail) => {
  try {
    validation.validateTodoId(todoId);

    // Check if TODO exists and belongs to user
    const existingTodo = await repository.getTodoById(todoId, userEmail);
    if (!existingTodo) {
      throw new Error("TODO not found");
    }

    // Delete TODO
    await repository.deleteTodo(todoId, userEmail);
    logInfo("Service.deleteTodo", "TODO deleted successfully", {
      todoId,
      userEmail,
    });
  } catch (error) {
    logError("Service.deleteTodo", error, { todoId, userEmail });
    throw error;
  }
};

const toggleTodo = async (todoId, userEmail) => {
  try {
    validation.validateTodoId(todoId);

    // Get current TODO
    const existingTodo = await repository.getTodoById(todoId, userEmail);
    if (!existingTodo) {
      throw new Error("TODO not found");
    }

    // Toggle completed status
    const updatedTodo = {
      ...existingTodo,
      completed: !existingTodo.completed,
      status: !existingTodo.completed
        ? constants.TODO_STATUS_COMPLETED
        : constants.TODO_STATUS_ACTIVE,
      updatedAt: getCurrentTimestamp(),
    };

    await repository.updateTodo(updatedTodo);
    logInfo("Service.toggleTodo", "TODO toggled successfully", {
      todoId,
      userEmail,
      completed: updatedTodo.completed,
    });

    return updatedTodo;
  } catch (error) {
    logError("Service.toggleTodo", error, { todoId, userEmail });
    throw error;
  }
};

module.exports = {
  createTodo,
  getTodoById,
  listTodos,
  updateTodo,
  deleteTodo,
  toggleTodo,
};
