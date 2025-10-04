// server.js - Clean LiveKit token server following official documentation
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Get file paths for serving static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve static files from dist folder
app.use(express.static(join(__dirname, 'dist'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// LiveKit configuration from environment
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_SECRET = process.env.LIVEKIT_SECRET;

// Validate configuration
if (!LIVEKIT_API_KEY || !LIVEKIT_SECRET) {
  console.error('❌ Missing required environment variables: LIVEKIT_API_KEY and LIVEKIT_SECRET');
  process.exit(1);
}

console.log('✅ LiveKit configuration loaded');
console.log('🔑 API Key:', LIVEKIT_API_KEY.substring(0, 8) + '...');
console.log('🔐 Secret:', LIVEKIT_SECRET.substring(0, 8) + '...');
// Token generation endpoint - following LiveKit official documentation
app.post('/api/token', async (req, res) => {
  try {
    const { roomName, participantName } = req.body;

    // Validate required parameters
    if (!roomName || !participantName) {
      return res.status(400).json({ 
        error: 'Missing required parameters: roomName and participantName' 
      });
    }

    console.log(`🎫 Generating token for ${participantName} joining room ${roomName}`);

    // Create access token with proper configuration
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantName,
      ttl: '1h', // 1 hour TTL
    });

    // Add grants - following LiveKit documentation
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Generate JWT token
    const token = at.toJwt();
    
    console.log(`✅ Token generated successfully for ${participantName}`);
    
    res.json({ token });

  } catch (error) {
    console.error('❌ Token generation failed:', error);
    res.status(500).json({ 
      error: 'Failed to generate access token',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    livekit: {
      configured: !!(LIVEKIT_API_KEY && LIVEKIT_SECRET)
    }
  });
});

// Catch-all for serving React app
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LiveKit Server running on port ${PORT}`);
  console.log(`📡 Ready to generate tokens for LiveKit rooms`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
});