// domains/auth/src/repository.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;

const {
  USER_PREFIX,
  VERIFICATION_CODE_PREFIX,
  USER_PROFILE_SUFFIX,
  USER_STATUS_PENDING,
  USER_STATUS_ACTIVE,
} = require("./utils/constants");

exports.putVerificationCode = async (email, code, ttlSeconds) => {
  const now = new Date().toISOString();

  await client.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `${USER_PREFIX}${email}`,
        SK: `${VERIFICATION_CODE_PREFIX}${code}`,
        email,
        code,
        createdAt: now,
        updatedAt: now,
        TTL: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    })
  );
};

exports.getVerificationCode = async (
  email,
  prefix = VERIFICATION_CODE_PREFIX
) => {
  const pk = `${USER_PREFIX}${email}`;

  const res = await client.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": pk,
        ":prefix": prefix,
      },
      ScanIndexForward: false,
      Limit: 1,
    })
  );

  return res.Items?.[0] || null;
};

exports.deleteVerificationCode = async (email, code) => {
  await client.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: {
        PK: `${USER_PREFIX}${email}`,
        SK: `${VERIFICATION_CODE_PREFIX}${code}`,
      },
    })
  );
};

exports.getUserByEmail = async (email) => {
  const res = await client.send(
    new GetCommand({
      TableName: TABLE,
      Key: {
        PK: `${USER_PREFIX}${email}`,
        SK: USER_PROFILE_SUFFIX,
      },
    })
  );

  return res.Item || null;
};

exports.createPendingUser = async (email) => {
  const now = new Date().toISOString();

  await client.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `${USER_PREFIX}${email}`,
        SK: USER_PROFILE_SUFFIX,
        email,
        status: USER_STATUS_PENDING,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );
};

exports.markUserVerified = async (email) => {
  await client.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: {
        PK: `${USER_PREFIX}${email}`,
        SK: USER_PROFILE_SUFFIX,
      },
      UpdateExpression:
        "SET emailVerified = :true, status = :status, updatedAt = :now",
      ExpressionAttributeValues: {
        ":true": true,
        ":status": USER_STATUS_ACTIVE,
        ":now": new Date().toISOString(),
      },
    })
  );
};
