// domains/users/service.js
// Business logic for user management

const repository = require("./repository");
const validation = require("./utils/validation");
const { generateULID, getCurrentTimestamp } = require("./utils/helpers");
const constants = require("./utils/constants");
const { logInfo, logError } = require("./utils/logger");

const createUser = async (userData) => {
  try {
    // Validate input
    const validatedData = validation.validateCreateUser(userData);

    // Check if user already exists
    const existingUser = await repository.getUserByEmail(validatedData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Build user object
    const user = {
      id: generateULID(),
      email: validatedData.email,
      name: validatedData.name,
      role: validatedData.role || constants.DEFAULT_ROLE,
      status: constants.DEFAULT_STATUS,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    // Save to database
    await repository.createUser(user);
    logInfo("Service.createUser", "User created successfully", {
      userId: user.id,
      email: user.email,
    });

    return user;
  } catch (error) {
    logError("Service.createUser", error, { userData });
    throw error;
  }
};

const getUserById = async (userId) => {
  try {
    validation.validateUserId(userId);
    const user = await repository.getUserById(userId);
    return user;
  } catch (error) {
    logError("Service.getUserById", error, { userId });
    throw error;
  }
};

const getUserByEmail = async (email) => {
  try {
    validation.validateEmail(email);
    const user = await repository.getUserByEmail(email);
    return user;
  } catch (error) {
    logError("Service.getUserByEmail", error, { email });
    throw error;
  }
};

const listUsers = async () => {
  try {
    const users = await repository.listUsers();
    logInfo("Service.listUsers", `Retrieved ${users.length} users`);
    return users;
  } catch (error) {
    logError("Service.listUsers", error);
    throw error;
  }
};

const updateUser = async (userId, userData) => {
  try {
    validation.validateUserId(userId);
    const validatedUpdates = validation.validateUpdateUser(userData);

    // Check if user exists
    const existingUser = await repository.getUserById(userId);
    if (!existingUser) {
      throw new Error("User not found");
    }

    // If email is being changed, check it's not taken
    if (
      validatedUpdates.email &&
      validatedUpdates.email !== existingUser.email
    ) {
      const emailTaken = await repository.getUserByEmail(
        validatedUpdates.email
      );
      if (emailTaken) {
        throw new Error("Email address is already taken");
      }
    }

    // Build update object
    const updatedUser = {
      ...existingUser,
      ...validatedUpdates,
      updatedAt: getCurrentTimestamp(),
    };

    // Save changes
    await repository.updateUser(updatedUser);
    logInfo("Service.updateUser", "User updated successfully", {
      userId,
      updates: Object.keys(validatedUpdates),
    });

    return updatedUser;
  } catch (error) {
    logError("Service.updateUser", error, { userId, userData });
    throw error;
  }
};

const deleteUser = async (userId) => {
  try {
    validation.validateUserId(userId);

    // Check if user exists
    const existingUser = await repository.getUserById(userId);
    if (!existingUser) {
      throw new Error("User not found");
    }

    // Delete user
    await repository.deleteUser(userId);
    logInfo("Service.deleteUser", "User deleted successfully", { userId });
  } catch (error) {
    logError("Service.deleteUser", error, { userId });
    throw error;
  }
};

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  listUsers,
  updateUser,
  deleteUser,
};
