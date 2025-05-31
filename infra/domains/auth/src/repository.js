// infra/domains/auth/src/repository.js
// Data access layer for authentication operations
// Updated to use USER#<ulid> pattern instead of USER#<email>

const {
  putItem,
  getItem,
  listItems,
  updateItem,
  deleteItem,
  queryGSI,
} = require("./utils-shared/dynamodb");
const { generateULID, getCurrentTimestamp } = require("./utils-shared/helpers");
const { logInfo, logError } = require("./utils-shared/logger");
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
      codeId,
      code,
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
      constants.VERIFICATION_CODE_PREFIX,
      {
        scanIndexForward: false, // Most recent first
        limit: 5, // Check last few codes
      }
    );

    // Find matching code
    const matchingItem = result.Items?.find((item) => item.code === code);
    if (!matchingItem) return null;

    // Check if code is expired
    if (matchingItem && matchingItem.TTL < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return matchingItem;
  } catch (error) {
    logError("Repository.getVerificationCode", error, { email });
    throw error;
  }
};

/**
 * Delete verification code after use
 */
exports.deleteVerificationCode = async (email, codeId) => {
  if (!codeId) {
    logError("Repository.deleteVerificationCode", "Missing codeId", { email });
    return;
  }
  try {
    const params = {
      Key: {
        PK: `${constants.USER_PREFIX}${email}`,
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
 * Get user by email (using GSI1)
 * Updated to work with USER#<ulid> pattern
 */
exports.getUserByEmail = async (email) => {
  try {
    const result = await queryGSI(
      constants.GSI1_NAME,
      "GSI1PK = :pk AND GSI1SK = :sk",
      {
        ":pk": `${constants.EMAIL_PREFIX}${email.toLowerCase().trim()}`,
        ":sk": constants.EMAIL_LOOKUP_SK,
      }
    );

    const user =
      result.Items && result.Items.length > 0 ? result.Items[0] : null;
    logInfo("Repository.getUserByEmail", "User lookup by email", {
      email,
      found: !!user,
    });
    return user;
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
    const user = result.Item || null;
    logInfo("Repository.getUserById", "User lookup by ID", {
      userId,
      found: !!user,
    });
    return user;
  } catch (error) {
    logError("Repository.getUserById", error, { userId });
    throw error;
  }
};

/**
 * Create a pending user during signup (before verification)
 * Creates USER#<ulid> record but user is in PENDING status
 */
exports.createPendingUser = async (email, passwordData) => {
  try {
    const userId = generateULID();
    const now = getCurrentTimestamp();

    const item = {
      PK: `${constants.USER_PREFIX}${userId}`, // New ULID-based pattern
      SK: constants.USER_PROFILE_SK,
      id: userId,
      email: email.toLowerCase().trim(),
      name: email.split("@")[0], // Default name from email
      status: constants.USER_STATUS_PENDING, // Not yet verified
      role: constants.USER_ROLE_USER,
      salt: passwordData.salt,
      hash: passwordData.hash,
      createdAt: now,
      updatedAt: now,

      // GSI1 for email lookups
      GSI1PK: `${constants.EMAIL_PREFIX}${email.toLowerCase().trim()}`,
      GSI1SK: constants.EMAIL_LOOKUP_SK,
    };

    await putItem(item, "attribute_not_exists(PK)"); // Prevent overwrites
    logInfo("Repository.createPendingUser", "Pending user created", {
      userId,
      email,
    });
    return { userId, ...item };
  } catch (error) {
    logError("Repository.createPendingUser", error, { email });
    throw error;
  }
};

/**
 * Create a verified user (auto-verified during registration completion)
 */
exports.createVerifiedUser = async (email, passwordData) => {
  try {
    const userId = generateULID();
    const now = getCurrentTimestamp();

    const item = {
      PK: `${constants.USER_PREFIX}${userId}`, // New ULID-based pattern
      SK: constants.USER_PROFILE_SK,
      id: userId,
      email: email.toLowerCase().trim(),
      name: email.split("@")[0], // Default name from email
      status: constants.USER_STATUS_ACTIVE, // Already verified
      role: constants.USER_ROLE_USER,
      salt: passwordData.salt,
      hash: passwordData.hash,
      createdAt: now,
      updatedAt: now,

      // GSI1 for email lookups
      GSI1PK: `${constants.EMAIL_PREFIX}${email.toLowerCase().trim()}`,
      GSI1SK: constants.EMAIL_LOOKUP_SK,
    };

    await putItem(item, "attribute_not_exists(GSI1PK)"); // Prevent duplicate emails
    logInfo("Repository.createVerifiedUser", "Verified user created", {
      userId,
      email,
    });
    return { userId, ...item };
  } catch (error) {
    logError("Repository.createVerifiedUser", error, { email });
    throw error;
  }
};

/**
 * Mark user as verified (update status from PENDING to ACTIVE)
 */
exports.markUserVerified = async (userId) => {
  try {
    const params = {
      Key: {
        PK: `${constants.USER_PREFIX}${userId}`,
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
      ReturnValues: "ALL_NEW",
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

/**
 * Update user password
 */
exports.updateUserPassword = async (email, passwordData) => {
  try {
    // First get the user by email to find their ULID
    const user = await exports.getUserByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }

    const params = {
      Key: {
        PK: `${constants.USER_PREFIX}${user.id}`, // Use ULID from user record
        SK: constants.USER_PROFILE_SK,
      },
      UpdateExpression: "SET salt = :salt, hash = :hash, #updatedAt = :now",
      ExpressionAttributeNames: {
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":salt": passwordData.salt,
        ":hash": passwordData.hash,
        ":now": getCurrentTimestamp(),
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await updateItem(params);
    logInfo("Repository.updateUserPassword", "Password updated", {
      userId: user.id,
      email,
    });
    return result.Attributes;
  } catch (error) {
    logError("Repository.updateUserPassword", error, { email });
    throw error;
  }
};
