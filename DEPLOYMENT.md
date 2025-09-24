# 🚀 Production Deployment Guide

## Overview
Your Bell app has two parts:
1. **Frontend** (React + Vite) - The user interface
2. **Backend** (Node.js + Express) - Token generation server

Both need to be deployed separately for production use.

## 📱 Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Build and deploy:**
   ```bash
   npm run build
   vercel
   ```

3. **Set environment variables in Vercel dashboard:**
   - `VITE_LIVEKIT_URL=wss://your-project.livekit.cloud`
   - `VITE_BACKEND_URL=https://your-backend.herokuapp.com`

### Option 2: Netlify

1. **Build your app:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to Netlify
3. **Add environment variables** in Netlify settings

### Option 3: GitHub Pages

1. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add to package.json scripts:**
   ```json
   "deploy": "gh-pages -d dist"
   ```

3. **Build and deploy:**
   ```bash
   npm run build
   npm run deploy
   ```

## 🖥️ Backend Deployment

### Option 1: Railway (Recommended - Free tier available)

1. **Go to** [railway.app](https://railway.app)
2. **Connect your GitHub repo**
3. **Deploy from `server.js`**
4. **Add environment variables:**
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_SECRET`
   - `PORT` (Railway sets this automatically)

### Option 2: Render

1. **Go to** [render.com](https://render.com)
2. **Create new Web Service**
3. **Connect your repo**
4. **Set build command:** `npm install`
5. **Set start command:** `node server.js`
6. **Add environment variables**

### Option 3: Heroku

1. **Install Heroku CLI**
2. **Create Heroku app:**
   ```bash
   heroku create your-bell-backend
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set LIVEKIT_API_KEY=your-key
   heroku config:set LIVEKIT_SECRET=your-secret
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

## 🔧 Environment Variables Setup

### Development (.env)
```bash
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-dev-key
LIVEKIT_SECRET=your-dev-secret
VITE_BACKEND_URL=http://localhost:3001
```

### Production Frontend
```bash
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
VITE_BACKEND_URL=https://your-backend.railway.app
```

### Production Backend
```bash
LIVEKIT_API_KEY=your-production-key
LIVEKIT_SECRET=your-production-secret
PORT=3001
```

## 🌍 Custom Domain Setup

### Frontend (Vercel)
1. **Add your domain** in Vercel dashboard
2. **Update DNS** to point to Vercel

### Backend (Railway)
1. **Add custom domain** in Railway dashboard
2. **Update frontend** `VITE_BACKEND_URL`

## 🔒 Security Considerations

### CORS Configuration
Update `server.js` for production:

```javascript
// Production CORS setup
app.use(cors({
  origin: [
    'https://your-app.vercel.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
}));
```

### HTTPS Requirements
- **Frontend:** Most hosting services provide HTTPS automatically
- **Backend:** Use services that provide SSL certificates
- **LiveKit:** Always uses WSS (secure WebSocket)

## 📊 Monitoring & Analytics

### LiveKit Dashboard
- Monitor call quality and usage
- View connection statistics
- Track participant counts

### Error Tracking
Consider adding:
- **Sentry** for error tracking
- **LogRocket** for user session replay
- **Google Analytics** for usage metrics

## 🚀 Deployment Checklist

### Before Deploying:
- [ ] Test locally with `npm run dev:full`
- [ ] Verify LiveKit credentials work
- [ ] Test with multiple participants
- [ ] Check mobile responsiveness
- [ ] Test camera/microphone permissions

### Frontend Deployment:
- [ ] Set `VITE_LIVEKIT_URL`
- [ ] Set `VITE_BACKEND_URL` to production backend
- [ ] Build with `npm run build`
- [ ] Deploy `dist` folder

### Backend Deployment:
- [ ] Set `LIVEKIT_API_KEY` and `LIVEKIT_SECRET`
- [ ] Configure CORS for your frontend domain
- [ ] Test token generation endpoint
- [ ] Verify health check endpoint works

### Post-Deployment:
- [ ] Test complete user flow
- [ ] Verify video/audio quality
- [ ] Test on multiple devices
- [ ] Monitor for errors

## 🔧 Troubleshooting Production Issues

### Common Problems:

1. **CORS Errors**
   - Update CORS configuration in server.js
   - Ensure frontend URL is whitelisted

2. **Token Generation Fails**
   - Verify API keys are set correctly
   - Check backend server is accessible

3. **Video/Audio Not Working**
   - Ensure HTTPS is enabled (required for media access)
   - Check browser permissions

4. **Connection Issues**
   - Verify LiveKit WebSocket URL is correct
   - Check firewall settings

### Debug Commands:

```bash
# Check backend health
curl https://your-backend.railway.app/health

# Test token generation
curl -X POST https://your-backend.railway.app/api/token \
  -H "Content-Type: application/json" \
  -d '{"roomName":"test","participantName":"user1"}'
```

## 📈 Scaling Considerations

### LiveKit Plans
- **Community:** Free tier with limitations
- **Cloud:** Pay-as-you-go with better features
- **Enterprise:** Custom pricing with SLA

### Performance Optimization
- Enable CDN for frontend assets
- Use multiple regions for global users
- Consider Redis for session management

Your Bell app is now ready for production! 🎉