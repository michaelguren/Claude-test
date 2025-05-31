// domains/users/index.js
// Lambda handler entry point for user management

const controller = require("./src/controller.js");

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  return await controller.handleRequest(event);
};
