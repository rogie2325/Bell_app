# Render Deployment Guide

## Deploy to Render (Alternative to Railway)

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"  
3. Connect your GitHub repo: `Bell_app`
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** `Node`

5. Add Environment Variables:
   ```
   LIVEKIT_API_KEY=APIcMRDDkDnN5Nr
   LIVEKIT_SECRET=VTrMcXRGUhjzJyfsAJw315O0HPtpVXIgej3CtCRynbK
   ```

6. Deploy and get your URL like:
   `https://bell-app.onrender.com`

## Update Vercel
Add to Vercel environment variables:
```
VITE_BACKEND_URL=https://your-render-url.onrender.com
```