const { signupHandler, verifyEmailHandler } = require("./src/controller");

exports.handler = async (event) => {
  console.log(event);
  if (event.routeKey === "POST /auth/signup") {
    return signupHandler(event);
  }
  if (event.routeKey === "POST /auth/verify-email") {
    return verifyEmailHandler(event);
  }
  return { statusCode: 404, body: "Not Found" };
};
