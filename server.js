// server.js - Simple Express server for LiveKit token generation
import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS for production - temporary allow all origins for debugging
app.use(cors({
  origin: true, // Temporarily allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// LiveKit configuration - replace with your actual values
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'your-api-key';
const LIVEKIT_SECRET = process.env.LIVEKIT_API_SECRET || process.env.LIVEKIT_SECRET || 'your-secret';

// Generate access token endpoint
app.post('/api/token', async (req, res) => {
  console.log('Token request received:', req.body);
  const { roomName, participantName } = req.body;

  if (!roomName || !participantName) {
    console.error('Missing required fields:', { roomName, participantName });
    return res.status(400).json({ error: 'Room name and participant name are required' });
  }

  if (!LIVEKIT_API_KEY || !LIVEKIT_SECRET || LIVEKIT_API_KEY === 'your-api-key') {
    console.error('LiveKit credentials not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Create access token with explicit options
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantName,
      ttl: '6h', // Use string format for TTL
    });

    // Add comprehensive grants
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomRecord: false, // Explicitly disable recording
      roomAdmin: false,  // Explicitly disable admin
    });

    // Generate the JWT token - handle both sync and async cases
    let token = at.toJwt();
    
    // If it's a Promise, await it
    if (token && typeof token.then === 'function') {
      token = await token;
    }
    
    console.log('Token generated successfully for:', participantName);
    console.log('Token type:', typeof token);
    console.log('Token length:', token ? token.length : 'null/undefined');
    console.log('Token preview:', token ? token.substring(0, 50) + '...' : 'null/undefined');
    
    // Ensure token is a string
    if (typeof token !== 'string') {
      console.error('Token is not a string:', typeof token, token);
      return res.status(500).json({ error: 'Token generation failed - invalid token type' });
    }
    
    // Validate token format (should be JWT with 3 parts)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('Invalid JWT format - token does not have 3 parts:', tokenParts.length);
      return res.status(500).json({ error: 'Token generation failed - invalid JWT format' });
    }
    
    const responseData = { token };
    console.log('Response data type:', typeof responseData.token);
    console.log('Response JSON preview:', JSON.stringify(responseData).substring(0, 100) + '...');
    
    res.json(responseData);
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`🚀 LiveKit token server running on port ${PORT}`);
});