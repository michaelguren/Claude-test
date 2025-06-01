// infra/domains/todos/src/controller.js
// HTTP request routing and response handling for todos
// Updated to properly extract user email from JWT

import {
  parseBody,
  errorResponse,
  successResponse,
} from "infra/domains/_shared/utils/helpers.js";

import { logInfo, logError } from "infra/domains/_shared/utils/logger.js";

import * as service from "./service.js";

const extractUserEmail = (event) => {
  try {
    // Extract user email from Lambda authorizer context
    const authorizerContext = event.requestContext?.authorizer?.lambda;

    if (authorizerContext?.email) {
      const userEmail = authorizerContext.email;
      logInfo(
        "Controller.extractUserEmail",
        "User email from authorizer context",
        {
          userEmail: userEmail.substring(0, 3) + "***",
        }
      );
      return userEmail;
    }

    logWarning(
      "Controller.extractUserEmail",
      "No user email found in authorizer context"
    );
    return null;
  } catch (error) {
    logError("Controller.extractUserEmail", error);
    return null;
  }
};

const handleRequest = async (event) => {
  try {
    logInfo("Controller.handleRequest", "Processing TODO request", {
      routeKey: event.routeKey,
      pathParameters: event.pathParameters,
    });

    const userEmail = extractUserEmail(event);

    if (!userEmail) {
      return errorResponse(401, "User authentication required");
    }

    // Route based on HTTP method and path using event.routeKey (API Gateway v2.0)
    switch (event.routeKey) {
      case "GET /todos":
        return await listTodos(userEmail);

      case "POST /todos":
        return await createTodo(event, userEmail);

      case "GET /todos/{todoId}":
        return await getTodo(event.pathParameters.todoId, userEmail);

      case "PUT /todos/{todoId}":
        return await updateTodo(event.pathParameters.todoId, event, userEmail);

      case "DELETE /todos/{todoId}":
        return await deleteTodo(event.pathParameters.todoId, userEmail);

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

const createTodo = async (event, userEmail) => {
  try {
    let body;
    try {
      body = parseBody(event.body);
    } catch (parseError) {
      return errorResponse(400, "Invalid JSON in request body");
    }

    const todo = await service.createTodo(body, userEmail);
    logInfo("Controller.createTodo", "TODO created successfully", {
      todoId: todo.todoId,
      userEmail,
    });
    return successResponse(201, todo);
  } catch (error) {
    logError("Controller.createTodo", error, { userEmail });

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

const getTodo = async (todoId, userEmail) => {
  try {
    const todo = await service.getTodoById(todoId, userEmail);

    if (!todo) {
      return errorResponse(404, "TODO not found");
    }

    return successResponse(200, todo);
  } catch (error) {
    logError("Controller.getTodo", error, { todoId, userEmail });

    if (error.message.includes("Invalid TODO ID")) {
      return errorResponse(400, error.message);
    }

    return errorResponse(500, error.message);
  }
};

const listTodos = async (userEmail) => {
  try {
    const todos = await service.listTodos(userEmail);
    return successResponse(200, todos);
  } catch (error) {
    logError("Controller.listTodos", error, { userEmail });
    return errorResponse(500, error.message);
  }
};

const updateTodo = async (todoId, event, userEmail) => {
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

    const todo = await service.updateTodo(todoId, body, userEmail);
    logInfo("Controller.updateTodo", "TODO updated successfully", {
      todoId,
      userEmail,
    });
    return successResponse(200, todo);
  } catch (error) {
    logError("Controller.updateTodo", error, { todoId, userEmail });

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

const deleteTodo = async (todoId, userEmail) => {
  try {
    await service.deleteTodo(todoId, userEmail);
    logInfo("Controller.deleteTodo", "TODO deleted successfully", {
      todoId,
      userEmail,
    });
    return successResponse(204);
  } catch (error) {
    logError("Controller.deleteTodo", error, { todoId, userEmail });

    if (error.message.includes("not found")) {
      return errorResponse(404, error.message);
    }

    if (error.message.includes("Invalid TODO ID")) {
      return errorResponse(400, error.message);
    }

    return errorResponse(500, error.message);
  }
};

export { handleRequest };
