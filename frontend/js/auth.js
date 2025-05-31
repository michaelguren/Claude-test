/**
 * Real authentication module for email/password auth
 * No external dependencies - pure vanilla JavaScript
 */

// auth.js

// Auth state and tokens
const AUTH_STATE = {
  isAuthenticated: false,
  user: null,
  token: null,
  tokenExpiry: null,
};

// Initialize auth state from storage
function initAuth() {
  console.log("Initializing real auth module");

  try {
    const storedAuth = localStorage.getItem("auth");
    if (storedAuth) {
      const authData = JSON.parse(storedAuth);

      // Check if token is expired
      if (authData.tokenExpiry && new Date(authData.tokenExpiry) > new Date()) {
        Object.assign(AUTH_STATE, authData);
        console.log("Auth restored from storage");
        return true;
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

  return false;
}

// Send verification code to email
async function sendVerificationCode(email) {
  const response = await fetch(
    `${window.APP_CONFIG.apiBaseUrl}/auth/send-code`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to send verification code");
  }

  return response.json();
}

// Register new user
async function register(email, password) {
  const response = await fetch(
    `${window.APP_CONFIG.apiBaseUrl}/auth/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Registration failed");
  }

  return response.json();
}

// Complete registration with verification code
async function completeRegistration(email, code) {
  const response = await fetch(
    `${window.APP_CONFIG.apiBaseUrl}/auth/complete-registration`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Email verification failed");
  }

  return response.json();
}

// Login with email/password
async function login(email, password) {
  const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Login failed");
  }

  const result = await response.json();

  // Store auth state
  AUTH_STATE.isAuthenticated = true;
  AUTH_STATE.user = result.user;
  AUTH_STATE.token = result.token;
  AUTH_STATE.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Save to localStorage
  localStorage.setItem("auth", JSON.stringify(AUTH_STATE));

  console.log("Login successful, auth state saved");
  return result;
}

// Sign out
function signOut() {
  AUTH_STATE.isAuthenticated = false;
  AUTH_STATE.user = null;
  AUTH_STATE.token = null;
  AUTH_STATE.tokenExpiry = null;
  localStorage.removeItem("auth");
  console.log("User signed out");
}

// Check if authenticated
function isAuthenticated() {
  return (
    AUTH_STATE.isAuthenticated &&
    AUTH_STATE.tokenExpiry &&
    new Date(AUTH_STATE.tokenExpiry) > new Date()
  );
}

// Get access token for API calls
function getAccessToken() {
  return isAuthenticated() ? AUTH_STATE.token : null;
}

// Get current user
function getCurrentUser() {
  return isAuthenticated() ? AUTH_STATE.user : null;
}

// Get user ID (for compatibility with existing code)
function getUserId() {
  const user = getCurrentUser();
  return user ? user.id : null;
}

// Trigger sign in flow (will be used by UI buttons)
function signIn() {
  // This will be handled by the UI forms
  // For now, just log that sign in was requested
  console.log("Sign in requested - UI should show login form");
}

// Not used in email/password flow, but keeping for compatibility
function handleCallback() {
  return false;
}

// Export public API
window.Auth = {
  init: initAuth,
  sendVerificationCode,
  register,
  completeRegistration,
  login,
  signIn,
  signOut,
  isAuthenticated,
  getAccessToken,
  getCurrentUser,
  getUserId,
  handleCallback,
};
