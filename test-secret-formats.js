// test-secret-formats.js - Test different secret key formats
import { AccessToken } from 'livekit-server-sdk';
import crypto from 'crypto';

const LIVEKIT_API_KEY = 'APIcMRDDkDnN5Nr';
const ORIGINAL_SECRET = 'VTrMcXRGUhjzJyfsAJw315O0HPtpVXIgej3CtCRynbK';

console.log('🔧 Testing different secret formats');

async function testSecretFormats() {
  // Test 1: Original secret as-is
  console.log('\n--- Test 1: Original Secret ---');
  try {
    const at1 = new AccessToken(LIVEKIT_API_KEY, ORIGINAL_SECRET, {
      identity: 'test1',
    });
    at1.addGrant({ room: 'test', roomJoin: true });
    const token1 = await at1.toJwt();
    console.log('✅ Original secret works, length:', token1.length);
  } catch (error) {
    console.log('❌ Original secret failed:', error.message);
  }

  // Test 2: Base64 decode the secret (if it's base64 encoded)
  console.log('\n--- Test 2: Base64 Decoded Secret ---');
  try {
    const decodedSecret = Buffer.from(ORIGINAL_SECRET, 'base64').toString('utf8');
    console.log('Decoded secret:', decodedSecret);
    const at2 = new AccessToken(LIVEKIT_API_KEY, decodedSecret, {
      identity: 'test2',
    });
    at2.addGrant({ room: 'test', roomJoin: true });
    const token2 = await at2.toJwt();
    console.log('✅ Decoded secret works, length:', token2.length);
  } catch (error) {
    console.log('❌ Decoded secret failed:', error.message);
  }

  // Test 3: Secret as Buffer
  console.log('\n--- Test 3: Secret as Buffer ---');
  try {
    const bufferSecret = Buffer.from(ORIGINAL_SECRET);
    const at3 = new AccessToken(LIVEKIT_API_KEY, bufferSecret, {
      identity: 'test3',
    });
    at3.addGrant({ room: 'test', roomJoin: true });
    const token3 = await at3.toJwt();
    console.log('✅ Buffer secret works, length:', token3.length);
  } catch (error) {
    console.log('❌ Buffer secret failed:', error.message);
  }

  // Test 4: Check if secret is actually base64
  console.log('\n--- Secret Analysis ---');
  console.log('Original secret:', ORIGINAL_SECRET);
  console.log('Secret length:', ORIGINAL_SECRET.length);
  console.log('Is valid base64:', isValidBase64(ORIGINAL_SECRET));
  
  // Test with shorter TTL to avoid timing issues
  console.log('\n--- Test 5: Short TTL Token ---');
  try {
    const at5 = new AccessToken(LIVEKIT_API_KEY, ORIGINAL_SECRET, {
      identity: 'elijah', // Use the same identity as the failing token
      ttl: 300, // 5 minutes
    });
    at5.addGrant({ 
      room: '0225', // Use the same room as the failing token
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token5 = await at5.toJwt();
    console.log('✅ Short TTL token works, length:', token5.length);
    console.log('Token preview:', token5.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ Short TTL token failed:', error.message);
  }
}

function isValidBase64(str) {
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
}

testSecretFormats();