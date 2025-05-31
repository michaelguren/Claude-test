// infra/domains/todos/src/controller.js
// HTTP request routing and response handling for todos
// Updated to properly extract user ID from JWT

const {
  parseBody,
  errorResponse,
  successResponse,
} = require("./utils-shared/helpers");
const { logInfo, logError } = require("./utils-shared/logger");
const service = require("./service");

/**
 * Extract user ID from JWT token or fallback header
 * Priority: JWT claims > x-user-id header > hardcoded fallback
 */
const extractUserId = (event) => {
  // Option 1: From JWT claims (when API Gateway JWT authorizer is configured)
  const jwtUserId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (jwtUserId) {
    logInfo("Controller.extractUserId", "User ID from JWT", {
      userId: jwtUserId,
    });
    return jwtUserId;
  }

  // Option 2: From custom JWT claims (if you store user ID differently)
  const customUserId = event.requestContext?.authorizer?.jwt?.claims?.userId;
  if (customUserId) {
    logInfo("Controller.extractUserId", "User ID from custom JWT claim", {
      userId: customUserId,
    });
    return customUserId;
  }

  // Option 3: From Lambda authorizer context (if using custom authorizer)
  const authorizerUserId = event.requestContext?.authorizer?.userId;
  if (authorizerUserId) {
    logInfo("Controller.extractUserId", "User ID from authorizer context", {
      userId: authorizerUserId,
    });
    return authorizerUserId;
  }

  // Option 4: Temporary fallback - x-user-id header (development/testing only)
  const headerUserId =
    event.headers?.["x-user-id"] || event.headers?.["X-User-Id"];
  if (headerUserId) {
    logInfo("Controller.extractUserId", "User ID from header (dev mode)", {
      userId: headerUserId,
    });
    return headerUserId;
  }

  // Option 5: Hardcoded fallback (should be removed in production)
  const fallbackUserId = "01JWKQB7D1Q1P2GF8EA6PSK60F"; // mguren@mac.com user
  logInfo(
    "Controller.extractUserId",
    "Using hardcoded fallback user ID (remove in production)",
    { userId: fallbackUserId }
  );
  return fallbackUserId;
};

const handleRequest = async (event) => {
  try {
    logInfo("Controller.handleRequest", "Processing TODO request", {
      routeKey: event.routeKey,
      pathParameters: event.pathParameters,
    });

    // Extract user ID from JWT token or fallback methods
    const userId = extractUserId(event);

    if (!userId) {
      return errorResponse(401, "User authentication required");
    }

    // Route based on HTTP method and path using event.routeKey (API Gateway v2.0)
    switch (event.routeKey) {
      case "GET /todos":
        return await listTodos(userId);

      case "POST /todos":
        return await createTodo(event, userId);

      case "GET /todos/{todoId}":
        return await getTodo(event.pathParameters.todoId, userId);

      case "PUT /todos/{todoId}":
        return await updateTodo(event.pathParameters.todoId, event, userId);

      case "DELETE /todos/{todoId}":
        return await deleteTodo(event.pathParameters.todoId, userId);

      case "OPTIONS /todos":
      case "OPTIONS /todos/{todoId}":
        // CORS preflight is handled by CORS wrapper, but we can handle it here too
        return successResponse(200, null);

      default:
        logError(
          "Controller.handleRequest",
          new Error(`Unsupported route: ${event.routeKey}`)
        );
        return errorResponse(405, "Method Not Allowed");
    }
  } catch (error) {
    logError("Controller.handleRequest", error);
    return errorResponse(500, error.message);
  }
};

const createTodo = async (event, userId) => {
  try {
    let body;
    try {
      body = parseBody(event.body);
    } catch (parseError) {
      return errorResponse(400, "Invalid JSON in request body");
    }

    const todo = await service.createTodo(body, userId);
    logInfo("Controller.createTodo", "TODO created successfully", {
      todoId: todo.todoId,
      userId,
    });
    return successResponse(201, todo);
  } catch (error) {
    logError("Controller.createTodo", error, { userId });

    if (error.message.includes("already exists")) {
      return errorResponse(409, error.message);
    }

    if (
      error.message.includes("required") ||
      error.message.includes("Invalid") ||
      error.message.includes("cannot exceed")
    ) {
      return errorResponse(400, error.message);
    }

    return errorResponse(500, error.message);
  }
};

const getTodo = async (todoId, userId) => {
  try {
    const todo = await service.getTodoById(todoId, userId);

    if (!todo) {
      return errorResponse(404, "TODO not found");
    }

    return successResponse(200, todo);
  } catch (error) {
    logError("Controller.getTodo", error, { todoId, userId });

    if (error.message.includes("Invalid TODO ID")) {
      return errorResponse(400, error.message);
    }

    return errorResponse(500, error.message);
  }
};

const listTodos = async (userId) => {
  try {
    const todos = await service.listTodos(userId);
    return successResponse(200, todos);
  } catch (error) {
    logError("Controller.listTodos", error, { userId });
    return errorResponse(500, error.message);
  }
};

const updateTodo = async (todoId, event, userId) => {
  try {
    if (!todoId) {
      return errorResponse(400, "TODO ID is required");
    }

    let body;
    try {
      body = parseBody(event.body);
    } catch (parseError) {
      return errorResponse(400, "Invalid JSON in request body");
    }

    const todo = await service.updateTodo(todoId, body, userId);
    logInfo("Controller.updateTodo", "TODO updated successfully", {
      todoId,
      userId,
    });
    return successResponse(200, todo);
  } catch (error) {
    logError("Controller.updateTodo", error, { todoId, userId });

    if (error.message.includes("not found")) {
      return errorResponse(404, error.message);
    }

    if (
      error.message.includes("required") ||
      error.message.includes("Invalid") ||
      error.message.includes("cannot exceed")
    ) {
      return errorResponse(400, error.message);
    }

    return errorResponse(500, error.message);
  }
};

const deleteTodo = async (todoId, userId) => {
  try {
    await service.deleteTodo(todoId, userId);
    logInfo("Controller.deleteTodo", "TODO deleted successfully", {
      todoId,
      userId,
    });
    return successResponse(204);
  } catch (error) {
    logError("Controller.deleteTodo", error, { todoId, userId });

    if (error.message.includes("not found")) {
      return errorResponse(404, error.message);
    }

    if (error.message.includes("Invalid TODO ID")) {
      return errorResponse(400, error.message);
    }

    return errorResponse(500, error.message);
  }
};

module.exports = {
  handleRequest,
};
