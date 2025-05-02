const projectConfig = {
  application: {
    name: "minimalist-todo",
    description: "Minimalist TODO Application with zero dependencies",
  },
  aws: {
    templateBucket: "minimalist-todo-templates-550398958311-20250427",
    accountId: "550398958311",
    region: "us-east-1",
  },
  resources: {
    stack: {
      name: "minimalist-todo-dev",
      created: "2025-04-27T21:58:11Z",
      updated: "2025-04-27T21:58:11Z",
    },
    frontend: {
      bucketName:
        "minimalist-todo-dev-frontendstack-15-todoappbucket-h7brhlnjwosf",
      cloudfrontId: "E13A0HRBL1QP4A",
      cloudfrontDomain: "d2ncl60e938cjf.cloudfront.net",
    },
    auth: {
      userPoolId: "", // Will be populated during deployment
      userPoolClientId: "", // Will be populated during deployment
      userPoolDomain: "", // Will be populated during deployment
    },
  },
  deployments: [
    {
      timestamp: "2025-04-27T21:58:11Z",
      user: "michaelguren",
      success: true,
      environment: "dev",
    },
  ],
};

// Function to detect if we're running on localhost
function isLocalhost() {
  // When in Node.js during deployment
  if (typeof window === "undefined") {
    // During deployment, we'll explicitly set this via environment variable
    return process.env.DEPLOY_TARGET === "local";
  }

  // When in browser
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  }

  return false;
}

// Dynamically determine if auth should be enabled based on environment
projectConfig.features = {
  authEnabled: !isLocalhost(), // Disabled on localhost, enabled on AWS
};

// In browser environments, export to window
if (typeof window !== "undefined") {
  window.projectConfig = projectConfig;
}

// In Node.js environments, export as module
if (typeof module !== "undefined" && module.exports) {
  module.exports = projectConfig;
}
