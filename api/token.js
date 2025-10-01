// API route for Vercel deployment
import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomName, participantName } = req.body;

  if (!roomName || !participantName) {
    console.error('Missing required fields:', { roomName, participantName });
    return res.status(400).json({ error: 'Room name and participant name are required' });
  }

  // Get LiveKit credentials from environment variables
  const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
  const LIVEKIT_SECRET = process.env.LIVEKIT_API_SECRET || process.env.LIVEKIT_SECRET;

  if (!LIVEKIT_API_KEY || !LIVEKIT_SECRET) {
    console.error('LiveKit credentials not configured');
    return res.status(500).json({ error: 'Server configuration error - missing credentials' });
  }

  try {
    console.log('Generating token for:', participantName, 'in room:', roomName);
    
    // Create access token
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantName,
      ttl: 3600, // 1 hour
    });

    // Add grants
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Generate the JWT token
    const token = at.toJwt();
    
    console.log('Token generated successfully');
    console.log('Token length:', token ? token.length : 'null');
    
    res.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token', details: error.message });
  }
}