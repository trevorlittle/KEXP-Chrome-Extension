// KEXP API endpoint
const API_URL = 'https://api.kexp.org/v1/play/?limit=1&ordering=-airdate';

// DOM elements - KEXP
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const trackInfoEl = document.getElementById('track-info');
const trackNameEl = document.getElementById('track-name');
const artistNameEl = document.getElementById('artist-name');
const albumNameEl = document.getElementById('album-name');
const labelNameEl = document.getElementById('label-name');
const airdateEl = document.getElementById('airdate');
const albumArtEl = document.getElementById('album-art');
const commentsEl = document.getElementById('comments');
const bandcampLink = document.getElementById('bandcamp-link');

// DOM elements - Spotify
const spotifyLoginBtn = document.getElementById('spotify-login-btn');
const spotifyLogoutBtn = document.getElementById('spotify-logout-btn');
const spotifyStatus = document.getElementById('spotify-status');
const spotifySaveBtn = document.getElementById('spotify-save-btn');
const spotifyFeedback = document.getElementById('spotify-feedback');

// Store current track for Spotify
let currentTrack = null;

// Fetch currently playing track
async function fetchNowPlaying() {
  try {
    showLoading();

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      displayTrack(data.results[0]);
    } else {
      showError();
    }
  } catch (error) {
    console.error('Error fetching KEXP data:', error);
    showError();
  }
}

// Display track information
function displayTrack(track) {
  // Check if this is an air break
  if (track.playtype?.name === 'Air break') {
    trackNameEl.textContent = 'KEXP Air Break';
    artistNameEl.textContent = 'Station Break';
    albumNameEl.textContent = '';
    labelNameEl.style.display = 'none';
    albumArtEl.style.display = 'none';
    commentsEl.style.display = 'none';
    bandcampLink.parentElement.style.display = 'none';

    // Show airdate for air break
    if (track.airdate) {
      const date = new Date(track.airdate);
      const timeString = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      airdateEl.textContent = `Air break at ${timeString}`;
    }

    // Show track info, hide loading/error
    loadingEl.style.display = 'none';
    errorEl.style.display = 'none';
    trackInfoEl.style.display = 'block';
    return;
  }

  // Track name
  trackNameEl.textContent = track.track?.name || 'Unknown Track';

  // Artist name
  const artistName = track.artist?.name || 'Unknown Artist';
  const isLocal = track.artist?.islocal;
  artistNameEl.textContent = isLocal ? `${artistName} (Local)` : artistName;

  // Album name
  albumNameEl.textContent = track.release?.name || 'Unknown Album';

  // Label name
  if (track.label?.name) {
    labelNameEl.textContent = `Label: ${track.label.name}`;
    labelNameEl.style.display = 'block';
  } else {
    labelNameEl.style.display = 'none';
  }

  // Airdate
  if (track.airdate) {
    const date = new Date(track.airdate);
    const timeString = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    airdateEl.textContent = `Aired at ${timeString}`;
  }

  // Album art
  albumArtEl.innerHTML = '';
  const imageUrl = track.release?.largeimageuri || track.release?.smallimageuri;
  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Album art';
    img.onerror = function() {
      // If image fails to load, hide the container
      albumArtEl.style.display = 'none';
    };
    albumArtEl.appendChild(img);
    albumArtEl.style.display = 'block';
  } else {
    albumArtEl.style.display = 'none';
  }

  // Comments
  if (track.comments && track.comments.length > 0) {
    // Join all comment texts with line breaks if there are multiple
    const commentTexts = track.comments.map(c => c.text).join('\n\n');
    commentsEl.textContent = commentTexts;
    commentsEl.style.display = 'block';
  } else {
    commentsEl.style.display = 'none';
  }

  // Bandcamp search link
  const bcArtist = track.artist?.name || '';
  const bcTrack = track.track?.name || '';
  const bcAlbum = track.release?.name || '';

  // Create search query - prefer artist + album for better results
  let searchQuery = '';
  if (bcArtist && bcAlbum) {
    searchQuery = `${bcArtist} ${bcAlbum}`;
  } else if (bcArtist && bcTrack) {
    searchQuery = `${bcArtist} ${bcTrack}`;
  } else if (bcArtist) {
    searchQuery = bcArtist;
  }

  if (searchQuery) {
    const encodedQuery = encodeURIComponent(searchQuery);
    bandcampLink.href = `https://bandcamp.com/search?q=${encodedQuery}`;
    bandcampLink.parentElement.style.display = 'block';
  } else {
    bandcampLink.parentElement.style.display = 'none';
  }

  // Show track info, hide loading/error
  loadingEl.style.display = 'none';
  errorEl.style.display = 'none';
  trackInfoEl.style.display = 'block';
}

// Show loading state
function showLoading() {
  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  trackInfoEl.style.display = 'none';
}

// Show error state
function showError() {
  loadingEl.style.display = 'none';
  errorEl.style.display = 'block';
  trackInfoEl.style.display = 'none';
}

// ============================================
// Spotify Integration
// ============================================

// Check Spotify authentication status
async function checkSpotifyAuth() {
  const authenticated = await isAuthenticated();

  if (authenticated) {
    spotifyLoginBtn.style.display = 'none';
    spotifyStatus.style.display = 'flex';
    if (currentTrack) {
      spotifySaveBtn.disabled = false;
    }
  } else {
    spotifyLoginBtn.style.display = 'block';
    spotifyStatus.style.display = 'none';
    spotifySaveBtn.disabled = true;
  }
}

// Handle Spotify login button click
spotifyLoginBtn.addEventListener('click', async () => {
  spotifyLoginBtn.textContent = 'Logging in...';
  spotifyLoginBtn.disabled = true;

  const result = await authenticateSpotify();

  if (result.success) {
    await checkSpotifyAuth();
    showSpotifyFeedback('Successfully logged in!', 'success');
  } else {
    spotifyLoginBtn.textContent = 'Login to Spotify';
    spotifyLoginBtn.disabled = false;
    showSpotifyFeedback(`Login failed: ${result.error}`, 'error');
  }
});

// Handle Spotify logout button click
spotifyLogoutBtn.addEventListener('click', async () => {
  const result = await logoutSpotify();

  if (result.success) {
    await checkSpotifyAuth();
    showSpotifyFeedback('Logged out successfully', 'info');
    // Clear feedback after a moment
    setTimeout(() => {
      spotifyFeedback.textContent = '';
      spotifyFeedback.className = 'spotify-feedback';
    }, 2000);
  }
});

// Handle Save to Spotify button click
spotifySaveBtn.addEventListener('click', async () => {
  if (!currentTrack) {
    showSpotifyFeedback('No track information available', 'error');
    return;
  }

  // Show loading state
  spotifySaveBtn.classList.add('loading');
  spotifySaveBtn.disabled = true;
  spotifySaveBtn.textContent = 'Saving...';
  showSpotifyFeedback('Searching on Spotify...', 'info');

  try {
    const result = await addKEXPTrackToSpotify(
      currentTrack.trackName,
      currentTrack.artistName
    );

    // Reset button
    spotifySaveBtn.classList.remove('loading');
    spotifySaveBtn.textContent = 'Save to Spotify';

    if (result.success) {
      spotifySaveBtn.disabled = false;

      if (result.alreadySaved) {
        spotifySaveBtn.classList.add('success');
        showSpotifyFeedback('✓ Already in your library!', 'success');
        setTimeout(() => {
          spotifySaveBtn.classList.remove('success');
        }, 2000);
      } else if (result.newlySaved) {
        spotifySaveBtn.classList.add('success');
        showSpotifyFeedback('✓ Saved to your library!', 'success');
        setTimeout(() => {
          spotifySaveBtn.classList.remove('success');
        }, 2000);
      }
    } else {
      spotifySaveBtn.classList.add('error');
      spotifySaveBtn.disabled = false;

      if (result.needsAuth) {
        showSpotifyFeedback('Please login to Spotify first', 'error');
        await checkSpotifyAuth();
      } else if (result.notFound) {
        showSpotifyFeedback('Track not found on Spotify', 'error');
      } else {
        showSpotifyFeedback(`Error: ${result.error}`, 'error');
      }

      setTimeout(() => {
        spotifySaveBtn.classList.remove('error');
      }, 3000);
    }
  } catch (error) {
    spotifySaveBtn.classList.remove('loading');
    spotifySaveBtn.classList.add('error');
    spotifySaveBtn.disabled = false;
    spotifySaveBtn.textContent = 'Save to Spotify';
    showSpotifyFeedback(`Error: ${error.message}`, 'error');

    setTimeout(() => {
      spotifySaveBtn.classList.remove('error');
    }, 3000);
  }
});

// Show Spotify feedback message
function showSpotifyFeedback(message, type) {
  spotifyFeedback.textContent = message;
  spotifyFeedback.className = `spotify-feedback ${type}`;

  // Auto-clear info messages
  if (type === 'info') {
    setTimeout(() => {
      spotifyFeedback.textContent = '';
      spotifyFeedback.className = 'spotify-feedback';
    }, 3000);
  }
}

// Update current track when KEXP track changes
function updateCurrentTrack(track) {
  // Check if this is an air break
  if (track.playtype?.name === 'Air break') {
    currentTrack = null;
    spotifySaveBtn.disabled = true;
    spotifyFeedback.textContent = '';
  } else {
    // Store track info for Spotify
    currentTrack = {
      trackName: track.track?.name || '',
      artistName: track.artist?.name || ''
    };

    // Enable save button if authenticated
    checkSpotifyAuth();
    spotifyFeedback.textContent = '';
  }
}

// Wrap the existing displayTrack function
const originalDisplayTrack = displayTrack;
displayTrack = function(track) {
  originalDisplayTrack(track);
  updateCurrentTrack(track);
};

// Initialize Spotify auth status when popup opens
checkSpotifyAuth();

// Load track info when popup opens
fetchNowPlaying();
