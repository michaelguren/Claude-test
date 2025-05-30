// domains/users/controller.js
// HTTP request routing and response handling for users

const service = require("./service");
const {
  parseBody,
  errorResponse,
  successResponse,
} = require("./utils/helpers");
const { logError, logInfo } = require("./utils/logger");

const handleRequest = async (event) => {
  try {
    const httpMethod = event.requestContext?.http?.method;
    const pathParameters = event.pathParameters; // still undefined if not in route

    switch (httpMethod) {
      case "GET":
        if (pathParameters && pathParameters.userId) {
          return await getUser(pathParameters.userId);
        } else {
          return await listUsers();
        }

      case "POST":
        return await createUser(event);

      case "PUT":
        if (!pathParameters?.userId) {
          return errorResponse(400, "User ID is required for update");
        }
        return await updateUser(pathParameters.userId, event);

      case "DELETE":
        if (!pathParameters?.userId) {
          return errorResponse(400, "User ID is required for delete");
        }
        return await deleteUser(pathParameters.userId);

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
    } catch (err) {
      return errorResponse(400, "Invalid JSON in request body");
    }

    const user = await service.createUser(body);
    logInfo("Controller.createUser", "User created successfully", {
      userId: user.id,
    });
    return successResponse(201, user);
  } catch (error) {
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
    } catch (err) {
      return errorResponse(400, "Invalid JSON in request body");
    }

    const user = await service.updateUser(userId, body);
    if (!user) {
      return errorResponse(404, "User not found");
    }
    logInfo("Controller.updateUser", "User updated successfully", { userId });
    return successResponse(200, user);
  } catch (error) {
    if (error.message.includes("not found")) {
      return errorResponse(404, error.message);
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

const deleteUser = async (userId) => {
  try {
    if (!userId) {
      return errorResponse(400, "User ID is required");
    }
    await service.deleteUser(userId);
    logInfo("Controller.deleteUser", "User deleted successfully", { userId });
    return successResponse(204);
  } catch (error) {
    if (error.message.includes("not found")) {
      return errorResponse(404, error.message);
    }
    if (error.message.includes("Invalid User ID")) {
      return errorResponse(400, error.message);
    }
    throw error;
  }
};

module.exports = { handleRequest };
