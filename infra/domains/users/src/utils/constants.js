// infra/domains/users/src/utils/constants.js
// Constants for user domain

// DynamoDB key patterns
const USER_PREFIX = "USER#";
const USER_PROFILE_SK = "PROFILE";
const EMAIL_PREFIX = "EMAIL#";
const EMAIL_LOOKUP_SK = "LOOKUP";

// GSI names
const GSI1_NAME = "GSI1";

// User roles
const USER_ROLE = "USER";
const ADMIN_ROLE = "ADMIN";
const VALID_ROLES = [USER_ROLE, ADMIN_ROLE];

// User statuses
const STATUS_PENDING = "PENDING";
const STATUS_ACTIVE = "ACTIVE";
const STATUS_SUSPENDED = "SUSPENDED";
const VALID_STATUSES = [STATUS_PENDING, STATUS_ACTIVE, STATUS_SUSPENDED];

// Validation limits
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;

module.exports = {
  // Key patterns
  USER_PREFIX,
  USER_PROFILE_SK,
  EMAIL_PREFIX,
  EMAIL_LOOKUP_SK,

  // GSI
  GSI1_NAME,

  // Roles
  USER_ROLE,
  ADMIN_ROLE,
  VALID_ROLES,

  // Statuses
  STATUS_PENDING,
  STATUS_ACTIVE,
  STATUS_SUSPENDED,
  VALID_STATUSES,

  // Validation
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
};
