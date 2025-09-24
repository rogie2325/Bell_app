// Quick test script to verify token generation locally
import { AccessToken } from 'livekit-server-sdk';

const LIVEKIT_API_KEY = 'APIcMRDDkDnN5Nr';
const LIVEKIT_SECRET = 'VTrMcXRGUhjzJyfsAJw315O0HPtpVXIgej3CtCRynbK';

console.log('Testing LiveKit token generation...');

async function testToken() {
  try {
    // Test 1: Basic token generation
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

    const jwt = await token.toJwt();
    console.log('✅ Token generated successfully');
    console.log('Token type:', typeof jwt);
    console.log('Token length:', jwt.length);
    console.log('Token preview:', jwt.substring(0, 100) + '...');
    
    // Test 2: Try with different options
    console.log('\n--- Testing with explicit TTL ---');
    const token2 = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: 'test-user-2',
      ttl: 3600, // 1 hour
    });

    token2.addGrant({
      room: 'test-room-2',
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt2 = await token2.toJwt();
    console.log('✅ Token 2 generated successfully');
    console.log('Token 2 length:', jwt2.length);
    
    // Test 3: Verify the secret format
    console.log('\n--- Credential Info ---');
    console.log('API Key:', LIVEKIT_API_KEY);
    console.log('Secret length:', LIVEKIT_SECRET.length);
    console.log('Secret is string:', typeof LIVEKIT_SECRET === 'string');
    
  } catch (error) {
    console.error('❌ Token generation failed:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testToken();