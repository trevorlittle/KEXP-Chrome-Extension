// Spotify Web API Integration
// https://developer.spotify.com/documentation/web-api

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Make an authenticated request to Spotify API
async function makeSpotifyRequest(endpoint, options = {}) {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error('Not authenticated with Spotify');
  }

  const url = `${SPOTIFY_API_BASE}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Handle token expiration
  if (response.status === 401) {
    // Token might be invalid, try to refresh and retry once
    try {
      const newToken = await refreshAccessToken();
      headers['Authorization'] = `Bearer ${newToken}`;

      const retryResponse = await fetch(url, {
        ...options,
        headers
      });

      if (!retryResponse.ok) {
        throw new Error(`Spotify API error: ${retryResponse.status}`);
      }

      return retryResponse;
    } catch (error) {
      throw new Error('Authentication expired. Please login again.');
    }
  }

  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || '60';
    throw new Error(`Rate limited. Please try again in ${retryAfter} seconds.`);
  }

  // Handle other errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Spotify API error: ${response.status}`);
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return null;
  }

  return response;
}

// Search for a track on Spotify
async function searchTrack(trackName, artistName) {
  try {
    // Build search query
    let query = '';
    if (trackName && artistName) {
      query = `track:${trackName} artist:${artistName}`;
    } else if (trackName) {
      query = `track:${trackName}`;
    } else if (artistName) {
      query = `artist:${artistName}`;
    } else {
      throw new Error('Track name or artist name required');
    }

    const encodedQuery = encodeURIComponent(query);
    const endpoint = `/search?q=${encodedQuery}&type=track&limit=5`;

    const response = await makeSpotifyRequest(endpoint);
    const data = await response.json();

    if (!data.tracks || !data.tracks.items || data.tracks.items.length === 0) {
      return {
        found: false,
        track: null
      };
    }

    // Return the best match (first result)
    return {
      found: true,
      track: data.tracks.items[0]
    };

  } catch (error) {
    console.error('Search track error:', error);
    throw error;
  }
}

// Check if a track is saved in user's library
async function checkIfTrackSaved(trackId) {
  try {
    const endpoint = `/me/tracks/contains?ids=${trackId}`;
    const response = await makeSpotifyRequest(endpoint);
    const data = await response.json();

    // Returns array of booleans, we only check one track
    return data[0] === true;

  } catch (error) {
    console.error('Check saved track error:', error);
    throw error;
  }
}

// Save a track to user's Spotify library
async function saveTrackToLibrary(trackId) {
  try {
    const endpoint = '/me/tracks';
    await makeSpotifyRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify({
        ids: [trackId]
      })
    });

    return { success: true };

  } catch (error) {
    console.error('Save track error:', error);
    throw error;
  }
}

// Remove a track from user's library
async function removeTrackFromLibrary(trackId) {
  try {
    const endpoint = '/me/tracks';
    await makeSpotifyRequest(endpoint, {
      method: 'DELETE',
      body: JSON.stringify({
        ids: [trackId]
      })
    });

    return { success: true };

  } catch (error) {
    console.error('Remove track error:', error);
    throw error;
  }
}

// Main function to add current KEXP track to Spotify
async function addKEXPTrackToSpotify(trackName, artistName) {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return {
        success: false,
        error: 'Not authenticated',
        needsAuth: true
      };
    }

    // Search for the track
    const searchResult = await searchTrack(trackName, artistName);

    if (!searchResult.found) {
      return {
        success: false,
        error: 'Track not found on Spotify',
        notFound: true
      };
    }

    const trackId = searchResult.track.id;

    // Check if already saved
    const isSaved = await checkIfTrackSaved(trackId);

    if (isSaved) {
      return {
        success: true,
        alreadySaved: true,
        track: searchResult.track
      };
    }

    // Save the track
    await saveTrackToLibrary(trackId);

    return {
      success: true,
      newlySaved: true,
      track: searchResult.track
    };

  } catch (error) {
    console.error('Add KEXP track error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get user's playlists (for future feature)
async function getUserPlaylists(limit = 20) {
  try {
    const endpoint = `/me/playlists?limit=${limit}`;
    const response = await makeSpotifyRequest(endpoint);
    const data = await response.json();

    return data.items || [];

  } catch (error) {
    console.error('Get playlists error:', error);
    throw error;
  }
}

// Add track to a specific playlist (for future feature)
async function addTrackToPlaylist(playlistId, trackUri) {
  try {
    const endpoint = `/playlists/${playlistId}/tracks`;
    await makeSpotifyRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        uris: [trackUri]
      })
    });

    return { success: true };

  } catch (error) {
    console.error('Add to playlist error:', error);
    throw error;
  }
}
