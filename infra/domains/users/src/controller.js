const service = require("./service");
const { successResponse, errorResponse } = require("../../shared/responses");
const { parseBody } = require("../../shared/helpers");

const handleRequest = async (event) => {
  const { httpMethod, pathParameters } = event;
  const userId = pathParameters?.id;

  try {
    switch (httpMethod) {
      case "POST":
        return await createUser(parseBody(event.body));
      case "GET":
        if (userId) {
          return await getUser(userId);
        } else {
          return await listUsers();
        }
      case "PUT":
        return await updateUser(userId, parseBody(event.body));
      case "DELETE":
        return await deleteUser(userId);
      default:
        return errorResponse(405, "Method Not Allowed");
    }
  } catch (error) {
    console.error("Error in user controller:", error);
    return errorResponse(500, error.message);
  }
};

const createUser = async (userData) => {
  try {
    const user = await service.createUser(userData);
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
  if (!userId) {
    return errorResponse(400, "User ID is required");
  }

  try {
    const user = await service.getUserById(userId);
    if (!user) {
      return errorResponse(404, "User not found");
    }
    return successResponse(200, user);
  } catch (error) {
    throw error;
  }
};

const listUsers = async () => {
  try {
    const result = await service.listUsers();
    return successResponse(200, result);
  } catch (error) {
    throw error;
  }
};

const updateUser = async (userId, updates) => {
  if (!userId) {
    return errorResponse(400, "User ID is required");
  }

  try {
    const user = await service.updateUser(userId, updates);
    if (!user) {
      return errorResponse(404, "User not found");
    }
    return successResponse(200, user);
  } catch (error) {
    if (
      error.message.includes("No valid fields") ||
      error.message.includes("Invalid")
    ) {
      return errorResponse(400, error.message);
    }
    throw error;
  }
};

const deleteUser = async (userId) => {
  if (!userId) {
    return errorResponse(400, "User ID is required");
  }

  try {
    const deleted = await service.deleteUser(userId);
    if (!deleted) {
      return errorResponse(404, "User not found");
    }
    return successResponse(204, null);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  handleRequest,
};
