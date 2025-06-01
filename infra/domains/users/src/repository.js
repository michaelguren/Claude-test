// infra/domains/users/src/repository.js
// Data access layer for user management

import {
  putItem,
  getItem,
  updateItem,
  deleteItem,
  listItems,
  queryGSI,
} from "infra/domains/_shared/utils/dynamodb.js";

import { logError, logInfo } from "infra/domains/_shared/utils/logger.js";

import * as constants from "infra/domains/_shared/utils/constants.js";

const createUser = async (user) => {
  try {
    const item = {
      PK: `${constants.USER_PREFIX}${user.id}`,
      SK: constants.USER_PROFILE_SK,
      ...user,
      // GSI1 for email lookups
      GSI1PK: `${constants.EMAIL_PREFIX}${user.email}`,
      GSI1SK: constants.EMAIL_LOOKUP_SK,
    };

    // Use condition to prevent overwriting existing users
    await putItem(item, "attribute_not_exists(PK)");
    logInfo("Repository.createUser", "User created successfully", {
      userId: user.id,
    });
    return item;
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      throw new Error("User already exists");
    }
    logError("Repository.createUser", error, { userId: user.id });
    throw error;
  }
};

const getUserById = async (userId) => {
  try {
    const key = {
      PK: `${constants.USER_PREFIX}${userId}`,
      SK: constants.USER_PROFILE_SK,
    };
    const result = await getItem(key);
    logInfo("Repository.getUserById", "User retrieved", { userId });
    return result.Item || null;
  } catch (error) {
    logError("Repository.getUserById", error, { userId });
    throw error;
  }
};

const getUserByEmail = async (email) => {
  try {
    const result = await queryGSI(
      constants.GSI1_NAME,
      `${constants.EMAIL_PREFIX}${email}`,
      constants.EMAIL_LOOKUP_SK
    );
    logInfo("Repository.getUserByEmail", "User retrieved by email", { email });
    return result.Items?.[0] || null;
  } catch (error) {
    logError("Repository.getUserByEmail", error, { email });
    throw error;
  }
};

const listUsers = async () => {
  try {
    // Use listItems with PK prefix to get all users
    const result = await listItems(
      constants.USER_PREFIX.slice(0, -1), // Remove the # to get "USER"
      constants.USER_PROFILE_SK
    );
    logInfo("Repository.listUsers", `Retrieved ${result.Items.length} users`);
    return result.Items || [];
  } catch (error) {
    logError("Repository.listUsers", error);
    throw error;
  }
};

const updateUser = async (user) => {
  try {
    let updateExpression = "SET ";
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    const updates = [];

    // Build dynamic update expression for provided fields
    if (user.name !== undefined) {
      updates.push("#name = :name");
      expressionAttributeNames["#name"] = "name";
      expressionAttributeValues[":name"] = user.name;
    }

    if (user.email !== undefined) {
      updates.push("#email = :email");
      expressionAttributeNames["#email"] = "email";
      expressionAttributeValues[":email"] = user.email;
    }

    if (user.role !== undefined) {
      updates.push("#role = :role");
      expressionAttributeNames["#role"] = "role";
      expressionAttributeValues[":role"] = user.role;
    }

    if (user.status !== undefined) {
      updates.push("#status = :status");
      expressionAttributeNames["#status"] = "status";
      expressionAttributeValues[":status"] = user.status;
    }

    // Always update the updatedAt timestamp
    updates.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = user.updatedAt;

    updateExpression += updates.join(", ");

    const params = {
      PK: `${constants.USER_PREFIX}${user.id}`,
      SK: constants.USER_PROFILE_SK,
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    // If email is being updated, we need to update GSI1PK as well
    if (user.email !== undefined) {
      params.UpdateExpression += ", GSI1PK = :gsi1pk";
      params.ExpressionAttributeValues[
        ":gsi1pk"
      ] = `${constants.EMAIL_PREFIX}${user.email}`;
    }

    const result = await updateItem(params);

    if (!result.Attributes) {
      throw new Error("User not found");
    }

    logInfo("Repository.updateUser", "User updated successfully", {
      userId: user.id,
    });
    return result.Attributes;
  } catch (error) {
    logError("Repository.updateUser", error, { userId: user.id });
    throw error;
  }
};

const deleteUser = async (userId) => {
  try {
    const params = {
      PK: `${constants.USER_PREFIX}${userId}`,
      SK: constants.USER_PROFILE_SK,
    };
    await deleteItem(params);
    logInfo("Repository.deleteUser", "User deleted successfully", { userId });
  } catch (error) {
    logError("Repository.deleteUser", error, { userId });
    throw error;
  }
};

export {
  createUser,
  getUserById,
  getUserByEmail,
  listUsers,
  updateUser,
  deleteUser,
};
