// infra/domains/todos/src/service.js
// Business logic for TODO management

const { generateULID, getCurrentTimestamp } = require("./utils-shared/helpers");
const { logError, logInfo } = require("./utils-shared/logger");
const repository = require("./repository");

const createTodo = async (userId, text) => {
  try {
    if (!userId) throw new Error("User ID is required");
    if (!text || text.trim() === "") throw new Error("TODO text is required");

    const todoId = generateULID();
    const now = getCurrentTimestamp();

    const todo = {
      todoId,
      userId,
      text: text.trim(),
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    await repository.createTodo(todo);
    logInfo("Service.createTodo", "TODO created successfully", {
      userId,
      todoId,
    });
    return todo;
  } catch (error) {
    logError("Service.createTodo", error, { userId });
    throw error;
  }
};

const getTodosByUser = async (userId) => {
  try {
    if (!userId) throw new Error("User ID is required");

    const todos = await repository.getTodosByUser(userId);
    logInfo("Service.getTodosByUser", `Retrieved ${todos.length} todos`, {
      userId,
    });

    // Sort by creation date (newest first)
    return todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    logError("Service.getTodosByUser", error, { userId });
    throw error;
  }
};

const updateTodo = async (userId, todoId, updates) => {
  try {
    if (!userId) throw new Error("User ID is required");
    if (!todoId) throw new Error("TODO ID is required");

    // Validate updates
    const allowedFields = ["text", "completed"];
    const validUpdates = {};

    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        if (field === "text") {
          if (typeof updates.text !== "string" || updates.text.trim() === "") {
            throw new Error("TODO text cannot be empty");
          }
          validUpdates.text = updates.text.trim();
        } else if (field === "completed") {
          if (typeof updates.completed !== "boolean") {
            throw new Error("Completed must be a boolean");
          }
          validUpdates.completed = updates.completed;
        }
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      throw new Error("No valid updates provided");
    }

    validUpdates.updatedAt = getCurrentTimestamp();

    const todo = await repository.updateTodo(userId, todoId, validUpdates);
    if (!todo) {
      throw new Error("TODO not found");
    }

    logInfo("Service.updateTodo", "TODO updated successfully", {
      userId,
      todoId,
      updates: Object.keys(validUpdates),
    });
    return todo;
  } catch (error) {
    logError("Service.updateTodo", error, { userId, todoId });
    throw error;
  }
};

const deleteTodo = async (userId, todoId) => {
  try {
    if (!userId) throw new Error("User ID is required");
    if (!todoId) throw new Error("TODO ID is required");

    const success = await repository.deleteTodo(userId, todoId);
    if (!success) {
      throw new Error("TODO not found");
    }

    logInfo("Service.deleteTodo", "TODO deleted successfully", {
      userId,
      todoId,
    });
    return success;
  } catch (error) {
    logError("Service.deleteTodo", error, { userId, todoId });
    throw error;
  }
};

module.exports = {
  createTodo,
  getTodosByUser,
  updateTodo,
  deleteTodo,
};
