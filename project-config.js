const projectConfig = {
  "application": {
    "name": "minimalist-todo",
    "description": "Minimalist TODO Application with zero dependencies"
  },
  "aws": {
    "templateBucket": "minimalist-todo-templates-550398958311-20250427",
    "accountId": "550398958311"
  },
  "resources": {
    "stack": {
      "name": "minimalist-todo-dev",
      "created": "2025-04-27T21:58:11Z",
      "updated": "2025-04-27T21:58:11Z"
    },
    "frontend": {
      "bucketName": "minimalist-todo-dev-frontendstack-15-todoappbucket-h7brhlnjwosf",
      "cloudfrontId": "E13A0HRBL1QP4A",
      "cloudfrontDomain": "d2ncl60e938cjf.cloudfront.net"
    }
  },
  "deployments": [
    {
      "timestamp": "2025-04-27T21:58:11Z",
      "user": "michaelguren",
      "success": true,
      "environment": "dev"
    }
  ]
};

// In browser environments, export to window
if (typeof window !== "undefined") {
  window.projectConfig = projectConfig;
}

// In Node.js environments, export as module
if (typeof module !== "undefined" && module.exports) {
  module.exports = projectConfig;
}