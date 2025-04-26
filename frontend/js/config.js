/**
 * Configuration settings for the TODO application
 * This file should be loaded before other app scripts
 */

// config.js

(function () {
  // Default configuration values
  const defaultConfig = {
    // API configuration
    apiBaseUrl: "",
    useMockApi: true, // Default to mock API for local development

    // Auth configuration
    cognitoUserPoolId: "",
    cognitoClientId: "",
    cognitoHostedUiUrl: "",
    cognitoLogoutUrl: "",

    // Environment settings
    environment: "local", // local, dev, prod
    debug: true,
  };

  // Environment-specific configurations
  const environmentConfigs = {
    local: {
      useMockApi: true,
      // For local development, we don't need real Cognito details
      cognitoUserPoolId: "", // Not used in local development
      cognitoClientId: "", // Not used in local development
      region: "us-east-1", // Default region
      cognitoHostedUiUrl: "", // Not used in local development
      cognitoLogoutUrl: "", // Not used in local development
    },

    dev: {
      apiBaseUrl: "https://api-dev.example.com",
      useMockApi: false,
      cognitoUserPoolId: "", // DEV User Pool ID
      cognitoClientId: "", // DEV Client ID
      cognitoHostedUiUrl: "", // DEV Hosted UI URL
      cognitoLogoutUrl: "", // DEV Logout URL
    },

    prod: {
      apiBaseUrl: "https://api.example.com",
      useMockApi: false,
      debug: false,
      cognitoUserPoolId: "", // PROD User Pool ID
      cognitoClientId: "", // PROD Client ID
      cognitoHostedUiUrl: "", // PROD Hosted UI URL
      cognitoLogoutUrl: "", // PROD Logout URL
    },
  };

  // Detect environment based on URL
  function detectEnvironment() {
    const hostname = window.location.hostname;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "local";
    }

    if (hostname.includes("-dev") || hostname.includes(".dev.")) {
      return "dev";
    }

    return "prod";
  }

  // Load configuration from CloudFormation outputs or remote source
  async function loadRemoteConfig() {
    try {
      // For production, we might load config from an endpoint
      // But for now, we'll just keep it simple
      return {};
    } catch (error) {
      console.error("Error loading remote config:", error);
      return {};
    }
  }

  // Initialize configuration
  async function initConfig() {
    // Detect environment
    const env = detectEnvironment();
    console.log("Detected environment:", env);

    // Create base config by merging default with environment-specific values
    let config = {
      ...defaultConfig,
      ...environmentConfigs[env],
      environment: env,
    };

    // Load remote configuration (override local values)
    const remoteConfig = await loadRemoteConfig();
    config = {
      ...config,
      ...remoteConfig,
    };

    // Dynamic configurations based on combined settings

    // Construct Hosted UI sign-in URL if we have the required values
    if (config.cognitoClientId && !config.cognitoHostedUiUrl) {
      const callbackUrl = encodeURIComponent(
        window.location.origin + "/callback.html"
      );

      config.cognitoHostedUiUrl =
        `https://${config.cognitoUserPoolId.split("_")[0]}.auth.${
          config.region || "us-east-1"
        }.amazoncognito.com/login` +
        `?client_id=${config.cognitoClientId}` +
        `&response_type=token` +
        `&scope=email+openid+profile` +
        `&redirect_uri=${callbackUrl}`;
    }

    // Construct logout URL if not set
    if (config.cognitoClientId && !config.cognitoLogoutUrl) {
      const logoutUrl = encodeURIComponent(
        window.location.origin + "/index.html"
      );

      config.cognitoLogoutUrl =
        `https://${config.cognitoUserPoolId.split("_")[0]}.auth.${
          config.region || "us-east-1"
        }.amazoncognito.com/logout` +
        `?client_id=${config.cognitoClientId}` +
        `&logout_uri=${logoutUrl}`;
    }

    // Log configuration in debug mode
    if (config.debug) {
      console.log("App configuration:", config);
    }

    // Expose configuration globally
    window.APP_CONFIG = config;

    return config;
  }

  // Execute initialization when DOM is loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initConfig);
  } else {
    initConfig();
  }
})();
