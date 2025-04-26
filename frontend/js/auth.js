/**
 * Minimalist authentication module for Cognito hosted UI with passkeys
 * No external dependencies - pure vanilla JavaScript
 */

// auth.js

// Auth state and tokens
const AUTH = {
  isAuthenticated: false,
  idToken: null,
  accessToken: null,
  tokenExpiry: null,
  user: null,
};

// Initialize auth state from storage
function initAuth() {
  console.log("Initializing auth module");
  try {
    const storedAuth = localStorage.getItem("auth");
    if (storedAuth) {
      const authData = JSON.parse(storedAuth);

      // Check if token is expired
      if (authData.tokenExpiry && new Date(authData.tokenExpiry) > new Date()) {
        Object.assign(AUTH, authData);
        console.log("Auth restored from storage");
      } else {
        // Token expired, clear storage
        localStorage.removeItem("auth");
        console.log("Stored token expired");
      }
    }
  } catch (error) {
    console.error("Error initializing auth:", error);
    localStorage.removeItem("auth");
  }

  return AUTH.isAuthenticated;
}

// Extract tokens from URL hash after Cognito redirect
function handleAuthCallback() {
  if (window.location.hash) {
    const params = new URLSearchParams(window.location.hash.substring(1));

    const idToken = params.get("id_token");
    const accessToken = params.get("access_token");
    const expiresIn = params.get("expires_in");

    if (idToken && accessToken) {
      // Calculate expiry time
      const tokenExpiry = new Date();
      tokenExpiry.setSeconds(
        tokenExpiry.getSeconds() + parseInt(expiresIn, 10)
      );

      // Extract user info from JWT
      const user = parseJwt(idToken);

      // Update auth state
      AUTH.isAuthenticated = true;
      AUTH.idToken = idToken;
      AUTH.accessToken = accessToken;
      AUTH.tokenExpiry = tokenExpiry;
      AUTH.user = {
        id: user.sub,
        email: user.email,
      };

      // Save to storage
      localStorage.setItem("auth", JSON.stringify(AUTH));

      // Clear URL hash to prevent tokens in browser history
      window.history.replaceState(null, "", window.location.pathname);

      return true;
    }
  }

  return false;
}

// Parse JWT token to extract user info
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error parsing JWT:", error);
    return {};
  }
}

// Redirect to Cognito Hosted UI for sign-in or use mock auth for local development
function signIn() {
  const config = window.APP_CONFIG || {};
  
  // Always use mock authentication for local environment
  if (config.environment === 'local' || config.useMockApi) {
    console.log("Using mock authentication for local development");
    
    // Create a mock user and token
    const now = new Date();
    const expiryTime = new Date(now.getTime() + 3600 * 1000); // 1 hour from now

    AUTH.isAuthenticated = true;
    AUTH.idToken = "mock-id-token";
    AUTH.accessToken = "mock-access-token";
    AUTH.tokenExpiry = expiryTime;
    AUTH.user = {
      id: "mock-user-" + Math.random().toString(36).substring(2, 10),
      email: "mockuser@example.com",
    };

    // Save to storage
    localStorage.setItem("auth", JSON.stringify(AUTH));

    // Reload the page to update UI
    window.location.reload();
    return;
  }
  
  // For AWS hosted environments, use Cognito
  const cognitoUrl = config.cognitoHostedUiUrl;
  if (!cognitoUrl) {
    console.error("Cognito Hosted UI URL not configured for non-local environment");
    return;
  }

  // Redirect to Cognito hosted UI
  window.location.href = cognitoUrl;
}

// Sign out the user
function signOut() {
  // Clear auth state
  AUTH.isAuthenticated = false;
  AUTH.idToken = null;
  AUTH.accessToken = null;
  AUTH.tokenExpiry = null;
  AUTH.user = null;

  // Clear storage
  localStorage.removeItem("auth");

  // Redirect to Cognito logout if configured
  const config = window.APP_CONFIG || {};
  if (config.cognitoLogoutUrl) {
    window.location.href = config.cognitoLogoutUrl;
  } else {
    // Just go to home page
    window.location.href = "/";
  }
}

// Get current user ID
function getUserId() {
  return AUTH.user?.id || null;
}

// Check if user is authenticated
function isAuthenticated() {
  // Check if token is expired
  if (AUTH.tokenExpiry && new Date(AUTH.tokenExpiry) <= new Date()) {
    // Token expired, clear auth state
    signOut();
    return false;
  }

  return AUTH.isAuthenticated;
}

// Get access token for API calls
function getAccessToken() {
  if (!isAuthenticated()) {
    return null;
  }

  return AUTH.accessToken;
}

// Export public API
window.Auth = {
  init: initAuth,
  handleCallback: handleAuthCallback,
  signIn: signIn,
  signOut: signOut,
  isAuthenticated: isAuthenticated,
  getUserId: getUserId,
  getAccessToken: getAccessToken,
};
