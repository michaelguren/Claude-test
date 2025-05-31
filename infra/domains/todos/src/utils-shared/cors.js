// infra/domains/utils-shared/cors.js
// Shared CORS handling for all Lambda functions

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/**
 * Add CORS headers to any response
 */
const addCorsHeaders = (response) => {
  return {
    ...response,
    headers: {
      ...corsHeaders,
      ...(response.headers || {}),
    },
  };
};

/**
 * Handle OPTIONS requests for CORS preflight
 */
const handleOptions = () => {
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: "",
  };
};

/**
 * Check if the request is an OPTIONS request
 */
const isOptionsRequest = (event) => {
  return event.requestContext?.http?.method === "OPTIONS";
};

/**
 * Wrapper function that handles CORS for any Lambda handler
 * Usage: exports.handler = withCors(async (event) => { ... });
 */
const withCors = (handlerFunction) => {
  return async (event) => {
    try {
      // Handle CORS preflight requests
      if (isOptionsRequest(event)) {
        return handleOptions();
      }

      // Execute the actual handler
      const response = await handlerFunction(event);

      // Add CORS headers to the response
      return addCorsHeaders(response);
    } catch (error) {
      console.error("Handler error:", error);
      return addCorsHeaders({
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      });
    }
  };
};

module.exports = {
  corsHeaders,
  addCorsHeaders,
  handleOptions,
  isOptionsRequest,
  withCors,
};
