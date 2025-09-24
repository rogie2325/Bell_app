// simple-server.js - Minimal working LiveKit server
import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';

const app = express();
const PORT = process.env.PORT || 3001;

// Allow all origins for testing
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Your LiveKit credentials - hardcoded for testing
const LIVEKIT_API_KEY = 'APIcMRDDkDnN5Nr';
const LIVEKIT_SECRET = 'VTrMcXRGUhjzJyfsAJw315O0HPtpVXIgej3CtCRynbK';

console.log('🔑 Using API Key:', LIVEKIT_API_KEY);
console.log('🔐 Secret length:', LIVEKIT_SECRET.length);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    apiKey: LIVEKIT_API_KEY,
    secretLength: LIVEKIT_SECRET.length,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/token', (req, res) => {
  console.log('🎯 Token request:', req.body);
  
  const { roomName, participantName } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'Missing roomName or participantName' });
  }

  try {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantName,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = at.toJwt();
    console.log('✅ Token generated for:', participantName);
    console.log('🎫 Token length:', token ? token.length : 'undefined');
    console.log('🎫 Token type:', typeof token);
    if (token && typeof token === 'string') {
      console.log('🎫 Token preview:', token.substring(0, 20) + '...');
    } else {
      console.log('🎫 Token value:', token);
    }
    
    const response = { token };
    console.log('📤 Sending response keys:', Object.keys(response));
    
    res.json(response);
  } catch (error) {
    console.error('❌ Token generation failed:', error);
    res.status(500).json({ 
      error: 'Token generation failed', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Simple LiveKit server running on port ${PORT}`);
  console.log('🌐 API Key:', LIVEKIT_API_KEY);
  console.log('🔐 Secret configured:', !!LIVEKIT_SECRET);
});

export default app;