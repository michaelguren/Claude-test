const { isValidEmail } = require("./utils-shared/helpers");
const {
  getUserByEmail,
  createPendingUser,
  putVerificationCode,
  getVerificationCode,
  markUserVerified,
  deleteVerificationCode,
} = require("./repository");
const { sendEmail } = require("./utils/email");
const {
  hashPassword,
  verifyPassword,
  generateToken,
} = require("./utils/crypto");

exports.registerUser = async (email, password) => {
  if (!isValidEmail(email)) {
    throw new Error("Invalid email format");
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error("User already exists");
  }

  const passwordHash = hashPassword(password);
  await createPendingUser(email, passwordHash);

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Math.floor(Date.now() / 1000) + 600;
  const codeId = generateULID();

  await putVerificationCode(email, codeId, code, expiresAt);
  await sendEmail(email, code);
};

exports.verifyEmailCode = async (email, code) => {
  if (!isValidEmail(email)) throw new Error("Invalid email format");

  const record = await getVerificationCode(email, code);
  if (!record) throw new Error("Invalid or expired verification code");

  await markUserVerified(email);
  await deleteVerificationCode(email, code); // optional cleanup
};
