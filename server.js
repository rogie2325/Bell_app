// server.js - Simple Express server for LiveKit token generation
import 'dotenv/config';
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

// Serve static files from Vite dist folder
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static files with proper MIME types and cache control
app.use(express.static(join(__dirname, 'dist'), {
  maxAge: 0, // Disable caching for development
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    // Disable caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// LiveKit configuration - replace with your actual values
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'your-api-key';
const LIVEKIT_SECRET = process.env.LIVEKIT_API_SECRET || process.env.LIVEKIT_SECRET || 'your-secret';

console.log('🔧 Server starting with LiveKit config:');
console.log('API Key configured:', !!LIVEKIT_API_KEY && LIVEKIT_API_KEY !== 'your-api-key');
console.log('Secret configured:', !!LIVEKIT_SECRET && LIVEKIT_SECRET !== 'your-secret');
console.log('API Key prefix:', LIVEKIT_API_KEY?.substring(0, 6) || 'none');
console.log('Secret prefix:', LIVEKIT_SECRET?.substring(0, 6) || 'none');

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
    // Create access token with minimal configuration
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantName,
      ttl: 3600, // Use numeric TTL (1 hour)
    });

    // Add minimal grants only
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
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

// Alternative minimal token endpoint
app.post('/api/token/minimal', async (req, res) => {
  const { roomName, participantName } = req.body;
  
  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantName,
    });
    
    // Absolute minimal grants
    at.addGrant({
      room: roomName,
      roomJoin: true,
    });
    
    const token = await at.toJwt();
    console.log('Minimal token generated, length:', token.length);
    res.json({ token });
  } catch (error) {
    console.error('Minimal token generation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Debug endpoint to check environment variables (remove in production)
app.get('/debug/config', (req, res) => {
  res.json({
    hasApiKey: !!LIVEKIT_API_KEY,
    hasSecret: !!LIVEKIT_SECRET,
    apiKeyLength: LIVEKIT_API_KEY?.length || 0,
    secretLength: LIVEKIT_SECRET?.length || 0,
    apiKeyPrefix: LIVEKIT_API_KEY?.substring(0, 10) || 'none',
    secretPrefix: LIVEKIT_SECRET?.substring(0, 10) || 'none',
    nodeEnv: process.env.NODE_ENV,
    port: PORT
  });
});

// Serve the React app for any non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LiveKit token server running on port ${PORT}`);
  console.log(`🌍 Server accessible at: http://10.12.2.170:${PORT}`);
  console.log(`🌐 Frontend and backend served from same server`);
});