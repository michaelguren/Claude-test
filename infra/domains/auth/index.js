// domains/auth/index.js
const {
  signupHandler,
  verifySignupHandler,
  loginHandler,
} = require("./src/controller");

const { withCors } = require("./src/utils-shared/cors");

const authHandler = async (event) => {
  console.log("Auth event:", JSON.stringify(event, null, 2));

  try {
    // Route based on event.routeKey (HTTP API v2.0 format)
    switch (event.routeKey) {
      case "POST /auth/signup":
        return await signupHandler(event);

      case "POST /auth/verify-signup":
        return await verifySignupHandler(event);

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

// Export the handler wrapped with CORS handling
exports.handler = withCors(authHandler);
