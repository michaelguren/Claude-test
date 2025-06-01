// domains/users/utils/logger.js
// Centralized logging for user domain

const logError = (label, error, context = null) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${label}] ${error.message}`);

  if (error.stack) {
    console.error(`[${timestamp}] [${label}] Stack:`, error.stack);
  }

  if (context) {
    console.error(
      `[${timestamp}] [${label}] Context:`,
      JSON.stringify(context, null, 2)
    );
  }
};

const logInfo = (label, message, context = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${label}] ${message}`);

  if (context) {
    console.log(
      `[${timestamp}] [${label}] Context:`,
      JSON.stringify(context, null, 2)
    );
  }
};

const logWarning = (label, message, context = null) => {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] [${label}] ${message}`);

  if (context) {
    console.warn(
      `[${timestamp}] [${label}] Context:`,
      JSON.stringify(context, null, 2)
    );
  }
};

export { logError, logInfo, logWarning };
