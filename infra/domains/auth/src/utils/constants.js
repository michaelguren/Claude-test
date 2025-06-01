// infra/domains/auth/src/utils/constants.js
// Constants for auth domain - Updated for email-based PK pattern

// Partition Key & Sort Key Prefixes
const USER_PREFIX = "USER#";
const VERIFICATION_CODE_PREFIX = "VERIFICATION#";

// NEW: GSI prefix for ULID-based lookups (for URLs)
const USERID_PREFIX = "USERID#";

// Sort Key Values
const USER_PROFILE_SK = "PROFILE";

// GSI Constants
const GSI1_LOOKUP_SK = "LOOKUP";

// User Statuses
const USER_STATUS_PENDING = "PENDING";
const USER_STATUS_ACTIVE = "ACTIVE";
const USER_STATUS_INACTIVE = "INACTIVE";

// User Roles
const USER_ROLE_USER = "USER";
const USER_ROLE_ADMIN = "ADMIN";

// Valid values arrays for validation
const VALID_STATUSES = [
  USER_STATUS_PENDING,
  USER_STATUS_ACTIVE,
  USER_STATUS_INACTIVE,
];
const VALID_ROLES = [USER_ROLE_USER, USER_ROLE_ADMIN];

// Export all constants
module.exports = {
  // Prefixes
  USER_PREFIX,
  VERIFICATION_CODE_PREFIX,
  USERID_PREFIX, // NEW: For GSI lookups by ULID

  // Sort Keys
  USER_PROFILE_SK,

  // GSI
  GSI1_LOOKUP_SK,

  // Statuses
  USER_STATUS_PENDING,
  USER_STATUS_ACTIVE,
  USER_STATUS_INACTIVE,

  // Roles
  USER_ROLE_USER,
  USER_ROLE_ADMIN,

  // Validation arrays
  VALID_STATUSES,
  VALID_ROLES,
};
