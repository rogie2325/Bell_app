import jwt from 'jsonwebtoken';

export default function handler(req, res) {
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
    return res.status(400).json({ error: 'Room name and participant name are required' });
  }

  // Get LiveKit credentials from environment variables
  const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
  const LIVEKIT_SECRET = process.env.LIVEKIT_SECRET;

  if (!LIVEKIT_API_KEY || !LIVEKIT_SECRET) {
    return res.status(500).json({ error: 'Server configuration error - missing credentials' });
  }

  try {
    // Create LiveKit JWT token manually using jsonwebtoken
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour expiry

    const payload = {
      iss: LIVEKIT_API_KEY,
      sub: participantName,
      iat: now,
      exp: exp,
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true
      }
    };

    const token = jwt.sign(payload, LIVEKIT_SECRET, {
      algorithm: 'HS256',
      header: {
        alg: 'HS256',
        typ: 'JWT'
      }
    });
    
    console.log('Token generated successfully');
    console.log('Token length:', token ? token.length : 'null');
    
    // Validate token is a proper JWT (should have 3 parts)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('Invalid JWT format - token does not have 3 parts:', tokenParts.length);
      return res.status(500).json({ error: 'Token generation failed - invalid JWT format' });
    }
    
    res.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token', details: error.message });
  }
}