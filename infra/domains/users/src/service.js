const repository = require("./repository");
const validation = require("./validation");
const {
  getCurrentTimestamp,
  generateResourceId,
  generateULID,
} = require("../../shared/helpers");

const createUser = async (userData) => {
  // Validate input
  validation.validateCreateUser(userData);

  // Check if user already exists
  const existingUser = await repository.getUserByEmail(userData.email);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Build user object
  const user = {
    id: generateULID(),
    email: userData.email,
    name: userData.name || "",
    role: userData.role || "USER",
    status: "ACTIVE",
    emailVerified: false,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };

  // Save to database
  await repository.createUser(user);
  return user;
};

const getUserById = async (userId) => {
  const user = await repository.getUserById(userId);

  if (!user) {
    return null;
  }

  // Return clean user object
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const listUsers = async (options = {}) => {
  const { limit = 50 } = options;

  const result = await repository.listUsers(limit);

  // Clean up the response
  const users = result.users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));

  return {
    users,
    count: users.length,
    lastEvaluatedKey: result.lastEvaluatedKey,
  };
};

const updateUser = async (userId, updates) => {
  // Validate updates
  validation.validateUpdateUser(updates);

  // Add timestamp
  const updatesWithTimestamp = {
    ...updates,
    updatedAt: getCurrentTimestamp(),
  };

  // Update in database
  const updatedUser = await repository.updateUser(userId, updatesWithTimestamp);

  if (!updatedUser) {
    return null;
  }

  // Return clean user object
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
    status: updatedUser.status,
    emailVerified: updatedUser.emailVerified,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
  };
};

const deleteUser = async (userId) => {
  return await repository.deleteUser(userId);
};

module.exports = {
  createUser,
  getUserById,
  listUsers,
  updateUser,
  deleteUser,
};
