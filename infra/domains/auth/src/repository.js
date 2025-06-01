// infra/domains/auth/src/repository.js
// Simplified data access layer for authentication operations
const { generateULID, getCurrentTimestamp } = require("./utils-shared/helpers");
const { logInfo, logError } = require("./utils-shared/logger");
const {
  putItem,
  getItem,
  updateItem,
  deleteItem,
  listItems,
  queryGSI,
} = require("./utils-shared/dynamodb");
const constants = require("./utils/constants");

/**
 * Store verification code for email verification
 * Uses USER#<email> as PK during signup process only
 */
exports.putVerificationCode = async (email, codeId, code, ttlSeconds) => {
  try {
    const now = getCurrentTimestamp();
    const item = {
      PK: `${constants.USER_PREFIX}${email}`, // Keep email-based during verification
      SK: `${constants.VERIFICATION_CODE_PREFIX}${codeId}`,
      code,
      codeId,
      email,
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
 * Uses USER#<email> as PK during signup process
 */
exports.getVerificationCode = async (email, code) => {
  try {
    // Query for verification codes for this email
    const result = await listItems(
      `${constants.USER_PREFIX}${email}`,
      constants.VERIFICATION_CODE_PREFIX.slice(0, -1), // Remove trailing #
      {
        scanIndexForward: false, // Most recent first
        limit: 5, // Check last few codes
      }
    );

    // Find matching code
    const matchingItem = result.Items?.find((item) => item.code === code);

    // Check if code is expired
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
exports.deleteVerificationCode = async (email, codeId) => {
  try {
    if (!codeId) {
      logError("Repository.deleteVerificationCode", "Missing codeId", {
        email,
      });
      return;
    }

    const params = {
      PK: `${constants.USER_PREFIX}${email}`,
      SK: `${constants.VERIFICATION_CODE_PREFIX}${codeId}`,
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
 * Get user by email (using GSI1)
 * Works with USER#<ulid> pattern
 */
exports.getUserByEmail = async (email) => {
  try {
    const result = await queryGSI("GSI1", "GSI1PK = :pk", {
      ":pk": `${constants.EMAIL_PREFIX}${email.toLowerCase().trim()}`,
    });

    logInfo("Repository.getUserByEmail", "User lookup by email", {
      email,
      found: !!result.Items?.[0],
    });

    return result.Items?.[0] || null;
  } catch (error) {
    logError("Repository.getUserByEmail", error, { email });
    throw error;
  }
};

/**
 * Get user by ULID (primary lookup)
 */
exports.getUserById = async (userId) => {
  try {
    const key = {
      PK: `${constants.USER_PREFIX}${userId}`,
      SK: constants.USER_PROFILE_SK,
    };

    const result = await getItem(key);

    logInfo("Repository.getUserById", "User lookup by ID", {
      userId,
      found: !!result.Item,
    });

    return result.Item || null;
  } catch (error) {
    logError("Repository.getUserById", error, { userId });
    throw error;
  }
};

/**
 * Create a user in PENDING status (during signup)
 * Creates USER#<ulid> record but user is in PENDING status until verified
 */
exports.createPendingUser = async (email, passwordData) => {
  try {
    const userId = generateULID();
    const now = getCurrentTimestamp();

    const item = {
      PK: `${constants.USER_PREFIX}${userId}`, // ULID-based pattern
      SK: constants.USER_PROFILE_SK,
      id: userId,
      email: email.toLowerCase().trim(),
      name: email.split("@")[0], // Default name from email
      role: constants.USER_ROLE_USER,
      status: constants.USER_STATUS_PENDING, // Not yet verified
      salt: passwordData.salt,
      hash: passwordData.hash,
      createdAt: now,
      updatedAt: now,

      // GSI1 for email lookups
      GSI1PK: `${constants.EMAIL_PREFIX}${email.toLowerCase().trim()}`,
      GSI1SK: constants.GSI1_LOOKUP_SK,
    };

    await putItem(item, "attribute_not_exists(GSI1PK)"); // Prevent duplicate emails
    logInfo("Repository.createPendingUser", "Pending user created", {
      email,
      userId,
    });

    return item;
  } catch (error) {
    logError("Repository.createPendingUser", error, { email });
    if (error.name === "ConditionalCheckFailedException") {
      throw new Error("User with this email already exists");
    }
    throw error;
  }
};

/**
 * Mark user as verified (update status from PENDING to ACTIVE)
 */
exports.markUserVerified = async (userId) => {
  try {
    const params = {
      PK: `${constants.USER_PREFIX}${userId}`,
      SK: constants.USER_PROFILE_SK,
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
      userId,
    });

    return result.Attributes;
  } catch (error) {
    logError("Repository.markUserVerified", error, { userId });
    throw error;
  }
};
