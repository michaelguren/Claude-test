// infra/domains/auth/src/controller.js

const {
  parseBody,
  errorResponse,
  successResponse,
} = require("./utils-shared/helpers");
const {
  sendVerificationCode,
  verifyAndCreateUser,
  loginUser,
} = require("./service");

exports.signupHandler = async (event) => {
  try {
    if (event.requestContext?.http?.method !== "POST") {
      return errorResponse(405, "Method Not Allowed");
    }

    const body = parseBody(event.body);
    const email = body?.email?.toLowerCase()?.trim();

    if (!email) return errorResponse(400, "Email is required");

    await sendVerificationCode(email);
    return successResponse(200, {
      message: "Verification code sent to your email",
    });
  } catch (err) {
    console.error("Signup Error:", err);
    if (err.message.includes("already exists")) {
      return errorResponse(409, err.message);
    }
    if (err.message.includes("Invalid email")) {
      return errorResponse(400, err.message);
    }
    return errorResponse(500, "Internal Server Error");
  }
};

exports.verifySignupHandler = async (event) => {
  try {
    if (event.requestContext?.http?.method !== "POST") {
      return errorResponse(405, "Method Not Allowed");
    }

    const body = parseBody(event.body);
    const email = body?.email?.toLowerCase()?.trim();
    const code = body?.code?.trim();
    const password = body?.password?.trim();

    if (!email || !code || !password) {
      return errorResponse(400, "Email, code, and password are required");
    }

    const result = await verifyAndCreateUser(email, code, password);
    return successResponse(201, {
      message: "Registration completed successfully",
      ...result,
    });
  } catch (err) {
    console.error("Verify Signup Error:", err);
    if (err.message.includes("Invalid or expired")) {
      return errorResponse(400, err.message);
    }
    if (err.message.includes("already exists")) {
      return errorResponse(409, err.message);
    }
    if (
      err.message.includes("Password must be") ||
      err.message.includes("Invalid email") ||
      err.message.includes("required")
    ) {
      return errorResponse(400, err.message);
    }
    return errorResponse(500, "Internal Server Error");
  }
};

exports.loginHandler = async (event) => {
  try {
    if (event.requestContext?.http?.method !== "POST") {
      return errorResponse(405, "Method Not Allowed");
    }

    const body = parseBody(event.body);
    const email = body?.email?.toLowerCase()?.trim();
    const password = body?.password?.trim();

    if (!email || !password) {
      return errorResponse(400, "Email and password are required");
    }

    const result = await loginUser(email, password);
    return successResponse(200, result);
  } catch (err) {
    console.error("Login Error:", err);
    if (
      err.message.includes("Invalid email or password") ||
      err.message.includes("complete your registration") ||
      err.message.includes("Invalid user account")
    ) {
      return errorResponse(401, err.message);
    }
    if (
      err.message.includes("Invalid email") ||
      err.message.includes("required")
    ) {
      return errorResponse(400, err.message);
    }
    return errorResponse(500, "Internal Server Error");
  }
};
