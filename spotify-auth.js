// Spotify OAuth 2.0 Authorization Code with PKCE Flow
// Based on Spotify's official implementation
// https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow

// Main authentication function
// Opens Spotify login page and exchanges code for access token
async function authenticateSpotify() {
  try {
    console.log('=== Starting Spotify Authentication ===');

    // Step 1: Generate PKCE code verifier and challenge
    console.log('Step 1: Generating PKCE values...');
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    console.log('PKCE values generated:', {
      verifier_length: codeVerifier.length,
      challenge_length: codeChallenge.length
    });

    // Step 2: Store code verifier for later use in token exchange
    console.log('Step 2: Storing code verifier...');
    await chrome.storage.local.set({
      spotify_code_verifier: codeVerifier
    });
    console.log('Code verifier stored');

    // Step 3: Build authorization URL
    console.log('Step 3: Building authorization URL...');
    const redirectUri = chrome.identity.getRedirectURL();
    console.log('Redirect URI:', redirectUri);

    const authUrl = new URL(SPOTIFY_CONFIG.AUTH_ENDPOINT);

    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', SPOTIFY_CONFIG.CLIENT_ID);
    authUrl.searchParams.append('scope', SPOTIFY_CONFIG.SCOPES);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('code_challenge', codeChallenge);

    console.log('Authorization URL built:', authUrl.toString());

    // Step 4: Launch Chrome's OAuth flow
    console.log('Step 4: Launching OAuth flow...');
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true
    });

    console.log('Step 5: Received response URL:', responseUrl);

    // Step 5: Extract authorization code from redirect URL
    const urlParams = new URL(responseUrl).searchParams;
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('Spotify returned error:', error);
      throw new Error(`Spotify authorization error: ${error}`);
    }

    if (!code) {
      console.error('No authorization code in response!');
      console.error('Response URL params:', Array.from(urlParams.entries()));
      throw new Error('No authorization code received');
    }

    console.log('Step 6: Authorization code received (length:', code.length, ')');

    // Step 6: Exchange authorization code for access token
    console.log('Step 7: Exchanging code for token...');
    await exchangeCodeForToken(code, codeVerifier, redirectUri);

    console.log('=== Authentication completed successfully! ===');
    return { success: true };

  } catch (error) {
    console.error('=== Authentication failed! ===');
    console.error('Error:', error);
    console.error('Error stack:', error.stack);

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
  console.log('Token exchange - Building request...');
  console.log('Parameters:', {
    client_id: SPOTIFY_CONFIG.CLIENT_ID,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code_length: code.length,
    verifier_length: codeVerifier.length
  });

  const body = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.CLIENT_ID,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier
  });

  console.log('Sending token request to:', SPOTIFY_CONFIG.TOKEN_ENDPOINT);

  const response = await fetch(SPOTIFY_CONFIG.TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  console.log('Token response status:', response.status, response.statusText);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Token exchange error response:', error);
    throw new Error(error.error_description || error.error || 'Token exchange failed');
  }

  const data = await response.json();
  console.log('Token received! Keys:', Object.keys(data));
  console.log('Expires in:', data.expires_in, 'seconds');

  // Store tokens with expiration time
  console.log('Storing tokens in chrome.storage.local...');
  await chrome.storage.local.set({
    spotify_access_token: data.access_token,
    spotify_refresh_token: data.refresh_token,
    spotify_expires_at: Date.now() + (data.expires_in * 1000),
    spotify_authenticated: true
  });

  console.log('Tokens stored successfully!');

  // Verify storage
  const verification = await chrome.storage.local.get([
    'spotify_access_token',
    'spotify_refresh_token',
    'spotify_authenticated'
  ]);
  console.log('Storage verification:', {
    has_access_token: !!verification.spotify_access_token,
    has_refresh_token: !!verification.spotify_refresh_token,
    is_authenticated: verification.spotify_authenticated
  });

  // Clean up code verifier (no longer needed)
  await chrome.storage.local.remove('spotify_code_verifier');
  console.log('Code verifier cleaned up');

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
