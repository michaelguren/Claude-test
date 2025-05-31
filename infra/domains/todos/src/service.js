// infra/domains/todos/src/service.js
// Business logic for TODO management

const { generateULID, getCurrentTimestamp } = require("./utils-shared/helpers");
const { logError, logInfo } = require("./utils-shared/logger");
const repository = require("./repository");
const validation = require("./utils/validation");
const constants = require("./utils/constants");

const createTodo = async (todoData, userId) => {
  try {
    // Validate input
    const validatedData = validation.validateCreateTodo(todoData, userId);

    // Build TODO object
    const todo = {
      todoId: generateULID(),
      userId: validatedData.userId,
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
      userId: todo.userId,
    });

    return todo;
  } catch (error) {
    logError("Service.createTodo", error, { todoData, userId });
    throw error;
  }
};

const getTodoById = async (todoId, userId) => {
  try {
    validation.validateTodoId(todoId);
    validation.validateUserId(userId);

    const todo = await repository.getTodoById(todoId, userId);
    return todo;
  } catch (error) {
    logError("Service.getTodoById", error, { todoId, userId });
    throw error;
  }
};

const listTodos = async (userId, filters = {}) => {
  try {
    validation.validateUserId(userId);

    const todos = await repository.listTodosByUserId(userId);

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
        userId,
        totalTodos: todos.length,
        filteredTodos: filteredTodos.length,
      }
    );

    return filteredTodos;
  } catch (error) {
    logError("Service.listTodos", error, { userId, filters });
    throw error;
  }
};

const updateTodo = async (todoId, todoData, userId) => {
  try {
    validation.validateTodoId(todoId);
    validation.validateUserId(userId);
    const validatedUpdates = validation.validateUpdateTodo(todoData);

    // Check if TODO exists and belongs to user
    const existingTodo = await repository.getTodoById(todoId, userId);
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
      userId,
      updates: Object.keys(validatedUpdates),
    });

    return updatedTodo;
  } catch (error) {
    logError("Service.updateTodo", error, { todoId, todoData, userId });
    throw error;
  }
};

const deleteTodo = async (todoId, userId) => {
  try {
    validation.validateTodoId(todoId);
    validation.validateUserId(userId);

    // Check if TODO exists and belongs to user
    const existingTodo = await repository.getTodoById(todoId, userId);
    if (!existingTodo) {
      throw new Error("TODO not found");
    }

    // Delete TODO
    await repository.deleteTodo(todoId, userId);
    logInfo("Service.deleteTodo", "TODO deleted successfully", {
      todoId,
      userId,
    });
  } catch (error) {
    logError("Service.deleteTodo", error, { todoId, userId });
    throw error;
  }
};

const toggleTodo = async (todoId, userId) => {
  try {
    validation.validateTodoId(todoId);
    validation.validateUserId(userId);

    // Get current TODO
    const existingTodo = await repository.getTodoById(todoId, userId);
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
      userId,
      completed: updatedTodo.completed,
    });

    return updatedTodo;
  } catch (error) {
    logError("Service.toggleTodo", error, { todoId, userId });
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
