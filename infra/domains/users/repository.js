// domains/users/repository.js
// Data access layer for user management

const {
  dynamodb,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  DeleteCommand,
} = require("./utils/dynamodb");
const constants = require("./utils/constants");
const { logError } = require("./utils/logger");

const createUser = async (user) => {
  const dbUser = {
    PK: `${constants.USER_PK_PREFIX}${user.id}`,
    SK: constants.PROFILE_SK,
    ...user,
    // GSI1 for email lookups
    GSI1PK: `${constants.EMAIL_PK_PREFIX}${user.email}`,
    GSI1SK: constants.LOOKUP_SK,
  };

  const params = {
    TableName: constants.TABLE_NAME,
    Item: dbUser,
    ConditionExpression: "attribute_not_exists(PK)",
  };

  try {
    await dynamodb.send(new PutCommand(params));
    return user;
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      throw new Error("User already exists");
    }
    logError("Repository.createUser", error, { userId: user.id });
    throw error;
  }
};

const getUserById = async (userId) => {
  const params = {
    TableName: constants.TABLE_NAME,
    Key: {
      PK: `${constants.USER_PK_PREFIX}${userId}`,
      SK: constants.PROFILE_SK,
    },
  };

  try {
    const result = await dynamodb.send(new GetCommand(params));
    return result.Item || null;
  } catch (error) {
    logError("Repository.getUserById", error, { userId });
    throw error;
  }
};

const getUserByEmail = async (email) => {
  const params = {
    TableName: constants.TABLE_NAME,
    IndexName: constants.EMAIL_GSI_NAME,
    KeyConditionExpression: "GSI1PK = :email",
    ExpressionAttributeValues: {
      ":email": `${constants.EMAIL_PK_PREFIX}${email}`,
    },
  };

  try {
    const result = await dynamodb.send(new QueryCommand(params));
    return result.Items?.[0] || null;
  } catch (error) {
    logError("Repository.getUserByEmail", error, { email });
    throw error;
  }
};

const listUsers = async () => {
  const params = {
    TableName: constants.TABLE_NAME,
    FilterExpression: "SK = :sk AND begins_with(PK, :pk)",
    ExpressionAttributeValues: {
      ":sk": constants.PROFILE_SK,
      ":pk": constants.USER_PK_PREFIX,
    },
  };

  try {
    const result = await dynamodb.send(new ScanCommand(params));
    return result.Items || [];
  } catch (error) {
    logError("Repository.listUsers", error);
    throw error;
  }
};

const updateUser = async (user) => {
  const dbUser = {
    PK: `${constants.USER_PK_PREFIX}${user.id}`,
    SK: constants.PROFILE_SK,
    ...user,
    // Update GSI1 if email changed
    GSI1PK: `${constants.EMAIL_PK_PREFIX}${user.email}`,
    GSI1SK: constants.LOOKUP_SK,
  };

  const params = {
    TableName: constants.TABLE_NAME,
    Item: dbUser,
    ConditionExpression: "attribute_exists(PK)",
  };

  try {
    await dynamodb.send(new PutCommand(params));
    return user;
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      throw new Error("User not found");
    }
    logError("Repository.updateUser", error, { userId: user.id });
    throw error;
  }
};

const deleteUser = async (userId) => {
  const params = {
    TableName: constants.TABLE_NAME,
    Key: {
      PK: `${constants.USER_PK_PREFIX}${userId}`,
      SK: constants.PROFILE_SK,
    },
    ConditionExpression: "attribute_exists(PK)",
  };

  try {
    await dynamodb.send(new DeleteCommand(params));
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      throw new Error("User not found");
    }
    logError("Repository.deleteUser", error, { userId });
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
