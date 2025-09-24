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
const LIVEKIT_SECRET = process.env.LIVEKIT_SECRET || 'your-secret';

// Generate access token endpoint
app.post('/api/token', (req, res) => {
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
    // Create access token
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantName,
    });

    // Add grants
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = at.toJwt();
    console.log('Token generated successfully for:', participantName);
    
    res.json({ token });
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