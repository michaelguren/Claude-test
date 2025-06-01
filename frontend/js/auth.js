/**
 * Clean authentication module for email/password auth
 * Simplified for the 3-endpoint auth flow: signup → verify → login
 */

// Auth state
let authState = {
  token: null,
  user: null,
  tokenExpiry: null,
  isAuthenticated: false,
};

// Initialize auth from localStorage
function init() {
  console.log("Initializing auth module");

  try {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const data = JSON.parse(stored);

      // Check if token is still valid
      if (data.tokenExpiry && new Date(data.tokenExpiry) > new Date()) {
        authState = { ...data, isAuthenticated: true };
        console.log("Auth restored from storage");
        return true;
      } else {
        // Token expired
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

// Signup: Create account and send verification email
async function signup(email, password) {
  const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Signup failed");
  }

  return response.json();
}

// Verify email with code
async function verify(email, code) {
  const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Verification failed");
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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Login failed");
  }

  const result = await response.json();

  // Store auth state
  authState = {
    token: result.token,
    user: result.user,
    tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    isAuthenticated: true,
  };

  // Save to localStorage
  localStorage.setItem("auth", JSON.stringify(authState));
  console.log("Login successful");

  return result;
}

// Sign out
function signOut() {
  authState = {
    token: null,
    user: null,
    tokenExpiry: null,
    isAuthenticated: false,
  };
  localStorage.removeItem("auth");
  console.log("User signed out");
}

// Get current state
function isAuthenticated() {
  return (
    authState.isAuthenticated &&
    authState.token &&
    authState.tokenExpiry &&
    new Date(authState.tokenExpiry) > new Date()
  );
}

function getAccessToken() {
  return isAuthenticated() ? authState.token : null;
}

function getCurrentUser() {
  return isAuthenticated() ? authState.user : null;
}

function getUserId() {
  const user = getCurrentUser();
  return user ? user.userId : null;
}

// Export API
window.Auth = {
  init,
  signup,
  verify,
  login,
  signOut,
  isAuthenticated,
  getAccessToken,
  getCurrentUser,
  getUserId,
};
