const projectConfig = {
  "application": {
    "name": "minimalist-todo",
    "description": "Minimalist TODO Application with zero dependencies"
  },
  "aws": {
    "templateBucket": "minimalist-todo-templates-550398958311-20250427",
    "accountId": "550398958311",
    "region": "us-east-1"
  },
  "resources": {
    "stack": {
      "name": null,
      "created": "2025-04-27T21:58:11Z",
      "updated": "2025-04-27T21:58:11Z",
      "deleted": "2025-05-02T01:40:10Z"
    },
    "frontend": {
      "bucketName": null,
      "cloudfrontId": null,
      "cloudfrontDomain": null
    },
    "auth": {
      "userPoolId": "",
      "userPoolClientId": "",
      "userPoolDomain": ""
    }
  },
  "deployments": [
    {
      "timestamp": "2025-05-02T01:40:10Z",
      "user": "michaelguren",
      "action": "delete",
      "environment": "dev"
    },
    {
      "timestamp": "2025-04-27T21:58:11Z",
      "user": "michaelguren",
      "success": true,
      "environment": "dev"
    }
  ],
  "features": {
    "authEnabled": true
  }
};

// In browser environments, export to window
if (typeof window !== "undefined") {
  window.projectConfig = projectConfig;
}

// In Node.js environments, export as module
if (typeof module !== "undefined" && module.exports) {
  module.exports = projectConfig;
}