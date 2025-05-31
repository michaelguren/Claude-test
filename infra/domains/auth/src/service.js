const { isValidEmail } = require("./utils-shared/helpers");
const {
  getUserByEmail,
  createPendingUser,
  putVerificationCode,
} = require("./repository");
const { sendEmail } = require("./utils/email");

exports.sendVerificationCode = async (email) => {
  if (!isValidEmail(email)) throw new Error("Invalid email format");

  const existingUser = await getUserByEmail(email);
  if (!existingUser) {
    await createPendingUser(email);
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const ttl = Math.floor(Date.now() / 1000) + 600; // 10 min

  await putVerificationCode(email, code, ttl);
  await sendEmail(email, code);
};

const {
  getVerificationCode,
  markUserVerified,
  deleteVerificationCode,
} = require("./repository");

exports.verifyEmailCode = async (email, code) => {
  if (!isValidEmail(email)) throw new Error("Invalid email format");

  const record = await getVerificationCode(email, code);
  if (!record) throw new Error("Invalid or expired verification code");

  await markUserVerified(email);
  await deleteVerificationCode(email, code); // optional cleanup
};
