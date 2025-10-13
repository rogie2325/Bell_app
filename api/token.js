import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { roomName, participantName, metadata } = req.body;
    
    console.log('🎫 Token request received:');
    console.log('   Room:', roomName);
    console.log('   Participant:', participantName);
    console.log('   Metadata:', metadata);
    
    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
    const LIVEKIT_SECRET = process.env.LIVEKIT_SECRET;

    if (!LIVEKIT_API_KEY || !LIVEKIT_SECRET) {
      console.error('Missing LiveKit credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: participantName,
      ttl: '1h',
      metadata: metadata || '', // Add metadata to the token
    });
    
    console.log('✅ Token created with metadata:', metadata || '(empty)');

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
}