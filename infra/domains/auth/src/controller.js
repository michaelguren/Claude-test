// infra/domains/auth/src/controller.js
// Simplified HTTP request routing for authentication - 3 endpoints only

import {
  parseBody,
  errorResponse,
  successResponse,
} from "infra/domains/_shared/utils/helpers.js";

import * as UserService from "infra/domains/users/src/service.js";
import * as AuthService from "./service.js";

/**
 * POST /auth/signup - Begin signup flow for a new user
 * Payload: { email }
 * Behavior: Creates user record (if not exists) and sends verification code
 * Response: { message }
 * Errors:
 *   400 - Missing email
 *   409 - User already exists
 */
export async function signupHandler(event) {
  const body = parseBody(event);
  const { email } = body;

  if (!email) {
    return errorResponse(400, "Missing required field: email");
  }

  const user = await UserService.getUserByEmail(email);

  if (user) {
    return errorResponse(409, "User already exists");
  }

  await UserService.createUser({ email });
  await AuthService.sendVerificationCode({ email });

  return successResponse(200, { message: "Verification code sent" });
}

/**
 * POST /auth/verify - Verify user with email+code
 * Payload: { email, code }
 * Behavior: Verifies code, then asks users domain to activate the user
 * Response: { message, user }
 * Errors:
 *   400 - Missing or invalid input
 *   500 - Internal error
 */
export async function verifyHandler(event) {
  try {
    const body = parseBody(event);
    const { email, code } = body;

    if (!email || !code) {
      return errorResponse(400, "Email and verification code are required");
    }

    const { user, codeId } = await AuthService.verifyUserCode(email, code);

    if (user.status !== "ACTIVE") {
      await UserService.activateUser(user.userId);
      user.status = "ACTIVE";
    }

    await AuthService.deleteVerificationCode(email, codeId);

    return successResponse(200, {
      message: "Email verified successfully. You can now log in.",
      user: {
        id: user.userId,
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
}

/**
 * POST /auth/login - Login with email/password (verified users only)
 * Payload: { email, password }
 * Response: { token, user }
 */
export async function loginHandler(event) {
  try {
    if (event.routeKey !== "POST /auth/login") {
      return errorResponse(405, "Method Not Allowed");
    }

    const body = parseBody(event.body);
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse(400, "Email and password are required");
    }

    const result = await AuthService.loginUser(email, password);

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
}
