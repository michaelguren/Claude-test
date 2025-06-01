// infra/domains/auth/index.js
// Main auth Lambda handler with simplified 3-endpoint routing
import { withCors } from "infra/domains/_shared/utils/cors.js";
import {
  signupHandler,
  verifyHandler,
  loginHandler,
} from "./src/controller.js";

const authHandler = async (event) => {
  console.log("Auth event:", JSON.stringify(event, null, 2));

  try {
    // Route based on event.routeKey (HTTP API v2.0 format)
    switch (event.routeKey) {
      case "POST /auth/signup":
        return await signupHandler(event);

      case "POST /auth/verify":
        return await verifyHandler(event);

      case "POST /auth/login":
        return await loginHandler(event);

      default:
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Route not found" }),
        };
    }
  } catch (error) {
    console.error("Auth handler error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

// Export the handler wrapped with CORS handling
export const handler = withCors(authHandler);
