// domains/users/controller.js
// HTTP request routing and response handling for users

import {
  parseBody,
  errorResponse,
  successResponse,
} from "infra/domains/_shared/utils/helpers.js";

import { logError, logInfo } from "infra/domains/_shared/utils/logger.js";

import * as service from "./service.js";

const handleRequest = async (event) => {
  try {
    // Route based on event.routeKey (HTTP API v2.0 format)
    switch (event.routeKey) {
      case "GET /users":
        return await listUsers();

      case "GET /users/{userId}":
        return await getUser(event.pathParameters.userId);

      case "POST /users":
        return await createUser(event);

      case "PUT /users/{userId}":
        return await updateUser(event.pathParameters.userId, event);

      case "DELETE /users/{userId}":
        return await deleteUser(event.pathParameters.userId);

      default:
        return errorResponse(405, "Method Not Allowed");
    }
  } catch (error) {
    logError("Controller.handleRequest", error);
    return errorResponse(500, error.message);
  }
};

const createUser = async (event) => {
  try {
    let body;
    try {
      body = parseBody(event.body);
    } catch (parseError) {
      return errorResponse(400, "Invalid JSON in request body");
    }

    const user = await service.createUser(body);
    logInfo("Controller.createUser", "User created successfully", {
      userId: user.id,
      email: user.email,
    });
    return successResponse(201, user);
  } catch (error) {
    logError("Controller.createUser", error);

    if (error.message.includes("already exists")) {
      return errorResponse(409, error.message);
    }

    if (
      error.message.includes("required") ||
      error.message.includes("Invalid")
    ) {
      return errorResponse(400, error.message);
    }

    throw error;
  }
};

const getUser = async (userId) => {
  try {
    const user = await service.getUserById(userId);
    if (!user) {
      return errorResponse(404, "User not found");
    }
    return successResponse(200, user);
  } catch (error) {
    logError("Controller.getUser", error, { userId });

    if (error.message.includes("Invalid User ID")) {
      return errorResponse(400, error.message);
    }

    throw error;
  }
};

const listUsers = async () => {
  try {
    const users = await service.listUsers();
    return successResponse(200, users);
  } catch (error) {
    logError("Controller.listUsers", error);
    throw error;
  }
};

const updateUser = async (userId, event) => {
  try {
    if (!userId) {
      return errorResponse(400, "User ID is required");
    }

    let body;
    try {
      body = parseBody(event.body);
    } catch (parseError) {
      return errorResponse(400, "Invalid JSON in request body");
    }

    const user = await service.updateUser(userId, body);
    logInfo("Controller.updateUser", "User updated successfully", { userId });
    return successResponse(200, user);
  } catch (error) {
    logError("Controller.updateUser", error, { userId });

    if (error.message.includes("not found")) {
      return errorResponse(404, error.message);
    }

    if (
      error.message.includes("required") ||
      error.message.includes("Invalid") ||
      error.message.includes("already taken")
    ) {
      return errorResponse(400, error.message);
    }

    throw error;
  }
};

const deleteUser = async (userId) => {
  try {
    if (!userId) {
      return errorResponse(400, "User ID is required");
    }

    await service.deleteUser(userId);
    logInfo("Controller.deleteUser", "User deleted successfully", { userId });
    return successResponse(204);
  } catch (error) {
    logError("Controller.deleteUser", error, { userId });

    if (error.message.includes("not found")) {
      return errorResponse(404, error.message);
    }

    if (error.message.includes("Invalid User ID")) {
      return errorResponse(400, error.message);
    }

    throw error;
  }
};

export { handleRequest };
