/**
 * Temporary mock authentication module for development
 * This will be replaced with proper Cognito auth later
 * No external dependencies - pure vanilla JavaScript
 */

// Auth state and tokens
const AUTH = {
  isAuthenticated: true, // Always authenticated for development
  idToken: "mock-id-token",
  accessToken: "mock-access-token",
  tokenExpiry: new Date(Date.now() + 86400000), // 24 hours from now
  user: {
    id: "mock-user-dev",
    email: "mockuser@example.com",
  },
};

// Initialize auth state - always authenticated
function initAuth() {
  console.log("Initializing mock auth module - always authenticated");
  return true;
}

// Fake auth callback handler (not used in mock mode)
function handleAuthCallback() {
  return true;
}

// Mock sign in (doesn't actually do anything)
function signIn() {
  console.log("Mock sign-in performed");
  
  // Reload the page to update UI
  window.location.reload();
}

// Mock sign out (clears session but immediately re-authenticates)
function signOut() {
  console.log("Mock sign-out performed");
  
  // Just go to home page
  window.location.href = "/";
}

// Get current user ID
function getUserId() {
  return AUTH.user.id;
}

// Check if user is authenticated (always true)
function isAuthenticated() {
  return true;
}

// Get access token for API calls
function getAccessToken() {
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
