import * as controller from "./src/controller.js";
import { withCors } from "infra/domains/_shared/utils/cors.js";

const usersHandler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  return await controller.handleRequest(event);
};

// Export the handler wrapped with CORS handling
export const handler = withCors(usersHandler);
