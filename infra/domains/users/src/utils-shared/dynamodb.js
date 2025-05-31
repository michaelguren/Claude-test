// domains/users/utils/dynamodb.js
// DynamoDB client and utility functions

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

// Create DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

// Create Document client for easier JavaScript object handling
const dynamodb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// Helper function for putting items with condition
const putItem = async (item, conditionExpression = null) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    Item: item,
  };

  if (conditionExpression) {
    params.ConditionExpression = conditionExpression;
  }

  try {
    await dynamodb.send(new PutCommand(params));
    return item;
  } catch (error) {
    console.error("Error putting item:", error);
    throw error;
  }
};

// Helper function for getting items
const getItem = async (key) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    Key: key,
  };

  try {
    const result = await dynamodb.send(new GetCommand(params));
    return result.Item || null;
  } catch (error) {
    console.error("Error getting item:", error);
    throw error;
  }
};

// Helper function for querying GSI
const queryGSI = async (
  indexName,
  keyCondition,
  attributeValues,
  filterExpression = null
) => {
  const params = {
    TableName: process.env.TABLE_NAME,
    IndexName: indexName,
    KeyConditionExpression: keyCondition,
    ExpressionAttributeValues: attributeValues,
  };

  if (filterExpression) {
    params.FilterExpression = filterExpression;
  }

  try {
    const result = await dynamodb.send(new QueryCommand(params));
    return result;
  } catch (error) {
    console.error("Error querying GSI:", error);
    throw error;
  }
};

// Helper function for scanning table
const scanTable = async (filterExpression = null, attributeValues = null) => {
  const params = {
    TableName: process.env.TABLE_NAME,
  };

  if (filterExpression) {
    params.FilterExpression = filterExpression;
  }

  if (attributeValues) {
    params.ExpressionAttributeValues = attributeValues;
  }

  try {
    const result = await dynamodb.send(new ScanCommand(params));
    return result;
  } catch (error) {
    console.error("Error scanning table:", error);
    throw error;
  }
};

module.exports = {
  dynamodb,
  putItem,
  getItem,
  queryGSI,
  scanTable,
  // Export command classes for direct use if needed
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  DeleteCommand,
};
