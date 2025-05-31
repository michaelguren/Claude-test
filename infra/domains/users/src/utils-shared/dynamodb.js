// domains/users/utils/dynamodb.js
// DynamoDB client and utility functions

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

// Create DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Create Document client for easier JavaScript object handling
const dynamodb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// Get table name from environment
const TABLE_NAME = process.env.TABLE_NAME;

// Helper function for putting items with condition
const putItem = async (item, conditionExpression = null) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Item: item,
    };

    if (conditionExpression) {
      params.ConditionExpression = conditionExpression;
    }

    await dynamodb.send(new PutCommand(params));
  } catch (error) {
    console.error("Error putting item:", error);
    throw error;
  }
};

// Helper function for getting items
const getItem = async (key) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: key,
    };

    const result = await dynamodb.send(new GetCommand(params));
    return result;
  } catch (error) {
    console.error("Error getting item:", error);
    throw error;
  }
};

// Helper function for updating items
const updateItem = async (params) => {
  try {
    const updateParams = {
      TableName: TABLE_NAME,
      ...params,
    };

    const result = await dynamodb.send(new UpdateCommand(updateParams));
    return result;
  } catch (error) {
    console.error("Error updating item:", error);
    throw error;
  }
};

// Helper function for deleting items
const deleteItem = async (params) => {
  try {
    const deleteParams = {
      TableName: TABLE_NAME,
      ...params,
    };

    await dynamodb.send(new DeleteCommand(deleteParams));
  } catch (error) {
    console.error("Error deleting item:", error);
    throw error;
  }
};

// Efficient list items function using Query operations
const listItems = async (pkValue, skPrefix = null, options = {}) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": pkValue,
      },
    };

    // Add SK prefix condition if provided
    if (skPrefix) {
      params.KeyConditionExpression += " AND begins_with(SK, :sk)";
      params.ExpressionAttributeValues[":sk"] = skPrefix;
    }

    // Add optional parameters
    if (options.limit) {
      params.Limit = options.limit;
    }

    if (options.exclusiveStartKey) {
      params.ExclusiveStartKey = options.exclusiveStartKey;
    }

    if (options.scanIndexForward !== undefined) {
      params.ScanIndexForward = options.scanIndexForward;
    }

    if (options.filterExpression) {
      params.FilterExpression = options.filterExpression;
    }

    if (options.expressionAttributeValues) {
      params.ExpressionAttributeValues = {
        ...params.ExpressionAttributeValues,
        ...options.expressionAttributeValues,
      };
    }

    const result = await dynamodb.send(new QueryCommand(params));
    return result;
  } catch (error) {
    console.error("Error listing items:", error);
    throw error;
  }
};

// Helper function for querying GSI
const queryGSI = async (
  indexName,
  keyConditionExpression,
  expressionAttributeValues,
  options = {}
) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      IndexName: indexName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ...options,
    };

    const result = await dynamodb.send(new QueryCommand(params));
    return result;
  } catch (error) {
    console.error("Error querying GSI:", error);
    throw error;
  }
};

module.exports = {
  putItem,
  getItem,
  updateItem,
  deleteItem,
  listItems,
  queryGSI,
};
