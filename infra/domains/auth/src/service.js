// infra/domains/auth/src/service.js

const crypto = require("crypto");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { isValidEmail, generateULID } = require("./utils-shared/helpers");
const {
  putVerificationCode,
  getVerificationCode,
  deleteVerificationCode,
  getUserByEmail,
  createPendingUser,
  markUserVerified,
  createVerifiedUser,
} = require("./repository");
const { sendEmail } = require("./utils/email");

// AWS SDK imports for parameter retrieval
const ssmClient = new SSMClient({});

// Cache JWT secret to avoid repeated SSM calls
let jwtSecret = null;

// Get JWT secret from Parameter Store
const getJwtSecret = async () => {
  if (jwtSecret) return jwtSecret;

  try {
    const command = new GetParameterCommand({
      Name:
        process.env.JWT_SECRET_PARAMETER_NAME || "/minimalist-todo/jwt-secret",
      WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    jwtSecret = response.Parameter.Value;
    return jwtSecret;
  } catch (error) {
    console.error("Error retrieving JWT secret:", error);
    // Fallback for development/local testing
    return "dev-fallback-secret-key-not-for-production";
  }
};

// Simple password hashing using Node.js built-in crypto (no external dependencies)
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return { salt, hash };
};

const verifyPassword = (password, salt, hash) => {
  const computedHash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return hash === computedHash;
};

// Generate simple JWT token (for MVP - consider AWS Cognito for production)
const generateToken = async (user) => {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");

  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role || "USER",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    })
  ).toString("base64url");

  // Get secret from Parameter Store
  const secret = await getJwtSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
};

exports.sendVerificationCode = async (email) => {
  if (!isValidEmail(email)) {
    throw new Error("Invalid email format");
  }

  // Check if user already exists and is verified
  const existingUser = await getUserByEmail(email);
  if (existingUser && existingUser.status === "ACTIVE") {
    throw new Error("User already exists and is verified");
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeId = generateULID();
  const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 minutes

  // Store verification code
  await putVerificationCode(email, codeId, code, expiresAt);
  await sendEmail(email, code);
};

exports.verifyAndCreateUser = async (email, code, password) => {
  if (!isValidEmail(email)) throw new Error("Invalid email format");
  if (!code) throw new Error("Verification code is required");
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  // Verify the code
  const record = await getVerificationCode(email, code);
  if (!record) throw new Error("Invalid or expired verification code");

  // Check if user already exists and is verified
  const existingUser = await getUserByEmail(email);
  if (existingUser && existingUser.status === "ACTIVE") {
    throw new Error("User already exists and is verified");
  }

  // Hash password
  const { salt, hash } = hashPassword(password);

  // Create the user as ACTIVE (since email is verified)
  await createVerifiedUser(email, { salt, hash });

  // Clean up verification code
  await deleteVerificationCode(email, record.codeId);

  // Get the created user and generate token
  const user = await getUserByEmail(email);
  const token = await generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || email.split("@")[0],
      role: user.role || "USER",
    },
  };
};

exports.loginUser = async (email, password) => {
  if (!isValidEmail(email)) throw new Error("Invalid email format");
  if (!password) throw new Error("Password is required");

  // Get user from database
  const user = await getUserByEmail(email);
  if (!user) throw new Error("Invalid email or password");

  // Check if user is verified
  if (user.status !== "ACTIVE") {
    throw new Error("Please complete your registration first");
  }

  // Verify password
  if (!user.salt || !user.hash) {
    throw new Error("Invalid user account");
  }

  const isValidPassword = verifyPassword(password, user.salt, user.hash);
  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }

  // Generate JWT token
  const token = await generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || email.split("@")[0],
      role: user.role || "USER",
    },
  };
};
