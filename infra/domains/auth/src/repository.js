// infra/domains/auth/src/repository.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { generateULID } = require("./utils-shared/helpers");

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.TABLE_NAME;

exports.putVerificationCode = async (email, codeId, code, ttlSeconds) => {
  const now = new Date().toISOString();

  const item = {
    PK: `USER#${email}`,
    SK: `VERIFICATION#${codeId}`,
    codeId,
    code,
    email,
    createdAt: now,
    TTL: ttlSeconds, // DynamoDB TTL attribute
  };

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );
};

exports.getVerificationCode = async (email, code) => {
  // Query for the most recent verification code for this email
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${email}`,
        ":sk": "VERIFICATION#",
      },
      ScanIndexForward: false, // Most recent first
      Limit: 5, // Check last few codes
    })
  );

  // Find matching code
  const matchingItem = result.Items?.find((item) => item.code === code);

  if (!matchingItem) return null;

  // Check if code is expired
  if (matchingItem && matchingItem.TTL < Math.floor(Date.now() / 1000)) {
    return null; // Expired
  }

  return matchingItem;
};

exports.deleteVerificationCode = async (email, codeId) => {
  await client.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${email}`,
        SK: `VERIFICATION#${codeId}`,
      },
    })
  );
};

exports.getUserByEmail = async (email) => {
  const result = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${email}`,
        SK: "PROFILE",
      },
    })
  );

  return result.Item || null;
};

exports.createPendingUser = async (email, passwordData) => {
  const userId = generateULID();
  const now = new Date().toISOString();

  const user = {
    PK: `USER#${email}`,
    SK: "PROFILE",
    id: userId,
    email,
    status: "PENDING",
    salt: passwordData.salt,
    hash: passwordData.hash,
    createdAt: now,
    updatedAt: now,
    // GSI for email lookups (if needed)
    GSI1PK: `EMAIL#${email}`,
    GSI1SK: "LOOKUP",
  };

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: user,
      ConditionExpression: "attribute_not_exists(PK)", // Prevent overwrites
    })
  );

  return user;
};

exports.createVerifiedUser = async (email, passwordData) => {
  const userId = generateULID();
  const now = new Date().toISOString();

  const user = {
    PK: `USER#${email}`,
    SK: "PROFILE",
    id: userId,
    email,
    name: email.split("@")[0], // Default name from email
    role: "USER",
    status: "ACTIVE", // Already verified
    salt: passwordData.salt,
    hash: passwordData.hash,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    // GSI for email lookups
    GSI1PK: `EMAIL#${email}`,
    GSI1SK: "LOOKUP",
  };

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: user,
      ConditionExpression: "attribute_not_exists(PK)", // Prevent overwrites
    })
  );

  return user;
};

exports.markUserVerified = async (email) => {
  const now = new Date().toISOString();

  await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${email}`,
        SK: "PROFILE",
      },
      UpdateExpression:
        "SET #status = :status, emailVerified = :verified, updatedAt = :now",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "ACTIVE",
        ":verified": true,
        ":now": new Date().toISOString(),
      },
    })
  );
};

exports.updateUserPassword = async (email, passwordData) => {
  const now = new Date().toISOString();

  await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${email}`,
        SK: "PROFILE",
      },
      UpdateExpression: "SET salt = :salt, hash = :hash, updatedAt = :now",
      ExpressionAttributeValues: {
        ":salt": passwordData.salt,
        ":hash": passwordData.hash,
        ":now": now,
      },
    })
  );
};
