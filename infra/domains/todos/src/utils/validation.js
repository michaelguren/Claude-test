// infra/domains/todos/src/utils/validation.js
// Validation logic specific to TODO domain

import {
  isNotEmpty,
  isValidULID,
  sanitizeString,
} from "infra/domains/_shared/helpers.js";

import * as constants from "infra/domains/_shared/utils/constants.js";

const validateCreateTodo = (todoData) => {
  if (!todoData) {
    throw new Error("TODO data is required");
  }

  // Validate text
  if (!isNotEmpty(todoData.text)) {
    throw new Error("TODO text is required");
  }

  const sanitizedText = sanitizeString(
    todoData.text,
    constants.TODO_TEXT_MAX_LENGTH
  );

  if (sanitizedText.length < constants.TODO_TEXT_MIN_LENGTH) {
    throw new Error(
      `TODO text must be at least ${constants.TODO_TEXT_MIN_LENGTH} character long`
    );
  }

  if (sanitizedText.length > constants.TODO_TEXT_MAX_LENGTH) {
    throw new Error(
      `TODO text cannot exceed ${constants.TODO_TEXT_MAX_LENGTH} characters`
    );
  }

  // Return sanitized data
  return {
    text: sanitizedText,
  };
};

const validateUpdateTodo = (todoData) => {
  if (!todoData || typeof todoData !== "object") {
    throw new Error("TODO data is required");
  }

  const updates = {};

  // Validate text if provided
  if (todoData.text !== undefined) {
    if (!isNotEmpty(todoData.text)) {
      throw new Error("TODO text cannot be empty");
    }

    const sanitizedText = sanitizeString(
      todoData.text,
      constants.TODO_TEXT_MAX_LENGTH
    );

    if (sanitizedText.length < constants.TODO_TEXT_MIN_LENGTH) {
      throw new Error(
        `TODO text must be at least ${constants.TODO_TEXT_MIN_LENGTH} character long`
      );
    }

    updates.text = sanitizedText;
  }

  // Validate completed status if provided
  if (todoData.completed !== undefined) {
    if (typeof todoData.completed !== "boolean") {
      throw new Error("Completed status must be a boolean");
    }
    updates.completed = todoData.completed;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one field must be provided for update");
  }

  return updates;
};

const validateTodoId = (todoId) => {
  if (!isNotEmpty(todoId)) {
    throw new Error("TODO ID is required");
  }

  if (!isValidULID(todoId)) {
    throw new Error("Invalid TODO ID format");
  }

  return todoId;
};

export { validateCreateTodo, validateUpdateTodo, validateTodoId };
