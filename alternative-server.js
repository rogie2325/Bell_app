// alternative-server.js - Test different token generation approaches
import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const LIVEKIT_API_KEY = 'APIcMRDDkDnN5Nr';
const LIVEKIT_SECRET = 'VTrMcXRGUhjzJyfsAJw315O0HPtpVXIgej3CtCRynbK';

// Test endpoint with multiple token generation methods
app.post('/api/token/test', async (req, res) => {
  const { roomName, participantName } = req.body;
  
  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const results = {};

  // Method 1: Standard approach
  try {
    const at1 = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantName,
      ttl: 3600, // 1 hour in seconds
    });
    at1.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true });
    results.method1 = await at1.toJwt();
  } catch (error) {
    results.method1_error = error.message;
  }

  // Method 2: String TTL
  try {
    const at2 = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantName,
      ttl: '1h',
    });
    at2.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true });
    results.method2 = await at2.toJwt();
  } catch (error) {
    results.method2_error = error.message;
  }

  // Method 3: No TTL specified (default)
  try {
    const at3 = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantName,
    });
    at3.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true });
    results.method3 = await at3.toJwt();
  } catch (error) {
    results.method3_error = error.message;
  }

  // Method 4: Secret as Buffer
  try {
    const bufferSecret = Buffer.from(LIVEKIT_SECRET);
    const at4 = new AccessToken(LIVEKIT_API_KEY, bufferSecret, {
      identity: participantName,
      ttl: 3600,
    });
    at4.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true });
    results.method4 = await at4.toJwt();
  } catch (error) {
    results.method4_error = error.message;
  }

  console.log('Token generation results:', Object.keys(results));
  res.json(results);
});

// Simple token endpoint using the most basic approach
app.post('/api/token/simple', async (req, res) => {
  const { roomName, participantName } = req.body;
  
  try {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantName,
    });
    
    // Minimal grants
    at.addGrant({
      room: roomName,
      roomJoin: true,
    });
    
    const token = await at.toJwt();
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Alternative server running on port ${PORT}`);
});

export default app;