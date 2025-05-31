const {
  parseBody,
  successResponse,
  errorResponse,
} = require("./utils-shared/helpers");
const { sendVerificationCode, verifyEmailCode } = require("./service");

exports.signupHandler = async (event) => {
  try {
    const method = event.requestContext?.http?.method;

    if (method !== "POST") {
      return errorResponse(405, "Method Not Allowed");
    }

    const body = parseBody(event.body);
    const email = body?.email?.toLowerCase()?.trim();
    if (!email) return errorResponse(400, "Email is required");

    await sendVerificationCode(email);
    return successResponse(200, { message: "Verification code sent" });
  } catch (err) {
    console.error("Signup Error:", err);
    return errorResponse(500, "Internal Server Error");
  }
};

exports.verifyEmailHandler = async (event) => {
  try {
    const method = event.requestContext?.http?.method;

    if (method !== "POST") {
      return errorResponse(405, "Method Not Allowed");
    }

    const body = parseBody(event.body);
    const email = body?.email?.toLowerCase()?.trim();
    const code = body?.code?.trim();

    if (!email || !code) {
      return errorResponse(400, "Email and code are required");
    }

    await verifyEmailCode(email, code);
    return successResponse(200, { message: "Email verified" });
  } catch (err) {
    console.error("Verification Error:", err);
    return errorResponse(400, err.message);
  }
};

exports.registerHandler = async (event) => {
  try {
    const body = parseBody(event.body);
    const email = body?.email?.toLowerCase()?.trim();
    const password = body?.password?.trim();

    if (!email || !password) {
      return errorResponse(400, "Email and password are required");
    }

    await registerUser(email, password);
    return successResponse(200, { message: "Verification code sent" });
  } catch (err) {
    console.error("Register Error:", err);
    return errorResponse(400, err.message);
  }
};

exports.loginHandler = async (event) => {
  try {
    const body = parseBody(event.body);
    const email = body?.email?.toLowerCase()?.trim();
    const password = body?.password?.trim();

    if (!email || !password) {
      return errorResponse(400, "Email and password are required");
    }

    const token = await loginUser(email, password);
    return successResponse(200, { token });
  } catch (err) {
    console.error("Login Error:", err);
    return errorResponse(401, err.message);
  }
};
