// infra/domains/auth/src/authorizer.js
// Lambda authorizer for validating custom JWT tokens
import crypto from "crypto";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient({});
let cachedJwtSecret = null;

// Get JWT secret from Parameter Store (cached)
const getJwtSecret = async () => {
  if (cachedJwtSecret) return cachedJwtSecret;

  try {
    const command = new GetParameterCommand({
      Name: process.env.JWT_SECRET_PARAMETER_NAME,
      WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    cachedJwtSecret = response.Parameter.Value;
    return cachedJwtSecret;
  } catch (error) {
    console.error("Error retrieving JWT secret:", error);
    throw new Error("Unable to retrieve JWT secret");
  }
};

// Verify JWT token
const verifyToken = async (token) => {
  try {
    const [header, payload, signature] = token.split(".");

    if (!header || !payload || !signature) {
      throw new Error("Invalid token format");
    }

    // Verify signature
    const secret = await getJwtSecret();
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${header}.${payload}`)
      .digest("base64url");

    if (signature !== expectedSignature) {
      throw new Error("Invalid token signature");
    }

    // Decode and validate payload
    const decodedPayload = JSON.parse(
      Buffer.from(payload, "base64url").toString()
    );

    // Check expiration
    if (
      decodedPayload.exp &&
      decodedPayload.exp < Math.floor(Date.now() / 1000)
    ) {
      throw new Error("Token expired");
    }

    // Check required fields
    if (!decodedPayload.sub || !decodedPayload.email) {
      throw new Error("Missing required token fields");
    }

    return decodedPayload;
  } catch (error) {
    console.error("Token verification failed:", error);
    throw error;
  }
};

// Generate IAM policy
const generatePolicy = (principalId, effect, resource, context = {}) => {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
};

// Main authorizer handler
exports.handler = async (event) => {
  console.log("Authorizer event:", JSON.stringify(event, null, 2));

  try {
    // Extract token from Authorization header
    const token =
      event.authorizationToken?.replace("Bearer ", "") ||
      event.headers?.Authorization?.replace("Bearer ", "") ||
      event.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      console.log("No authorization token provided");
      throw new Error("Unauthorized");
    }

    // Verify the JWT token
    const payload = await verifyToken(token);

    console.log("Token verified for user:", payload.email);

    // Generate allow policy with user context
    return generatePolicy(
      payload.sub, // User ID as principal
      "Allow",
      event.methodArn,
      {
        userId: payload.sub,
        email: payload.email,
        role: payload.role || "USER",
      }
    );
  } catch (error) {
    console.error("Authorization failed:", error.message);

    // Return deny policy for any error
    return generatePolicy("unauthorized", "Deny", event.methodArn);
  }
};
