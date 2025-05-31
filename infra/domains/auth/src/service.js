// infra/domains/auth/src/service.js
// Business logic for authentication operations

const crypto = require("crypto");
const repository = require("./repository");
const constants = require("./utils/constants");
const {
  generateULID,
  getCurrentTimestamp,
  isValidEmail,
} = require("./utils-shared/helpers");
const { logError, logInfo } = require("./utils-shared/logger");
const { sendEmail } = require("./utils/email");

// AWS SDK imports for parameter retrieval
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const ssmClient = new SSMClient({});

// Cache JWT secret to avoid repeated SSM calls
let jwtSecret = null;

// Get JWT secret from Parameter Store
const getJwtSecret = async () => {
  if (jwtSecret) return jwtSecret;

  try {
    const command = new GetParameterCommand({
      Name:
        process.env.JWT_SECRET_PARAMETER_NAME || "/minimalist-todo/jwt-secret",
      WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    jwtSecret = response.Parameter.Value;
    return jwtSecret;
  } catch (error) {
    console.error("Error retrieving JWT secret:", error);
    // Fallback for development/local testing
    return "dev-fallback-secret-key-not-for-production";
  }
};

// Simple password hashing using Node.js built-in crypto (no external dependencies)
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return { salt, hash };
};

const verifyPassword = (password, salt, hash) => {
  const hashToVerify = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return hash === hashToVerify;
};

// Generate simple JWT token (for MVP - consider AWS Cognito for production)
const generateToken = async (user) => {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");

  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id, // Use ULID as subject
      email: user.email,
      name: user.name,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    })
  ).toString("base64url");

  // Get secret from Parameter Store
  const secret = await getJwtSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
};

// Send verification code to email for signup
const sendVerificationCode = async (email) => {
  try {
    if (!isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    // Check if user already exists and is verified
    const existingUser = await repository.getUserByEmail(email);
    if (existingUser && existingUser.status === constants.USER_STATUS_ACTIVE) {
      throw new Error("User already exists and is verified");
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeId = generateULID();
    const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 minutes

    // Store verification code
    await repository.putVerificationCode(email, codeId, code, expiresAt);

    // Send email
    await sendEmail(email, code);

    logInfo("Service.sendVerificationCode", "Verification code sent", {
      email,
    });
    return { success: true };
  } catch (error) {
    logError("Service.sendVerificationCode", error, { email });
    throw error;
  }
};

// Verify email code and create user account
const verifyAndCreateUser = async (email, code, password) => {
  try {
    if (!isValidEmail(email)) throw new Error("Invalid email format");
    if (!code) throw new Error("Verification code is required");
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // Verify the code
    const record = await repository.getVerificationCode(email, code);
    if (!record) throw new Error("Invalid or expired verification code");

    // Hash password
    const { salt, hash } = hashPassword(password);

    // Create the user as ACTIVE (since email is verified)
    const userData = await repository.createVerifiedUser(email, { salt, hash });

    // Clean up verification code
    await repository.deleteVerificationCode(email, record.codeId);

    // Get the created user and generate token
    const user = await repository.getUserByEmail(email);
    const token = await generateToken(user);

    logInfo("Service.verifyAndCreateUser", "User created and verified", {
      userId: user.id,
      email,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || email.split("@")[0],
        role: user.role,
        status: user.status,
      },
    };
  } catch (error) {
    logError("Service.verifyAndCreateUser", error, { email });
    throw error;
  }
};

// Login existing user with email and password
const loginUser = async (email, password) => {
  try {
    if (!isValidEmail(email)) throw new Error("Invalid email format");
    if (!password) throw new Error("Password is required");

    // Get user from database
    const user = await repository.getUserByEmail(email);
    if (!user) throw new Error("Invalid email or password");

    // Check if user is verified
    if (user.status === constants.USER_STATUS_PENDING) {
      throw new Error("Please complete your registration first");
    }

    // Verify password
    if (!user.salt || !user.hash) {
      throw new Error("Invalid user account");
    }

    const isValidPassword = verifyPassword(password, user.salt, user.hash);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    // Generate JWT token
    const token = await generateToken(user);

    logInfo("Service.loginUser", "User logged in successfully", {
      userId: user.id,
      email,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    };
  } catch (error) {
    logError("Service.loginUser", error, { email });
    throw error;
  }
};

// Change password for existing user
const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    if (!currentPassword) throw new Error("Current password is required");
    if (!newPassword || newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters long");
    }

    // Get user by ID
    const user = await repository.getUserById(userId);
    if (!user) throw new Error("User not found");

    // Verify current password
    const isValidPassword = verifyPassword(
      currentPassword,
      user.salt,
      user.hash
    );
    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const { salt, hash } = hashPassword(newPassword);

    // Update password in database
    await repository.updateUserPassword(user.email, { salt, hash });

    logInfo("Service.changePassword", "Password changed successfully", {
      userId,
    });

    return { success: true };
  } catch (error) {
    logError("Service.changePassword", error, { userId });
    throw error;
  }
};

// Reset password via email (initiate process)
const requestPasswordReset = async (email) => {
  try {
    if (!isValidEmail(email)) throw new Error("Invalid email format");

    // Check if user exists
    const user = await repository.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      logInfo(
        "Service.requestPasswordReset",
        "Password reset requested for non-existent email",
        { email }
      );
      return { success: true };
    }

    // Generate reset code (reuse verification code mechanism)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeId = generateULID();
    const expiresAt = Math.floor(Date.now() / 1000) + 1800; // 30 minutes for password reset

    // Store reset code
    await repository.putVerificationCode(email, codeId, code, expiresAt);

    // Send reset email
    await sendEmail(email, code); // You might want a different email template for password reset

    logInfo("Service.requestPasswordReset", "Password reset code sent", {
      userId: user.id,
      email,
    });

    return { success: true };
  } catch (error) {
    logError("Service.requestPasswordReset", error, { email });
    throw error;
  }
};

// Complete password reset with code
const resetPasswordWithCode = async (email, code, newPassword) => {
  try {
    if (!isValidEmail(email)) throw new Error("Invalid email format");
    if (!code) throw new Error("Reset code is required");
    if (!newPassword || newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters long");
    }

    // Verify the reset code
    const record = await repository.getVerificationCode(email, code);
    if (!record) throw new Error("Invalid or expired reset code");

    // Get user
    const user = await repository.getUserByEmail(email);
    if (!user) throw new Error("User not found");

    // Hash new password
    const { salt, hash } = hashPassword(newPassword);

    // Update password
    await repository.updateUserPassword(email, { salt, hash });

    // Clean up reset code
    await repository.deleteVerificationCode(email, record.codeId);

    // Generate new token
    const token = await generateToken(user);

    logInfo("Service.resetPasswordWithCode", "Password reset completed", {
      userId: user.id,
      email,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    };
  } catch (error) {
    logError("Service.resetPasswordWithCode", error, { email });
    throw error;
  }
};

// Refresh JWT token (if you implement refresh token logic)
const refreshToken = async (userId) => {
  try {
    // Get current user data
    const user = await repository.getUserById(userId);
    if (!user) throw new Error("User not found");

    if (user.status !== constants.USER_STATUS_ACTIVE) {
      throw new Error("User account is not active");
    }

    // Generate new token
    const token = await generateToken(user);

    logInfo("Service.refreshToken", "Token refreshed", { userId });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    };
  } catch (error) {
    logError("Service.refreshToken", error, { userId });
    throw error;
  }
};

module.exports = {
  sendVerificationCode,
  verifyAndCreateUser,
  loginUser,
  changePassword,
  requestPasswordReset,
  resetPasswordWithCode,
  refreshToken,
};
