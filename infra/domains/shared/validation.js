const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === "string" && value.trim() === "")) {
    throw new Error(`${fieldName} is required`);
  }
};

const sanitizeString = (input) => {
  if (typeof input === "string") {
    return input.trim();
  }
  return input;
};

const validateLength = (value, min, max, fieldName) => {
  if (typeof value === "string") {
    if (value.length < min) {
      throw new Error(`${fieldName} must be at least ${min} characters`);
    }
    if (value.length > max) {
      throw new Error(`${fieldName} must be no more than ${max} characters`);
    }
  }
};

const validateEnum = (value, allowedValues, fieldName) => {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(", ")}`);
  }
};

module.exports = {
  validateEmail,
  validateRequired,
  sanitizeString,
  validateLength,
  validateEnum,
};
