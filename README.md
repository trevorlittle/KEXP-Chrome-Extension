# KEXP Now Playing Chrome Extension

A Chrome extension that displays what's currently playing on KEXP.org radio stream and allows you to save tracks directly to your Spotify library with one click!

## Features

- 🎵 **See What's Playing**: View current track info from KEXP including:
  - Track name and artist (with local artist indicator)
  - Album name and artwork
  - Record label and play time
  - DJ comments (when available)

- 🎧 **Save to Spotify**: Instantly save KEXP tracks to your Spotify library
  - One-click save functionality
  - Automatic track search on Spotify
  - Duplicate detection (won't save tracks twice)
  - Works with both free and premium Spotify accounts

- 🔍 **Find on Bandcamp**: Search for tracks directly on Bandcamp to support artists

- 🎨 **Clean Interface**: Dark-themed UI matching KEXP's branding

## Installation & Setup

### For End Users (Simple Setup)

If you're installing this extension from the Chrome Web Store:

1. **Install the extension** from the Chrome Web Store
2. **Click the KEXP icon** in your Chrome toolbar
3. **Click "Login to Spotify"** and authorize the extension
4. **That's it!** Start saving your favorite KEXP tracks to Spotify

No configuration needed! Just click and go.

### For Developers (One-Time Setup)

If you're developing or building this extension yourself, follow these steps:

#### Step 1: Clone and Load Extension

```bash
git clone https://github.com/trevorlittle/KEXP-Chrome-Extension.git
cd KEXP-Chrome-Extension
```

Load the extension in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the extension folder

#### Step 2: Create Spotify Developer App

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click "Create app"
4. Fill in:
   - **App name**: KEXP Now Playing Extension
   - **App description**: Chrome extension to save KEXP tracks to Spotify
   - **Website**: Your GitHub repo URL
   - **Redirect URIs**: (see Step 3)
   - **APIs**: Select "Web API"
5. Save the app

#### Step 3: Configure Redirect URI

1. In Chrome, go to `chrome://extensions/`
2. Find "KEXP Now Playing" and copy the **Extension ID**
   - It looks like: `abcdefghijklmnopqrstuvwxyz`
3. Go back to your Spotify app settings
4. Add this redirect URI (replace with your extension ID):
   ```
   https://YOUR-EXTENSION-ID.chromiumapp.org/
   ```
   - Example: `https://abcdefghijklmnopqrstuvwxyz.chromiumapp.org/`
   - **Important**: Include `https://` and the trailing `/`
5. Click "Save"

#### Step 4: Add Client ID to Extension

1. In your Spotify app dashboard, copy the **Client ID**
2. Open `config.js` in the extension folder
3. Replace this line:
   ```javascript
   CLIENT_ID: 'YOUR_SPOTIFY_CLIENT_ID_HERE',
   ```
   With your actual Client ID:
   ```javascript
   CLIENT_ID: 'abc123your-actual-client-id-here456',
   ```
4. Save the file

#### Step 5: Reload and Test

1. Go to `chrome://extensions/`
2. Click the reload icon on the KEXP extension
3. Click the extension icon in your toolbar
4. Click "Login to Spotify"
5. Authorize the extension
6. Test saving a track!

## Usage

### Basic Usage

Click the KEXP extension icon to see what's currently playing on KEXP.org. The popup shows:
- Current track and artist information
- Album artwork and details
- DJ comments (when available)
- Links to find tracks on Bandcamp

### Spotify Integration

1. **Login**: Click "Login to Spotify" and authorize the extension
2. **Save Tracks**: When you hear a track you like, click "Save to Spotify"
3. **Feedback**: The extension will let you know if the track was saved or is already in your library

The extension will:
- Automatically search for the track on Spotify
- Check if it's already in your library
- Save it with one click
- Show you clear feedback on success or errors

### Tips

- The "Save to Spotify" button is disabled during air breaks (non-music content)
- If a track isn't found on Spotify, try the Bandcamp link to support the artist directly
- Your Spotify login persists across browser sessions
- Tokens automatically refresh when needed

## Privacy & Security

- **No data collection**: This extension doesn't collect or transmit any personal data
- **Secure authentication**: Uses Spotify's official OAuth 2.0 PKCE flow
- **Local storage only**: Authentication tokens are stored locally in Chrome
- **No tracking**: We don't track what you listen to or save
- **Open source**: All code is available for review
- **Revocable access**: Disconnect anytime from your Spotify account settings

## Technical Details

This extension uses:
- **KEXP API**: https://api.kexp.org/v1/ (for track information)
- **Spotify Web API**: https://api.spotify.com/v1/ (for saving tracks)
- **OAuth 2.0 PKCE**: Industry-standard secure authorization (no client secret needed)

Built with vanilla JavaScript for Chrome Extensions Manifest V3.

## Files

- `manifest.json` - Extension configuration and permissions
- `config.js` - Spotify app configuration (Client ID)
- `spotify-pkce.js` - PKCE code verifier/challenge generation
- `spotify-auth.js` - OAuth 2.0 authorization flow
- `spotify-api.js` - Spotify Web API integration
- `popup.html` - Popup interface structure
- `popup.css` - Styling
- `popup.js` - Main JavaScript logic
- `icons/` - Extension icons

## Troubleshooting

### "Login failed: Authorization page could not be loaded"

- Make sure you've configured your Client ID in `config.js`
- Verify your Spotify app has the correct redirect URI
- Check that the redirect URI matches your extension ID exactly

### "Track not found on Spotify"

- Not all KEXP tracks are available on Spotify
- Try the Bandcamp link instead
- Some tracks may have different names/spellings on Spotify

### Extension ID changed

- If you reload an unpacked extension, the ID can change
- Update the redirect URI in your Spotify app settings
- Update the Client ID reference if needed

### Still having issues?

1. Check the browser console for errors (F12 → Console)
2. Verify all setup steps were completed
3. Try logging out and back in to Spotify
4. Reload the extension from `chrome://extensions/`

## Support KEXP

[KEXP](https://www.kexp.org/) is an amazing community-powered radio station. If you love discovering new music through KEXP, consider [becoming a member](https://www.kexp.org/donate/) to support them!

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Enjoy discovering and saving amazing music from KEXP!** 🎵

