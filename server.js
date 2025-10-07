import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

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
    console.log('Generated token:', token);
    console.log('Token type:', typeof token);
    console.log('Token length:', token ? token.length : 'null/undefined');
    
    res.json({ token });

  } catch (error) {
    console.error('Token error:', error);
    res.status(500).json({ error: 'Token generation failed' });
  }
});

app.listen(PORT, () => {
  console.log('Server on port', PORT);
});