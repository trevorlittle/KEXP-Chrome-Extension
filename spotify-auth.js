// Spotify OAuth 2.0 Authorization Code with PKCE Flow
// Based on Spotify's official implementation
// https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow

// Main authentication function
// Opens Spotify login page and exchanges code for access token
async function authenticateSpotify() {
  try {
    // Step 1: Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Step 2: Store code verifier for later use in token exchange
    await chrome.storage.local.set({
      spotify_code_verifier: codeVerifier
    });

    // Step 3: Build authorization URL
    const redirectUri = chrome.identity.getRedirectURL();
    const authUrl = new URL(SPOTIFY_CONFIG.AUTH_ENDPOINT);

    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', SPOTIFY_CONFIG.CLIENT_ID);
    authUrl.searchParams.append('scope', SPOTIFY_CONFIG.SCOPES);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('code_challenge', codeChallenge);

    // Step 4: Launch Chrome's OAuth flow
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true
    });

    // Step 5: Extract authorization code from redirect URL
    const urlParams = new URL(responseUrl).searchParams;
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      throw new Error(`Spotify authorization error: ${error}`);
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    // Step 6: Exchange authorization code for access token
    await exchangeCodeForToken(code, codeVerifier, redirectUri);

    return { success: true };

  } catch (error) {
    console.error('Spotify authentication error:', error);

    // Clean up stored code verifier on error
    await chrome.storage.local.remove('spotify_code_verifier');

    return {
      success: false,
      error: error.message || 'Authentication failed'
    };
  }
}

// Exchange authorization code for access and refresh tokens
async function exchangeCodeForToken(code, codeVerifier, redirectUri) {
  const body = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.CLIENT_ID,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier
  });

  const response = await fetch(SPOTIFY_CONFIG.TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || 'Token exchange failed');
  }

  const data = await response.json();

  // Store tokens with expiration time
  await chrome.storage.local.set({
    spotify_access_token: data.access_token,
    spotify_refresh_token: data.refresh_token,
    spotify_expires_at: Date.now() + (data.expires_in * 1000),
    spotify_authenticated: true
  });

  // Clean up code verifier (no longer needed)
  await chrome.storage.local.remove('spotify_code_verifier');

  return data;
}

// Refresh the access token using the refresh token
async function refreshAccessToken() {
  try {
    const { spotify_refresh_token } = await chrome.storage.local.get('spotify_refresh_token');

    if (!spotify_refresh_token) {
      throw new Error('No refresh token available');
    }

    const body = new URLSearchParams({
      client_id: SPOTIFY_CONFIG.CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: spotify_refresh_token
    });

    const response = await fetch(SPOTIFY_CONFIG.TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();

    // Update access token and expiration
    await chrome.storage.local.set({
      spotify_access_token: data.access_token,
      spotify_expires_at: Date.now() + (data.expires_in * 1000)
    });

    // Update refresh token if a new one was provided
    if (data.refresh_token) {
      await chrome.storage.local.set({
        spotify_refresh_token: data.refresh_token
      });
    }

    return data.access_token;

  } catch (error) {
    console.error('Token refresh error:', error);

    // Clear authentication on refresh failure
    await clearSpotifyAuth();

    throw error;
  }
}

// Get a valid access token (refreshes if expired)
async function getValidAccessToken() {
  const storage = await chrome.storage.local.get([
    'spotify_access_token',
    'spotify_expires_at',
    'spotify_authenticated'
  ]);

  if (!storage.spotify_authenticated || !storage.spotify_access_token) {
    return null;
  }

  // Check if token is expired or will expire in the next minute
  const expiryBuffer = 60000; // 1 minute buffer
  if (Date.now() >= (storage.spotify_expires_at - expiryBuffer)) {
    // Token expired or about to expire, refresh it
    return await refreshAccessToken();
  }

  return storage.spotify_access_token;
}

// Check if user is authenticated with Spotify
async function isAuthenticated() {
  const { spotify_authenticated, spotify_access_token } = await chrome.storage.local.get([
    'spotify_authenticated',
    'spotify_access_token'
  ]);

  return !!(spotify_authenticated && spotify_access_token);
}

// Clear all Spotify authentication data (logout)
async function clearSpotifyAuth() {
  await chrome.storage.local.remove([
    'spotify_access_token',
    'spotify_refresh_token',
    'spotify_expires_at',
    'spotify_authenticated',
    'spotify_code_verifier'
  ]);
}

// Logout function
async function logoutSpotify() {
  await clearSpotifyAuth();
  return { success: true };
}
