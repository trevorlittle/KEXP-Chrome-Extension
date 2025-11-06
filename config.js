// Spotify API Configuration
// Based on Spotify's official Authorization Code with PKCE Flow
// https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow

// ==================================================================
// DEVELOPER SETUP REQUIRED (One-time configuration)
// ==================================================================
//
// Before using this extension, you need to:
//
// 1. Create a Spotify Developer App:
//    - Go to https://developer.spotify.com/dashboard
//    - Log in and create a new app
//    - Copy the Client ID
//
// 2. Configure Redirect URI:
//    - Load this extension in Chrome (chrome://extensions/)
//    - Copy your extension ID
//    - In Spotify app settings, add redirect URI:
//      https://<YOUR-EXTENSION-ID>.chromiumapp.org/
//    - Example: https://abcdefghijklmnopqrstuvwxyz.chromiumapp.org/
//
// 3. Update CLIENT_ID below:
//    - Replace 'YOUR_SPOTIFY_CLIENT_ID_HERE' with your actual Client ID
//
// NOTE: The Client ID is public and safe to include in code.
// This implementation uses OAuth 2.0 PKCE which doesn't require a secret.
//
// ==================================================================

const SPOTIFY_CONFIG = {
  // REPLACE THIS with your Spotify App Client ID
  CLIENT_ID: 'YOUR_SPOTIFY_CLIENT_ID_HERE',

  // Spotify OAuth endpoints
  AUTH_ENDPOINT: 'https://accounts.spotify.com/authorize',
  TOKEN_ENDPOINT: 'https://accounts.spotify.com/api/token',

  // Required scopes for this extension
  SCOPES: [
    'user-library-read',      // Check if tracks are saved
    'user-library-modify',    // Save tracks to library
    'playlist-modify-public', // (Future) Add to public playlists
    'playlist-modify-private' // (Future) Add to private playlists
  ].join(' ')
};

// Get the redirect URI dynamically from Chrome
// This works for both development and production
function getRedirectUri() {
  return chrome.identity.getRedirectURL();
}
