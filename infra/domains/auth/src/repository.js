// infra/domains/auth/src/repository.js
// Simplified data access layer using email-based PK for guaranteed uniqueness

import {
  generateULID,
  getCurrentTimestamp,
  normalizeEmail,
} from "infra/domains/_shared/utils/helpers.js";

import { logInfo, logError } from "infra/domains/_shared/utils/logger.js";

import {
  putItem,
  getItem,
  updateItem,
  deleteItem,
  listItems,
  queryGSI,
} from "infra/domains/_shared/utils/dynamodb.js";

import * as constants from "infra/domains/_shared/utils/constants.js";

/**
 * Store verification code for email verification
 * Uses USER#<email> as PK
 */
export const putVerificationCode = async (email, codeId, code, ttlSeconds) => {
  try {
    const now = getCurrentTimestamp();
    const item = {
      PK: `${constants.USER_PREFIX}${normalizeEmail(email)}`,
      SK: `${constants.VERIFICATION_CODE_PREFIX}${codeId}`,
      code,
      codeId,
      email: normalizeEmail(email),
      createdAt: now,
      TTL: ttlSeconds, // DynamoDB TTL attribute
    };

    await putItem(item);
    logInfo("Repository.putVerificationCode", "Verification code stored", {
      email,
      codeId,
    });
  } catch (error) {
    logError("Repository.putVerificationCode", error, { email, codeId });
    throw error;
  }
};

/**
 * Get verification code for validation
 * Uses USER#<email> as PK
 */
export const getVerificationCode = async (email, code) => {
  try {
    const result = await listItems(
      `${constants.USER_PREFIX}${normalizeEmail(email)}`,
      constants.VERIFICATION_CODE_PREFIX.slice(0, -1),
      {
        scanIndexForward: false,
        limit: 5,
      }
    );

    const matchingItem = result.Items?.find((item) => item.code === code);

    if (matchingItem && matchingItem.TTL < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return matchingItem || null;
  } catch (error) {
    logError("Repository.getVerificationCode", error, { email });
    throw error;
  }
};

/**
 * Delete verification code after use
 */
export const deleteVerificationCode = async (email, codeId) => {
  try {
    if (!codeId) {
      logError("Repository.deleteVerificationCode", "Missing codeId", {
        email,
      });
      return;
    }

    const params = {
      Key: {
        PK: `${constants.USER_PREFIX}${normalizeEmail(email)}`,
        SK: `${constants.VERIFICATION_CODE_PREFIX}${codeId}`,
      },
    };

    await deleteItem(params);
    logInfo("Repository.deleteVerificationCode", "Verification code deleted", {
      email,
      codeId,
    });
  } catch (error) {
    logError("Repository.deleteVerificationCode", error, { email, codeId });
    throw error;
  }
};

/**
 * Get user by email (primary lookup) - NEW: Direct PK lookup
 */
export const getUserByEmail = async (email) => {
  try {
    const key = {
      PK: `${constants.USER_PREFIX}${normalizeEmail(email)}`,
      SK: constants.USER_PROFILE_SK,
    };

    const result = await getItem(key);

    logInfo("Repository.getUserByEmail", "User lookup by email", {
      email,
      found: !!result.Item,
    });

    return result.Item || null;
  } catch (error) {
    logError("Repository.getUserByEmail", error, { email });
    throw error;
  }
};

/**
 * Get user by ULID (using GSI1) - For URL-based lookups
 */
export const getUserById = async (userId) => {
  try {
    const result = await queryGSI("GSI1", "GSI1PK = :pk", {
      ":pk": `${constants.USERID_PREFIX}${userId}`,
    });

    logInfo("Repository.getUserById", "User lookup by ID", {
      userId,
      found: !!result.Items?.[0],
    });

    return result.Items?.[0] || null;
  } catch (error) {
    logError("Repository.getUserById", error, { userId });
    throw error;
  }
};

/**
 * Create a user in PENDING status (during signup)
 */
export const createPendingUser = async (email, passwordData) => {
  try {
    const userId = generateULID();
    const normalizedEmail = normalizeEmail(email);
    const now = getCurrentTimestamp();

    const item = {
      PK: `${constants.USER_PREFIX}${normalizedEmail}`,
      SK: constants.USER_PROFILE_SK,

      userId,
      email: normalizedEmail,
      name: normalizedEmail.split("@")[0],
      role: constants.USER_ROLE_USER,
      status: constants.USER_STATUS_PENDING,
      salt: passwordData.salt,
      hash: passwordData.hash,
      createdAt: now,
      updatedAt: now,

      GSI1PK: `${constants.USERID_PREFIX}${userId}`,
      GSI1SK: constants.GSI1_LOOKUP_SK,
    };

    await putItem(item);
    logInfo("Repository.createPendingUser", "Pending user created", {
      email: normalizedEmail,
      userId,
    });

    return item;
  } catch (error) {
    logError("Repository.createPendingUser", error, { email });

    if (
      error.name === "ConditionalCheckFailedException" ||
      error.message?.includes("already exists")
    ) {
      throw new Error("User with this email already exists");
    }

    throw error;
  }
};

/**
 * Mark user as verified (update status from PENDING to ACTIVE)
 */
export const markUserVerified = async (email) => {
  try {
    const params = {
      Key: {
        PK: `${constants.USER_PREFIX}${normalizeEmail(email)}`,
        SK: constants.USER_PROFILE_SK,
      },
      UpdateExpression: "SET #status = :status, #updatedAt = :now",
      ExpressionAttributeNames: {
        "#status": "status",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":status": constants.USER_STATUS_ACTIVE,
        ":now": getCurrentTimestamp(),
      },
    };

    const result = await updateItem(params);
    logInfo("Repository.markUserVerified", "User marked as verified", {
      email,
    });

    return result.Attributes;
  } catch (error) {
    logError("Repository.markUserVerified", error, { email });
    throw error;
  }
};
