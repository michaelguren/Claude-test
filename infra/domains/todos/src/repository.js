// infra/domains/todos/src/repository.js
// Data access layer for TODO management

const {
  putItem,
  getItem,
  updateItem,
  deleteItem,
  listItems,
} = require("./utils-shared/dynamodb");
const { logError } = require("./utils-shared/logger");
const constants = require("./utils/constants");

const createTodo = async (todo) => {
  try {
    const item = {
      PK: `${constants.USER_PREFIX}${todo.userEmail}`,
      SK: `${constants.TODO_PREFIX}${todo.todoId}`,
      todoId: todo.todoId,
      userEmail: todo.userEmail,
      text: todo.text,
      completed: todo.completed,
      status: todo.status,
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
    };

    // Use condition to prevent overwriting existing TODOs
    await putItem(
      item,
      "attribute_not_exists(PK) AND attribute_not_exists(SK)"
    );
    return todo;
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      throw new Error("TODO already exists");
    }
    logError("Repository.createTodo", error, { todoId: todo.todoId });
    throw error;
  }
};

const getTodoById = async (todoId, userEmail) => {
  try {
    const key = {
      PK: `${constants.USER_PREFIX}${userEmail}`,
      SK: `${constants.TODO_PREFIX}${todoId}`,
    };

    const result = await getItem(key);
    return result?.Item || null;
  } catch (error) {
    logError("Repository.getTodoById", error, { todoId, userEmail });
    throw error;
  }
};

const listTodosByUserEmail = async (userEmail) => {
  try {
    // Use listItems with PK and SK prefix for efficient querying
    const result = await listItems(
      `${constants.USER_PREFIX}${userEmail}`,
      constants.TODO_PREFIX
    );

    return result?.Items || [];
  } catch (error) {
    logError("Repository.listTodosByUserEmail", error, { userEmail });
    throw error;
  }
};

const updateTodo = async (todo) => {
  try {
    const key = {
      PK: `${constants.USER_PREFIX}${todo.userEmail}`,
      SK: `${constants.TODO_PREFIX}${todo.todoId}`,
    };

    const updateExpression =
      "SET #text = :text, completed = :completed, #status = :status, updatedAt = :updatedAt";
    const expressionAttributeNames = {
      "#text": "text",
      "#status": "status", // 'status' is a reserved word in DynamoDB
    };
    const expressionAttributeValues = {
      ":text": todo.text,
      ":completed": todo.completed,
      ":status": todo.status,
      ":updatedAt": todo.updatedAt,
    };

    const params = {
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
      ReturnValues: "ALL_NEW",
    };

    const result = await updateItem(params);
    return result?.Attributes || null;
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      throw new Error("TODO not found");
    }
    logError("Repository.updateTodo", error, {
      todoId: todo.todoId,
      userEmail: todo.userEmail,
    });
    throw error;
  }
};

const deleteTodo = async (todoId, userEmail) => {
  try {
    const key = {
      PK: `${constants.USER_PREFIX}${userEmail}`,
      SK: `${constants.TODO_PREFIX}${todoId}`,
    };

    const params = {
      Key: key,
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
    };

    await deleteItem(params);
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      throw new Error("TODO not found");
    }
    logError("Repository.deleteTodo", error, { todoId, userEmail });
    throw error;
  }
};

module.exports = {
  createTodo,
  getTodoById,
  listTodosByUserEmail,
  updateTodo,
  deleteTodo,
};
