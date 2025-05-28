const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

const successResponse = (statusCode, data) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    ...corsHeaders,
  },
  body: data ? JSON.stringify(data) : "",
});

const errorResponse = (statusCode, message) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    ...corsHeaders,
  },
  body: JSON.stringify({ error: message }),
});

module.exports = {
  successResponse,
  errorResponse,
};
