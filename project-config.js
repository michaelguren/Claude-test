// project-config.js
// Centralized static configuration for deployment and deletion.

const projectConfig = {
  appName: "MinimalistTodoStack",
  defaultEnvironment: "DEV",
};

// Export for Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = projectConfig;
}
