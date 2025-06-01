// infra/domains/auth/authorizer.js

import { verifyJWT } from "./utils/jwt.js";
import { getUserByEmail } from "infra/domains/users/service.js";
import { logInfo, logError } from "../../_shared/utils/logger.js";

export const handler = async (event) => {
  try {
    logInfo("Authorizer invoked", { token: event.authorizationToken });

    const token = extractToken(event.authorizationToken);
    if (!token) throw new Error("Unauthorized");

    const decoded = await verifyJWT(token);
    if (!decoded?.email) throw new Error("Invalid token payload");

    const user = await getUserByEmail(decoded.email);
    if (!user || user.status !== "ACTIVE") {
      logInfo("User not found or not active", { email: decoded.email });
      throw new Error("Unauthorized");
    }

    const policy = generatePolicy(decoded.userId, "Allow", event.methodArn);
    policy.context = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role || "USER",
    };

    logInfo("Authorization successful", { userId: decoded.userId });
    return policy;
  } catch (error) {
    logError("Authorization failed", error);
    throw new Error("Unauthorized");
  }
};

function extractToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
}

function generatePolicy(principalId, effect, resource) {
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
  };
}
