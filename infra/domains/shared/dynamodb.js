const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME;

const getItem = async (pk, sk) => {
  const result = await dynamodb
    .get({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
    })
    .promise();
  return result.Item;
};

const putItem = async (item, conditionExpression = null) => {
  const params = {
    TableName: TABLE_NAME,
    Item: item,
  };

  if (conditionExpression) {
    params.ConditionExpression = conditionExpression;
  }

  await dynamodb.put(params).promise();
};

const updateItem = async (
  pk,
  sk,
  updateExpression,
  expressionAttributeNames,
  expressionAttributeValues,
  conditionExpression = null
) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  if (conditionExpression) {
    params.ConditionExpression = conditionExpression;
  }

  const result = await dynamodb.update(params).promise();
  return result.Attributes;
};

const deleteItem = async (pk, sk, conditionExpression = null) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
  };

  if (conditionExpression) {
    params.ConditionExpression = conditionExpression;
  }

  await dynamodb.delete(params).promise();
};

const queryGSI = async (
  indexName,
  keyConditionExpression,
  expressionAttributeValues,
  options = {}
) => {
  const params = {
    TableName: TABLE_NAME,
    IndexName: indexName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ScanIndexForward: options.scanIndexForward !== false, // Default to true
    Limit: options.limit || 50,
  };

  if (options.lastEvaluatedKey) {
    params.ExclusiveStartKey = options.lastEvaluatedKey;
  }

  const result = await dynamodb.query(params).promise();
  return {
    items: result.Items || [],
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
};

module.exports = {
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryGSI,
  TABLE_NAME,
  dynamodb,
};
