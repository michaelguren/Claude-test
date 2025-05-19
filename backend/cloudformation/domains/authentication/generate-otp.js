const crypto = require("crypto");

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

function createExpiry(minutes = 5) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + minutes * 60 * 1000);
  return {
    expires: expiresAt.toISOString(),
    ttl: Math.floor(expiresAt.getTime() / 1000),
  };
}

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event));

  const { phone_number } = event;

  if (!phone_number) {
    throw new Error("Missing phone number");
  }

  const uuid = crypto.randomUUID();
  const code = generateOtpCode();
  const { expires, ttl } = createExpiry();

  return {
    uuid,
    code,
    expires,
    ttl,
  };
};
