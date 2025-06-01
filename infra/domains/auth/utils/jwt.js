import crypto from "crypto";
import { JWT_SECRET, JWT_EXPIRY } from "infra/domains/_shared/constants.js";
import { logError } from "infra/domains/_shared/utils/logger.js";

/**
 * Generate a JWT token
 * Simple implementation without external dependencies
 */
export function generateJWT(payload) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = parseExpiry(JWT_EXPIRY);

  const claims = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const encodedHeader = base64urlEscape(
    Buffer.from(JSON.stringify(header)).toString("base64")
  );
  const encodedPayload = base64urlEscape(
    Buffer.from(JSON.stringify(claims)).toString("base64")
  );

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64");

  const encodedSignature = base64urlEscape(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return null;
    }

    // Verify signature
    const signature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64");

    const expectedSignature = base64urlEscape(signature);

    if (expectedSignature !== encodedSignature) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(base64urlUnescape(encodedPayload), "base64").toString()
    );

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch (error) {
    logError("JWT verification error", error);
    return null;
  }
}

/**
 * Convert base64 to base64url
 */
function base64urlEscape(str) {
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Convert base64url to base64
 */
function base64urlUnescape(str) {
  return (str + "===".slice((str.length + 3) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
}

/**
 * Parse expiry string (e.g., "7d", "24h", "60m") to seconds
 */
function parseExpiry(expiry) {
  const match = expiry.match(/^(\d+)([dhm])$/);
  if (!match) {
    throw new Error(
      "Invalid expiry format. Use format like '7d', '24h', or '60m'"
    );
  }

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case "d":
      return num * 24 * 60 * 60;
    case "h":
      return num * 60 * 60;
    case "m":
      return num * 60;
    default:
      throw new Error("Invalid time unit");
  }
}
