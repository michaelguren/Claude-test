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
      "name": null,
      "created": null,
      "updated": null
    },
    "frontend": {
      "bucketName": null,
      "cloudfrontId": null,
      "cloudfrontDomain": null
    }
  },
  "deployments": []
};

// In browser environments, export to window
if (typeof window !== 'undefined') {
  window.projectConfig = projectConfig;
}

// In Node.js environments, export as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = projectConfig;
}