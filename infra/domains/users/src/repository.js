const {
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryGSI,
} = require("../../shared/dynamodb");

const createUser = async (user) => {
  const dbUser = {
    PK: `USER#${user.id}`,
    SK: "PROFILE",
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    // GSI1 for email lookups
    GSI1PK: `EMAIL#${user.email}`,
    GSI1SK: "LOOKUP",
  };

  await putItem(dbUser, "attribute_not_exists(PK)");
  return user;
};

const getUserById = async (userId) => {
  try {
    const user = await getItem(`USER#${userId}`, "PROFILE");
    return user || null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
};

const getUserByEmail = async (email) => {
  try {
    const result = await queryGSI(
      "GSI1",
      "GSI1PK = :email",
      { ":email": `EMAIL#${email}` },
      { limit: 1 }
    );

    return result.items[0] || null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
};

const listUsers = async (limit = 50) => {
  try {
    const result = await dynamodb
      .query({
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "PK begins_with :userPrefix",
        ExpressionAttributeValues: {
          ":userPrefix": "USER#",
        },
        Limit: limit,
        ScanIndexForward: false, // Latest first (ULID natural sorting!)
      })
      .promise();

    return {
      users: result.Items || [],
      count: result.Count || 0,
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  } catch (error) {
    console.error("Error listing users:", error);
    throw error;
  }
};

const updateUser = async (userId, updates) => {
  try {
    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((field) => {
      updateExpressions.push(`#${field} = :${field}`);
      expressionAttributeNames[`#${field}`] = field;
      expressionAttributeValues[`:${field}`] = updates[field];
    });

    const updatedUser = await updateItem(
      `USER#${userId}`,
      "PROFILE",
      `SET ${updateExpressions.join(", ")}`,
      expressionAttributeNames,
      expressionAttributeValues,
      "attribute_exists(PK)"
    );

    return updatedUser;
  } catch (error) {
    if (error.code === "ConditionalCheckFailedException") {
      return null; // User not found
    }
    console.error("Error updating user:", error);
    throw error;
  }
};

const deleteUser = async (userId) => {
  try {
    await deleteItem(`USER#${userId}`, "PROFILE", "attribute_exists(PK)");
    return true;
  } catch (error) {
    if (error.code === "ConditionalCheckFailedException") {
      return false; // User not found
    }
    console.error("Error deleting user:", error);
    throw error;
  }
};

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  listUsers,
  updateUser,
  deleteUser,
};
