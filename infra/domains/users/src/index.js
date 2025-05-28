const controller = require("./controller");

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  return await controller.handleRequest(event);
};
