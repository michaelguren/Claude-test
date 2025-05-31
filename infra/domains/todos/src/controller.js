// infra/domains/todos/src/controller.js
// HTTP request routing and response handling for todos

const {
  parseBody,
  errorResponse,
  successResponse,
} = require("./utils-shared/helpers");
const { logError, logInfo } = require("./utils-shared/logger");
const service = require("./service");

const handleRequest = async (event) => {
  try {
    // Extract user ID from JWT token (placeholder for now)
    const userId = extractUserIdFromToken(event);

    if (!userId) {
      return errorResponse(401, "Authentication required");
    }

    // Route based on event.routeKey (HTTP API v2.0 format)
    switch (event.routeKey) {
      case "GET /todos":
        return await listTodos(userId);

      case "POST /todos":
        return await createTodo(userId, event);

      case "PUT /todos/{todoId}":
        return await updateTodo(userId, event.pathParameters.todoId, event);

      case "DELETE /todos/{todoId}":
        return await deleteTodo(userId, event.pathParameters.todoId);

      default:
        return errorResponse(404, "Route not found");
    }
  } catch (error) {
    logError("Controller.handleRequest", error);
    return errorResponse(500, error.message);
  }
};

const extractUserIdFromToken = (event) => {
  try {
    // Get Authorization header
    const authHeader =
      event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.substring(7);
    if (!token) {
      return null;
    }

    // Parse JWT token (simple parsing - no verification for now)
    // JWT format: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (base64url)
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

    // Extract user ID from 'sub' claim
    return payload.sub || null;
  } catch (error) {
    console.error("Error extracting user ID from token:", error);
    return null;
  }
};

const listTodos = async (userId) => {
  try {
    const todos = await service.getTodosByUser(userId);
    logInfo("Controller.listTodos", `Retrieved ${todos.length} todos`, {
      userId,
    });
    return successResponse(200, todos);
  } catch (error) {
    logError("Controller.listTodos", error, { userId });
    return errorResponse(500, error.message);
  }
};

const createTodo = async (userId, event) => {
  try {
    const body = parseBody(event.body);
    const { text } = body;

    if (!text || text.trim() === "") {
      return errorResponse(400, "TODO text is required");
    }

    const todo = await service.createTodo(userId, text.trim());
    logInfo("Controller.createTodo", "TODO created successfully", {
      userId,
      todoId: todo.todoId,
    });
    return successResponse(201, todo);
  } catch (error) {
    logError("Controller.createTodo", error, { userId });
    if (
      error.message.includes("required") ||
      error.message.includes("cannot be empty")
    ) {
      return errorResponse(400, error.message);
    }
    return errorResponse(500, error.message);
  }
};

const updateTodo = async (userId, todoId, event) => {
  try {
    if (!todoId) {
      return errorResponse(400, "TODO ID is required");
    }

    const body = parseBody(event.body);
    const todo = await service.updateTodo(userId, todoId, body);

    logInfo("Controller.updateTodo", "TODO updated successfully", {
      userId,
      todoId,
    });
    return successResponse(200, todo);
  } catch (error) {
    logError("Controller.updateTodo", error, { userId, todoId });
    if (error.message.includes("not found")) {
      return errorResponse(404, error.message);
    }
    if (
      error.message.includes("required") ||
      error.message.includes("cannot be empty") ||
      error.message.includes("must be")
    ) {
      return errorResponse(400, error.message);
    }
    return errorResponse(500, error.message);
  }
};

const deleteTodo = async (userId, todoId) => {
  try {
    if (!todoId) {
      return errorResponse(400, "TODO ID is required");
    }

    await service.deleteTodo(userId, todoId);
    logInfo("Controller.deleteTodo", "TODO deleted successfully", {
      userId,
      todoId,
    });
    return successResponse(204);
  } catch (error) {
    logError("Controller.deleteTodo", error, { userId, todoId });
    if (error.message.includes("not found")) {
      return errorResponse(404, error.message);
    }
    return errorResponse(500, error.message);
  }
};

module.exports = { handleRequest };
