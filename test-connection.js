// test-livekit-connection.js - Test LiveKit connection with validation
import { AccessToken } from 'livekit-server-sdk';

const LIVEKIT_API_KEY = 'APIcMRDDkDnN5Nr';
const LIVEKIT_SECRET = 'VTrMcXRGUhjzJyfsAJw315O0HPtpVXIgej3CtCRynbK';
const LIVEKIT_URL = 'wss://belllive-9f7u9uab.livekit.cloud';

console.log('🔧 LiveKit Connection Test');
console.log('URL:', LIVEKIT_URL);
console.log('API Key:', LIVEKIT_API_KEY);
console.log('Secret length:', LIVEKIT_SECRET.length);

async function testConnection() {
  try {
    // Generate token with minimal grants
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: 'test-connection',
      ttl: '1h', // Use string format
    });

    at.addGrant({
      room: 'connection-test',
      roomJoin: true,
    });

    const token = await at.toJwt();
    console.log('✅ Token generated for connection test');
    console.log('Token length:', token.length);
    
    // Test the validation endpoint directly
    const validationUrl = `${LIVEKIT_URL.replace('wss://', 'https://')}/rtc/validate?access_token=${encodeURIComponent(token)}`;
    console.log('🌐 Testing validation URL...');
    
    const response = await fetch(validationUrl);
    console.log('Validation response status:', response.status);
    console.log('Validation response ok:', response.ok);
    
    if (response.ok) {
      const data = await response.text();
      console.log('✅ Token validation successful');
      console.log('Response:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ Token validation failed');
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Full error:', error);
  }
}

testConnection();