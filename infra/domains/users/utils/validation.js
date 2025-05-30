// domains/users/utils/validation.js
// Validation logic specific to user domain

const {
  isValidEmail,
  isValidULID,
  sanitizeString,
  isNotEmpty,
} = require("./helpers");
const constants = require("./constants");

const validateCreateUser = (userData) => {
  if (!userData || typeof userData !== "object") {
    throw new Error("User data is required");
  }

  // Validate email
  if (!isNotEmpty(userData.email)) {
    throw new Error("Email is required");
  }

  if (!isValidEmail(userData.email)) {
    throw new Error("Invalid email format");
  }

  // Validate name
  if (!isNotEmpty(userData.name)) {
    throw new Error("Name is required");
  }

  const sanitizedName = sanitizeString(
    userData.name,
    constants.MAX_NAME_LENGTH
  );
  if (sanitizedName.length < constants.MIN_NAME_LENGTH) {
    throw new Error(
      `Name must be at least ${constants.MIN_NAME_LENGTH} characters long`
    );
  }

  // Validate role
  if (userData.role && !constants.VALID_ROLES.includes(userData.role)) {
    throw new Error(
      `Invalid role. Must be one of: ${constants.VALID_ROLES.join(", ")}`
    );
  }

  // Return sanitized data
  return {
    email: userData.email.toLowerCase().trim(),
    name: sanitizedName,
    role: userData.role || constants.DEFAULT_ROLE,
  };
};

const validateUpdateUser = (userData) => {
  if (!userData || typeof userData !== "object") {
    throw new Error("User data is required");
  }

  const updates = {};

  // Validate email if provided
  if (userData.email !== undefined) {
    if (!isNotEmpty(userData.email)) {
      throw new Error("Email cannot be empty");
    }
    if (!isValidEmail(userData.email)) {
      throw new Error("Invalid email format");
    }
    updates.email = userData.email.toLowerCase().trim();
  }

  // Validate name if provided
  if (userData.name !== undefined) {
    if (!isNotEmpty(userData.name)) {
      throw new Error("Name cannot be empty");
    }
    const sanitizedName = sanitizeString(
      userData.name,
      constants.MAX_NAME_LENGTH
    );
    if (sanitizedName.length < constants.MIN_NAME_LENGTH) {
      throw new Error(
        `Name must be at least ${constants.MIN_NAME_LENGTH} characters long`
      );
    }
    updates.name = sanitizedName;
  }

  // Validate role if provided
  if (userData.role !== undefined) {
    if (!constants.VALID_ROLES.includes(userData.role)) {
      throw new Error(
        `Invalid role. Must be one of: ${constants.VALID_ROLES.join(", ")}`
      );
    }
    updates.role = userData.role;
  }

  // Validate status if provided
  if (userData.status !== undefined) {
    if (!constants.VALID_STATUSES.includes(userData.status)) {
      throw new Error(
        `Invalid status. Must be one of: ${constants.VALID_STATUSES.join(", ")}`
      );
    }
    updates.status = userData.status;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one field must be provided for update");
  }

  return updates;
};

const validateUserId = (userId) => {
  if (!isNotEmpty(userId)) {
    throw new Error("User ID is required");
  }

  if (!isValidULID(userId)) {
    throw new Error("Invalid User ID format");
  }

  return userId;
};

const validateEmail = (email) => {
  if (!isNotEmpty(email)) {
    throw new Error("Email is required");
  }

  if (!isValidEmail(email)) {
    throw new Error("Invalid email format");
  }

  return email.toLowerCase().trim();
};

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateUserId,
  validateEmail,
};
