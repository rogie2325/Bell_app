// Quick test script to verify token generation locally
import { AccessToken } from 'livekit-server-sdk';

const LIVEKIT_API_KEY = 'APIcMRDDkDnN5Nr';
const LIVEKIT_SECRET = 'VTrMcXRGUhjzJyfsAJw315O0HPtpVXIgej3CtCRynbK';

console.log('Testing LiveKit token generation...');

try {
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
    identity: 'test-user',
  });

  token.addGrant({
    room: 'test-room',
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const jwt = token.toJwt();
  console.log('✅ Token generated successfully');
  console.log('Token length:', jwt.length);
  console.log('Token preview:', jwt.substring(0, 50) + '...');
  
} catch (error) {
  console.error('❌ Token generation failed:', error.message);
}