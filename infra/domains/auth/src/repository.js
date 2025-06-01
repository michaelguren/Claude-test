// infra/domains/auth/src/repository.js
// Simplified data access layer using email-based PK for guaranteed uniqueness
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
 * Uses USER#<email> as PK
 */
exports.putVerificationCode = async (email, codeId, code, ttlSeconds) => {
  try {
    const now = getCurrentTimestamp();
    const item = {
      PK: `${constants.USER_PREFIX}${email.toLowerCase().trim()}`,
      SK: `${constants.VERIFICATION_CODE_PREFIX}${codeId}`,
      code,
      codeId,
      email: email.toLowerCase().trim(),
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
exports.getVerificationCode = async (email, code) => {
  try {
    // Query for verification codes for this email
    const result = await listItems(
      `${constants.USER_PREFIX}${email.toLowerCase().trim()}`,
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
      PK: `${constants.USER_PREFIX}${email.toLowerCase().trim()}`,
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
 * Get user by email (primary lookup) - NEW: Direct PK lookup
 * This is now the primary and most efficient lookup method
 */
exports.getUserByEmail = async (email) => {
  try {
    const key = {
      PK: `${constants.USER_PREFIX}${email.toLowerCase().trim()}`,
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
 * Used when we have user ID from URLs like /users/{userId}
 */
exports.getUserById = async (userId) => {
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
 * Uses EMAIL as PK for guaranteed uniqueness
 */
exports.createPendingUser = async (email, passwordData) => {
  try {
    const userId = generateULID();
    const normalizedEmail = email.toLowerCase().trim();
    const now = getCurrentTimestamp();

    const item = {
      // Primary key: email-based (guarantees uniqueness)
      PK: `${constants.USER_PREFIX}${normalizedEmail}`,
      SK: constants.USER_PROFILE_SK,

      // User data
      userId, // ULID for references and URLs
      email: normalizedEmail,
      name: normalizedEmail.split("@")[0], // Default name from email
      role: constants.USER_ROLE_USER,
      status: constants.USER_STATUS_PENDING, // Not yet verified
      salt: passwordData.salt,
      hash: passwordData.hash,
      createdAt: now,
      updatedAt: now,

      // GSI1 for userId lookups (for URLs like /users/{userId})
      GSI1PK: `${constants.USERID_PREFIX}${userId}`,
      GSI1SK: constants.GSI1_LOOKUP_SK,
    };

    // PK uniqueness is automatically enforced - no conditional check needed!
    await putItem(item);
    logInfo("Repository.createPendingUser", "Pending user created", {
      email: normalizedEmail,
      userId,
    });

    return item;
  } catch (error) {
    logError("Repository.createPendingUser", error, { email });

    // Handle the case where email already exists
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
 * Uses email-based PK lookup
 */
exports.markUserVerified = async (email) => {
  try {
    const params = {
      PK: `${constants.USER_PREFIX}${email.toLowerCase().trim()}`,
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
      email,
    });

    return result.Attributes;
  } catch (error) {
    logError("Repository.markUserVerified", error, { email });
    throw error;
  }
};
