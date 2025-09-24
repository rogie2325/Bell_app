# 🚀 LiveKit Integration Setup Guide

## What's Changed

Your Bell app has been upgraded to use LiveKit, which provides:

### ✨ Key Improvements
1. **Professional Video Quality** - Automatic bitrate adaptation and optimization
2. **Scalable Architecture** - Handles unlimited participants efficiently  
3. **Reliable Connections** - Built-in reconnection and error handling
4. **Advanced Features** - Screen sharing, recording, real-time transcription
5. **Cross-Platform Support** - Works seamlessly on all devices
6. **Security** - Enterprise-grade encryption and authentication

### 🔧 What Was Replaced
- ❌ Manual WebSocket connection handling
- ❌ Complex WebRTC peer connection management  
- ❌ Fallback server logic
- ❌ Manual stream management
- ✅ All replaced with LiveKit's robust infrastructure

## 🏗️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up LiveKit Server

You have two options:

#### Option A: Use LiveKit Cloud (Recommended for production)
1. Go to [livekit.io](https://livekit.io) and create an account
2. Create a new project
3. Get your API Key, Secret, and WebSocket URL

#### Option B: Self-Host LiveKit Server (For development)
```bash
# Using Docker
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server --dev
```

### 3. Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update `.env` with your LiveKit credentials:
```bash
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_SECRET=your-secret
VITE_BACKEND_URL=http://localhost:3001
```

### 4. Run the Application

Start both frontend and backend:
```bash
npm run dev:full
```

Or run separately:
```bash
# Terminal 1 - Backend server
npm run server

# Terminal 2 - Frontend dev server  
npm run dev
```

## 🎮 How to Use

1. **Open the app** at `http://localhost:5173`
2. **Enter your name** and a **room ID**
3. **Click "Join Room"** to connect
4. **Share the room ID** with others to join the same call

## 🚀 Advanced Features Now Available

### Screen Sharing
- Click the monitor icon to share your screen
- Much more reliable than the previous implementation

### Real-time Chat
- Send messages during video calls
- Messages are delivered instantly via LiveKit's data channels

### Multiple Participants
- No limit on number of participants (depends on your LiveKit plan)
- Automatic video layout management

### Mobile Support
- Optimized for mobile browsers
- Touch-friendly controls

### Quality Adaptation
- Automatic video quality adjustment based on network conditions
- Maintains smooth experience even on slower connections

## 🔧 Customization Options

### Video Quality Settings
In `LiveKitBellApp.jsx`, you can adjust:
```javascript
videoCaptureDefaults: {
  resolution: VideoPresets.h720.resolution, // Change to h1080, h540, etc.
}
```

### Room Configuration
```javascript
const newRoom = new Room({
  adaptiveStream: true,    // Enable quality adaptation
  dynacast: true,         // Optimize for multiple viewers
  videoCaptureDefaults: {
    resolution: VideoPresets.h720.resolution,
  },
});
```

## 📱 Production Deployment

### Frontend (Vite)
```bash
npm run build
# Deploy the 'dist' folder to your hosting service
```

### Backend (Express)
Deploy `server.js` to a Node.js hosting service like:
- Railway
- Render  
- Heroku
- Vercel (serverless functions)

### Environment Variables for Production
Make sure to set these in your hosting environment:
- `LIVEKIT_API_KEY`
- `LIVEKIT_SECRET`
- `VITE_LIVEKIT_URL`
- `VITE_BACKEND_URL`

## 🐛 Troubleshooting

### Connection Issues
1. Verify your LiveKit server is running
2. Check environment variables are set correctly
3. Ensure CORS is properly configured for your domain

### Video/Audio Not Working
1. Grant browser permissions for camera/microphone
2. Try HTTPS in production (required for media access)
3. Check firewall settings for WebRTC ports

### Token Generation Errors
1. Verify API key and secret are correct
2. Check backend server is running on correct port
3. Ensure server can reach LiveKit server

## 📚 Next Steps

### Recording Calls
Add recording functionality:
```javascript
// Start recording
await room.startRecording();

// Stop recording  
await room.stopRecording();
```

### Real-time Transcription
Enable live captions:
```javascript
room.on(RoomEvent.TranscriptionReceived, (segments) => {
  // Display live captions
});
```

### Custom Layouts
Implement different video layouts for different use cases.

## 🔗 Useful Resources

- [LiveKit Documentation](https://docs.livekit.io/)
- [React SDK Guide](https://docs.livekit.io/client-sdk-js/)
- [LiveKit Cloud Dashboard](https://cloud.livekit.io/)

Your app is now running on enterprise-grade video infrastructure! 🎉