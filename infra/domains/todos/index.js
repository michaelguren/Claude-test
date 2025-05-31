// infra/domains/todos/index.js

const controller = require("./src/controller");
const { withCors } = require("./src/utils-shared/cors");

const todosHandler = async (event) => {
  console.log("TODOs event:", JSON.stringify(event, null, 2));
  return await controller.handleRequest(event);
};

// Export the handler wrapped with CORS handling
exports.handler = withCors(todosHandler);
