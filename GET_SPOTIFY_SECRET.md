# 🎵 How to Get Your Spotify Client Secret

## Quick Steps:

1. **Go to Spotify Developer Dashboard**
   - Visit: https://developer.spotify.com/dashboard
   - Log in with your Spotify account

2. **Find Your App**
   - You should see your app in the dashboard
   - Click on it to open settings

3. **Get Your Client Secret**
   - You'll see:
     - ✅ Client ID: `3ba2734be7c047f38a13191959719611` (already added)
     - 🔒 Client Secret: Click "View client secret" button
   
4. **Copy the Secret**
   - Click the "Show client secret" button
   - Copy the secret key (it looks like a long random string)

5. **Add to .env File**
   - Open `/Users/elijah/Apps/Bell_app/.env`
   - Replace this line:
     ```
     VITE_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
     ```
   - With:
     ```
     VITE_SPOTIFY_CLIENT_SECRET=<paste_your_actual_secret_here>
     ```

6. **Restart Your Dev Server**
   - Stop the Vite server (Ctrl+C in terminal)
   - Run `npm run dev` again
   - Spotify search will now work! 🎉

## Current Status:
- ✅ YouTube Search - **WORKING** (set as default)
- ⏳ Spotify Search - **Needs Client Secret**

## Testing:
Once you add the secret:
1. Open Pass The Aux
2. Switch to Spotify tab
3. Type a song name (e.g., "Blinding Lights")
4. See live suggestions appear!
