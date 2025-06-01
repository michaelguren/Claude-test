// infra/domains/auth/index.js
// Main auth Lambda handler with simplified 3-endpoint routing
const { withCors } = require("./src/utils-shared/cors");
const {
  signupHandler,
  verifyHandler,
  loginHandler,
} = require("./src/controller");

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
exports.handler = withCors(authHandler);
