// Spotify PKCE (Proof Key for Code Exchange) Helper Functions
// Based on Spotify's official implementation
// https://github.com/spotify/web-api-examples/tree/master/authorization/authorization_code_pkce

// Generate a random code verifier for PKCE
// Returns a 64-character random string using crypto.getRandomValues()
function generateCodeVerifier() {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = crypto.getRandomValues(new Uint8Array(64));
  return randomValues.reduce((acc, x) => acc + possible[x % possible.length], '');
}

// Generate a code challenge from the code verifier
// Uses SHA-256 hashing and base64-URL encoding
async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashed = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(hashed);
}

// Base64-URL encode a buffer
// Converts to base64 and makes it URL-safe by replacing characters
function base64URLEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64
    .replace(/=/g, '')    // Remove padding
    .replace(/\+/g, '-')  // Replace + with -
    .replace(/\//g, '_'); // Replace / with _
}
