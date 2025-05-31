// infra/domains/todos/src/utils/constants.js
// Constants for TODO domain

// DynamoDB key patterns
const TODO_PREFIX = "TODO#";
const USER_PREFIX = "USER#";

// TODO statuses
const TODO_STATUS_ACTIVE = "ACTIVE";
const TODO_STATUS_COMPLETED = "COMPLETED";

// Valid TODO statuses
const VALID_TODO_STATUSES = [TODO_STATUS_ACTIVE, TODO_STATUS_COMPLETED];

// Validation limits
const TODO_TEXT_MIN_LENGTH = 1;
const TODO_TEXT_MAX_LENGTH = 500;

module.exports = {
  TODO_PREFIX,
  USER_PREFIX,
  TODO_STATUS_ACTIVE,
  TODO_STATUS_COMPLETED,
  VALID_TODO_STATUSES,
  TODO_TEXT_MIN_LENGTH,
  TODO_TEXT_MAX_LENGTH,
};
