// Spotify OAuth Authentication Utilities

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state'
].join(' ');

// Generate random string for state
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
};

// Generate code challenge for PKCE
const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

// Redirect to Spotify authorization
export const redirectToSpotifyAuth = async () => {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);
  
  // Store code verifier in session storage
  window.sessionStorage.setItem('code_verifier', codeVerifier);
  
  // Debug: Log the redirect URI being used
  console.log('🔗 Using Redirect URI:', REDIRECT_URI);
  console.log('✅ Make sure this EXACT URL is added to your Spotify Dashboard');
  
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  const params = {
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  };
  
  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
};

// Exchange authorization code for access token
export const getAccessToken = async (code) => {
  const codeVerifier = window.sessionStorage.getItem('code_verifier');
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });
  
  return await response.json();
};

// Refresh access token
export const refreshAccessToken = async (refreshToken) => {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  
  return await response.json();
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('spotify_access_token');
  const expiresAt = localStorage.getItem('spotify_token_expires_at');
  
  if (!token || !expiresAt) return false;
  
  // Check if token is expired
  return Date.now() < parseInt(expiresAt);
};

// Get stored access token
export const getStoredAccessToken = () => {
  return localStorage.getItem('spotify_access_token');
};

// Store tokens
export const storeTokens = (accessToken, refreshToken, expiresIn) => {
  localStorage.setItem('spotify_access_token', accessToken);
  localStorage.setItem('spotify_refresh_token', refreshToken);
  localStorage.setItem('spotify_token_expires_at', Date.now() + (expiresIn * 1000));
};

// Clear tokens (logout)
export const logout = () => {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expires_at');
  window.sessionStorage.removeItem('code_verifier');
};
