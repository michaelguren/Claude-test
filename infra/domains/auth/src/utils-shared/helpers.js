// domains/users/utils/helpers.js
// Utility functions for user domain

const { ulid } = require("ulid");

const generateULID = () => ulid();

// Get current timestamp in ISO format
const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

// Parse JSON body from Lambda event
const parseBody = (body) => {
  if (!body) {
    return {};
  }

  try {
    return typeof body === "string" ? JSON.parse(body) : body;
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
};

// Standard error response
const errorResponse = (statusCode, message, details = null) => {
  const response = {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
    body: JSON.stringify({
      error: message,
      ...(details && { details }),
    }),
  };

  return response;
};

// Standard success response
const successResponse = (statusCode, data = null) => {
  const response = {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
  };

  if (data !== null) {
    response.body = JSON.stringify(data);
  }

  return response;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Normalize email to consistent format (lowercase, trimmed)
const normalizeEmail = (email) => {
  if (!email) return email;
  return email.toLowerCase().trim();
};

// Validate ULID format
const isValidULID = (id) => {
  // ULID is 26 characters, Crockford's Base32
  const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  return ulidRegex.test(id);
};

// Sanitize string input
const sanitizeString = (str, maxLength = 255) => {
  if (typeof str !== "string") {
    return "";
  }
  return str.trim().substring(0, maxLength);
};

// Check if value exists and is not empty
const isNotEmpty = (value) => {
  return value !== null && value !== undefined && value !== "";
};

module.exports = {
  generateULID,
  getCurrentTimestamp,
  parseBody,
  errorResponse,
  successResponse,
  isValidEmail,
  normalizeEmail,
  isValidULID,
  sanitizeString,
  isNotEmpty,
};
