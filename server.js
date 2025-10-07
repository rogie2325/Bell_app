import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to allow ngrok and localhost
app.use(cors({
  origin: true, // Allow all origins (including ngrok URLs)
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files from dist folder (for production/mobile access)
app.use(express.static(join(__dirname, 'dist')));

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_SECRET = process.env.LIVEKIT_SECRET;

if (!LIVEKIT_API_KEY || !LIVEKIT_SECRET) {
  console.error('Missing LiveKit credentials');
  process.exit(1);
}

console.log('Server ready');

app.post('/api/token', async (req, res) => {
  try {
    const { roomName, participantName } = req.body;
    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantName,
      ttl: '1h',
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    
    res.json({ token });

  } catch (error) {
    console.error('Token error:', error);
    res.status(500).json({ error: 'Token generation failed' });
  }
});

// Serve the React app for all other routes (for mobile/production)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log('Server on port', PORT);
  console.log('Serving frontend from dist folder');
  console.log('API available at /api/token');
});