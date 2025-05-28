const { ulid } = require("ulid");

const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

const parseBody = (body) => {
  try {
    return JSON.parse(body || "{}");
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
};

const buildUpdateExpression = (updates) => {
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  Object.keys(updates).forEach((field) => {
    if (updates[field] !== undefined) {
      updateExpressions.push(`#${field} = :${field}`);
      expressionAttributeNames[`#${field}`] = field;
      expressionAttributeValues[`:${field}`] = updates[field];
    }
  });

  return {
    updateExpression:
      updateExpressions.length > 0
        ? `SET ${updateExpressions.join(", ")}`
        : null,
    expressionAttributeNames,
    expressionAttributeValues,
  };
};

const generateULID = () => {
  return ulid();
};

module.exports = {
  getCurrentTimestamp,
  parseBody,
  buildUpdateExpression,
  generateULID,
};
