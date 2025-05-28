const {
  validateRequired,
  validateEmail,
  validateEnum,
  validateLength,
  sanitizeString,
} = require("../../shared/validation");

const validateCreateUser = (userData) => {
  validateRequired(userData.email, "Email");

  if (!validateEmail(userData.email)) {
    throw new Error("Invalid email format");
  }

  if (userData.name) {
    validateLength(userData.name, 1, 100, "Name");
  }

  if (userData.role) {
    validateEnum(userData.role, ["USER", "ADMIN"], "Role");
  }

  // Sanitize inputs
  userData.email = sanitizeString(userData.email).toLowerCase();
  if (userData.name) {
    userData.name = sanitizeString(userData.name);
  }
};

const validateUpdateUser = (updates) => {
  const allowedFields = ["name", "status", "role"];
  const validUpdates = {};

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      validUpdates[field] = updates[field];
    }
  });

  if (Object.keys(validUpdates).length === 0) {
    throw new Error("No valid fields to update");
  }

  // Validate specific fields
  if (updates.name !== undefined) {
    validateLength(updates.name, 1, 100, "Name");
    updates.name = sanitizeString(updates.name);
  }

  if (updates.role !== undefined) {
    validateEnum(updates.role, ["USER", "ADMIN"], "Role");
  }

  if (updates.status !== undefined) {
    validateEnum(updates.status, ["ACTIVE", "INACTIVE"], "Status");
  }
};

module.exports = {
  validateCreateUser,
  validateUpdateUser,
};
