/**
 * Application configuration
 * Auto-detects API URL based on environment
 */

// Detect environment and set API base URL
function getApiBaseUrl() {
  const hostname = window.location.hostname;

  // Production - replace with your actual API URL
  if (hostname.includes("your-domain.com")) {
    return "https://api.your-domain.com";
  }

  // Default/staging
  return "https://nfwfkybvol.execute-api.us-east-1.amazonaws.com";
}

// Global configuration
window.APP_CONFIG = {
  apiBaseUrl: getApiBaseUrl(),
  environment:
    window.location.hostname === "localhost" ? "development" : "production",
};

console.log("App config loaded:", window.APP_CONFIG);
