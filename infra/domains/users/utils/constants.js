// domains/users/utils/constants.js
// Constants for user domain

module.exports = {
  // User roles
  VALID_ROLES: ["USER", "ADMIN"],
  DEFAULT_ROLE: "USER",

  // User statuses
  VALID_STATUSES: ["ACTIVE", "INACTIVE", "SUSPENDED"],
  DEFAULT_STATUS: "ACTIVE",

  // DynamoDB configuration
  TABLE_NAME: process.env.TABLE_NAME,
  EMAIL_GSI_NAME: "GSI1",

  // DynamoDB key patterns
  USER_PK_PREFIX: "USER#",
  EMAIL_PK_PREFIX: "EMAIL#",
  PROFILE_SK: "PROFILE",
  LOOKUP_SK: "LOOKUP",

  // Validation limits
  MAX_NAME_LENGTH: 100,
  MIN_NAME_LENGTH: 2,
  MAX_EMAIL_LENGTH: 255,
};
