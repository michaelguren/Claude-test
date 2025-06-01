// infra/domains/auth/handler.js

import { withCors } from "infra/domains/_shared/utils/cors.js";
import { handleSignup, handleLogin, handleVerify } from "./service.js";
import { logInfo, logError } from "infra/domains/_shared/utils/logger.js";

export const handler = withCors(async (event) => {
  try {
    logInfo("Auth.handler", "Received event", {
      routeKey: event.routeKey,
    });

    switch (event.routeKey) {
      case "POST /auth/signup":
        return await handleSignup(event);

      case "POST /auth/login":
        return await handleLogin(event);

      case "POST /auth/verify":
        return await handleVerify(event);

      default:
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Route not found" }),
        };
    }
  } catch (error) {
    logError("Auth.handler", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
});
