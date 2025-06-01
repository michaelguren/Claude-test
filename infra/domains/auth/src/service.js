// infra/domains/auth/src/service.js
// Simplified business logic for authentication operations

import crypto from "crypto";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import {
  generateULID,
  getCurrentTimestamp,
  isValidEmail,
} from "infra/domains/_shared/utils/helpers.js";
import { logInfo, logError } from "infra/domains/_shared/utils/logger.js";
import { sendEmail } from "./utils/email.js";
import * as repository from "./repository.js";
import * as constants from "infra/domains/_shared/utils/constants.js";

const ssmClient = new SSMClient({});
let jwtSecretCache = null;

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
    return "dev-secret-key-change-in-production";
  }
};

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

const generateToken = async (user) => {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");

  const payload = Buffer.from(
    JSON.stringify({
      iss: "minimalist-todo-app",
      aud: "minimalist-todo-api",
      sub: user.userId,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    })
  ).toString("base64url");

  const secret = await getJwtSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
};

const createUserAndSendVerification = async (email, password) => {
  try {
    if (!isValidEmail(email)) throw new Error("Invalid email format");
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    const existingUser = await repository.getUserByEmail(email);
    if (existingUser) {
      if (existingUser.status === constants.USER_STATUS_ACTIVE) {
        throw new Error("User already exists and is verified");
      } else {
        throw new Error(
          "User already exists. Please check your email for verification code or contact support."
        );
      }
    }

    const { salt, hash } = hashPassword(password);
    await repository.createPendingUser(email, { salt, hash });

    logInfo(
      "Service.createUserAndSendVerification",
      "New user created in pending status",
      { email }
    );

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeId = generateULID();
    const expiresAt = Math.floor(Date.now() / 1000) + 600;

    await repository.putVerificationCode(email, codeId, code, expiresAt);
    await sendEmail(email, code);

    logInfo("Service.createUserAndSendVerification", "Verification code sent", {
      email,
    });
  } catch (error) {
    logError("Service.createUserAndSendVerification", error, { email });
    throw error;
  }
};

const verifyUserCode = async (email, code) => {
  try {
    if (!isValidEmail(email)) throw new Error("Invalid email format");
    if (!code) throw new Error("Verification code is required");

    const record = await repository.getVerificationCode(email, code);
    if (!record) throw new Error("Invalid or expired verification code");

    const user = await repository.getUserByEmail(email);
    if (!user) throw new Error("User not found");

    if (user.status !== constants.USER_STATUS_ACTIVE) {
      await repository.markUserVerified(email);
      user.status = constants.USER_STATUS_ACTIVE;
      user.updatedAt = getCurrentTimestamp();
    }

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

const loginUser = async (email, password) => {
  try {
    if (!isValidEmail(email)) throw new Error("Invalid email format");
    if (!password) throw new Error("Password is required");

    const user = await repository.getUserByEmail(email);
    if (!user) throw new Error("Invalid email or password");

    if (user.status !== constants.USER_STATUS_ACTIVE) {
      throw new Error("Please complete your email verification first");
    }

    if (!user.salt || !user.hash) {
      throw new Error("Invalid user account");
    }

    const isValidPassword = verifyPassword(password, user.salt, user.hash);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

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

// Export at bottom
export { createUserAndSendVerification, verifyUserCode, loginUser };
