// infra/domains/auth/src/controller.js
// Simplified HTTP request routing for authentication - 3 endpoints only
const {
  parseBody,
  errorResponse,
  successResponse,
  normalizeEmail,
} = require("./utils-shared/helpers");
const { logError } = require("./utils-shared/logger");
const service = require("./service");

/**
 * POST /auth/signup - Create user account and send verification email
 * Payload: { email, password }
 * Response: { message, email }
 */
exports.signupHandler = async (event) => {
  try {
    if (event.routeKey !== "POST /auth/signup") {
      return errorResponse(405, "Method Not Allowed");
    }

    const body = parseBody(event.body);
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse(400, "Email and password are required");
    }

    // Create user and send verification code in one operation
    await service.createUserAndSendVerification(email, password);

    return successResponse(200, {
      message:
        "Account created. Please check your email for verification code.",
      email: normalizeEmail(email),
    });
  } catch (err) {
    console.error("Signup Error:", err);

    if (err.message.includes("already exists")) {
      return errorResponse(409, err.message);
    }
    if (
      err.message.includes("Invalid email") ||
      err.message.includes("Password must be") ||
      err.message.includes("required")
    ) {
      return errorResponse(400, err.message);
    }

    return errorResponse(500, "Internal Server Error");
  }
};

/**
 * POST /auth/verify - Verify email with code (enables login)
 * Payload: { email, code }
 * Response: { message, user }
 */
exports.verifyHandler = async (event) => {
  try {
    if (event.routeKey !== "POST /auth/verify") {
      return errorResponse(405, "Method Not Allowed");
    }

    const body = parseBody(event.body);
    const { email, code } = body;

    if (!email || !code) {
      return errorResponse(400, "Email and verification code are required");
    }

    // Verify code and mark user as active
    const user = await service.verifyUserEmail(email, code);

    return successResponse(200, {
      message: "Email verified successfully. You can now log in.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Verify Error:", err);

    if (
      err.message.includes("Invalid or expired") ||
      err.message.includes("not found") ||
      err.message.includes("required")
    ) {
      return errorResponse(400, err.message);
    }

    return errorResponse(500, "Internal Server Error");
  }
};

/**
 * POST /auth/login - Login with email/password (verified users only)
 * Payload: { email, password }
 * Response: { token, user }
 */
exports.loginHandler = async (event) => {
  try {
    if (event.routeKey !== "POST /auth/login") {
      return errorResponse(405, "Method Not Allowed");
    }

    const body = parseBody(event.body);
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse(400, "Email and password are required");
    }

    // Login user and generate JWT token
    const result = await service.loginUser(email, password);

    return successResponse(200, {
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);

    if (
      err.message.includes("Invalid email or password") ||
      err.message.includes("not verified") ||
      err.message.includes("complete your verification") ||
      err.message.includes("Invalid user account")
    ) {
      return errorResponse(401, err.message);
    }

    return errorResponse(500, "Internal Server Error");
  }
};
