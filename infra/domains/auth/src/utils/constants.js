// infra/domains/auth/src/utils/constants.js
// Constants for auth domain - Updated for USER#<ulid> pattern

// Partition Key & Sort Key Prefixes
const USER_PREFIX = "USER#";
const VERIFICATION_CODE_PREFIX = "VERIFICATION#";

// Sort Key Values
const USER_PROFILE_SK = "PROFILE";

// GSI Constants
const GSI1_NAME = "GSI1";
const EMAIL_PREFIX = "EMAIL#";
const EMAIL_LOOKUP_SK = "LOOKUP";

// User Statuses
const USER_STATUS_PENDING = "PENDING";
const USER_STATUS_ACTIVE = "ACTIVE";
const USER_STATUS_INACTIVE = "INACTIVE";
const USER_STATUS_SUSPENDED = "SUSPENDED";

// User Roles
const USER_ROLE_USER = "USER";
const USER_ROLE_ADMIN = "ADMIN";

// Valid values arrays for validation
const VALID_USER_STATUSES = [
  USER_STATUS_PENDING,
  USER_STATUS_ACTIVE,
  USER_STATUS_INACTIVE,
  USER_STATUS_SUSPENDED,
];

const VALID_USER_ROLES = [USER_ROLE_USER, USER_ROLE_ADMIN];

// Export all constants
module.exports = {
  // Prefixes
  USER_PREFIX,
  VERIFICATION_CODE_PREFIX,

  // Sort Keys
  USER_PROFILE_SK,

  // GSI
  GSI1_NAME,
  EMAIL_PREFIX,
  EMAIL_LOOKUP_SK,

  // Statuses
  USER_STATUS_PENDING,
  USER_STATUS_ACTIVE,
  USER_STATUS_INACTIVE,
  USER_STATUS_SUSPENDED,

  // Roles
  USER_ROLE_USER,
  USER_ROLE_ADMIN,

  // Validation arrays
  VALID_USER_STATUSES,
  VALID_USER_ROLES,
};
