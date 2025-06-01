// infra/domains/auth/src/service.js
// Simplified business logic for authentication operations
const crypto = require("crypto");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const {
  generateULID,
  getCurrentTimestamp,
  isValidEmail,
} = require("./utils-shared/helpers");
const { logInfo, logError } = require("./utils-shared/logger");
const { sendEmail } = require("./utils/email");
const repository = require("./repository");
const constants = require("./utils/constants");

// AWS SDK imports for parameter retrieval
const ssmClient = new SSMClient({});

// Cache JWT secret to avoid repeated SSM calls
let jwtSecretCache = null;

// Get JWT secret from Parameter Store
const getJwtSecret = async () => {
  if (jwtSecretCache) return jwtSecretCache;

  try {
    const command = new GetParameterCommand({
      Name:
        process.env.JWT_SECRET_PARAMETER_NAME || "/minimalist-todo/jwt-secret",
      WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    jwtSecretCache = response.Parameter.Value;
    return jwtSecretCache;
  } catch (error) {
    console.error("Error retrieving JWT secret:", error);
    // Fallback for development/local testing
    return "dev-secret-key-change-in-production";
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
  const hashVerify = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return hash === hashVerify;
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

/**
 * NEW SIMPLIFIED METHOD: Create user account and send verification email
 * This combines user creation with verification code sending
 */
const createUserAndSendVerification = async (email, password) => {
  try {
    if (!isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // Check if user already exists
    const existingUser = await repository.getUserByEmail(email);
    if (existingUser) {
      // User already exists - don't allow signup again (security issue)
      if (existingUser.status === constants.USER_STATUS_ACTIVE) {
        throw new Error("User already exists and is verified");
      } else {
        throw new Error(
          "User already exists. Please check your email for verification code or contact support."
        );
      }
    }

    // Create new user in PENDING status
    const { salt, hash } = hashPassword(password);
    await repository.createPendingUser(email, { salt, hash });
    logInfo(
      "Service.createUserAndSendVerification",
      "New user created in pending status",
      { email }
    );

    // Generate and send verification code (whether new or existing user)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeId = generateULID();
    const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 minutes

    // Store verification code
    await repository.putVerificationCode(email, codeId, code, expiresAt);

    // Send email
    await sendEmail(email, code);

    logInfo("Service.createUserAndSendVerification", "Verification code sent", {
      email,
    });
  } catch (error) {
    logError("Service.createUserAndSendVerification", error, { email });
    throw error;
  }
};

/**
 * NEW SIMPLIFIED METHOD: Verify email code and mark user as active
 * This only handles verification - user was already created in signup
 */
const verifyUserEmail = async (email, code) => {
  try {
    if (!isValidEmail(email)) throw new Error("Invalid email format");
    if (!code) throw new Error("Verification code is required");

    // Verify the code
    const record = await repository.getVerificationCode(email, code);
    if (!record) throw new Error("Invalid or expired verification code");

    // Get the user (should exist from signup)
    const user = await repository.getUserByEmail(email);
    if (!user) throw new Error("User not found");

    // Mark user as verified if not already
    if (user.status !== constants.USER_STATUS_ACTIVE) {
      await repository.markUserVerified(user.id);
      user.status = constants.USER_STATUS_ACTIVE;
      user.updatedAt = getCurrentTimestamp();
    }

    // Clean up verification code
    await repository.deleteVerificationCode(email, record.codeId);

    logInfo("Service.verifyUserEmail", "User email verified", {
      email,
      userId: user.id,
    });

    return user;
  } catch (error) {
    logError("Service.verifyUserEmail", error, { email });
    throw error;
  }
};

/**
 * UPDATED METHOD: Login existing user with email and password
 * Now only allows verified users to login
 */
const loginUser = async (email, password) => {
  try {
    if (!isValidEmail(email)) throw new Error("Invalid email format");
    if (!password) throw new Error("Password is required");

    // Get user from database
    const user = await repository.getUserByEmail(email);
    if (!user) throw new Error("Invalid email or password");

    // Check if user is verified
    if (user.status !== constants.USER_STATUS_ACTIVE) {
      throw new Error("Please complete your email verification first");
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
      email,
      userId: user.id,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || email.split("@")[0],
        role: user.role || "USER",
      },
    };
  } catch (error) {
    logError("Service.loginUser", error, { email });
    throw error;
  }
};

// Export simplified API
module.exports = {
  createUserAndSendVerification,
  verifyUserEmail,
  loginUser,
};
