// infra/domains/auth/service.js

import crypto from "crypto";
import { ulid } from "ulid";

import {
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryGSI,
} from "infra/domains/_shared/utils/dynamodb.js";
import { logInfo, logError } from "infra/domains/_shared/utils/logger.js";
import {
  isValidEmail,
  getCurrentTimestamp,
} from "infra/domains/_shared/utils/helpers.js";
import { generateJWT } from "./utils/jwt.js";
import { sendVerificationEmail } from "./utils/email.js";

// Constants
const OTP_EXPIRY_MINUTES = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const USER_STATUS_PENDING = "PENDING";
const USER_STATUS_VERIFIED = "VERIFIED";

function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString("hex");
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512");
  return `pbkdf2$100000$${salt}$${derivedKey.toString("hex")}`;
}

function verifyPassword(password, hashedPassword) {
  const [algorithm, iterations, salt, hash] = hashedPassword.split("$");
  const derivedKey = crypto.pbkdf2Sync(
    password,
    salt,
    parseInt(iterations),
    Buffer.from(hash, "hex").length,
    "sha512"
  );
  return derivedKey.toString("hex") === hash;
}

function generateOTP(length = 6) {
  const max = Math.pow(10, length) - 1;
  const randomBuffer = crypto.randomBytes(4);
  const randomNumber = randomBuffer.readUInt32BE(0);
  return Math.floor((randomNumber / 0xffffffff) * max)
    .toString()
    .padStart(length, "0");
}

export async function handleSignup(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, password } = body;

    if (!isValidEmail(email) || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email and password are required" }),
      };
    }

    const userKey = { PK: `USER#${email}`, SK: `PROFILE` };
    const existing = await getItem(userKey);
    if (existing?.Item) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "User already exists" }),
      };
    }

    const user = {
      ...userKey,
      password: hashPassword(password),
      status: USER_STATUS_PENDING,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };
    await putItem(user);

    const otp = generateOTP();
    const otpItem = {
      PK: `OTP#${email}`,
      SK: `CODE#${ulid()}`,
      code: otp,
      expiresAt: Math.floor(Date.now() / 1000) + OTP_EXPIRY_MINUTES * 60,
      TTL: Math.floor(Date.now() / 1000) + OTP_EXPIRY_MINUTES * 60,
    };
    await putItem(otpItem);
    await sendVerificationEmail(email, otp);

    logInfo("Signup", "User created and verification email sent", { email });
    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Verification code sent" }),
    };
  } catch (err) {
    logError("Signup", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to create user" }),
    };
  }
}

export async function handleLogin(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, password } = body;

    if (!isValidEmail(email) || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid credentials" }),
      };
    }

    const userKey = { PK: `USER#${email}`, SK: `PROFILE` };
    const result = await getItem(userKey);
    const user = result?.Item;
    if (!user || !verifyPassword(password, user.password)) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid credentials" }),
      };
    }

    if (user.status !== USER_STATUS_VERIFIED) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Please verify your email first" }),
      };
    }

    const token = generateJWT({ userId: user.PK, email });
    return {
      statusCode: 200,
      body: JSON.stringify({ token }),
    };
  } catch (err) {
    logError("Login", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Login failed" }) };
  }
}

export async function handleVerify(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, code } = body;

    if (!isValidEmail(email) || !code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email and code are required" }),
      };
    }

    const result = await queryGSI("OTP#" + email, "CODE#", {
      IndexName: "GSI1",
    });
    const match = result.Items?.find((item) => item.code === code);

    if (!match || match.expiresAt < Math.floor(Date.now() / 1000)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid or expired code" }),
      };
    }

    await deleteItem({ PK: match.PK, SK: match.SK });
    const userKey = { PK: `USER#${email}`, SK: `PROFILE` };
    await updateItem({
      Key: userKey,
      UpdateExpression: "set #status = :verified, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":verified": USER_STATUS_VERIFIED,
        ":updatedAt": getCurrentTimestamp(),
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email verified" }),
    };
  } catch (err) {
    logError("Verify", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Verification failed" }),
    };
  }
}
