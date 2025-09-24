// test-crypto-issue.js - Test for cryptographic primitive error
import { AccessToken } from 'livekit-server-sdk';
import crypto from 'crypto';

const LIVEKIT_API_KEY = 'APIcMRDDkDnN5Nr';
const LIVEKIT_SECRET = 'VTrMcXRGUhjzJyfsAJw315O0HPtpVXIgej3CtCRynbK';

console.log('🔍 Investigating cryptographic primitive error...');

async function investigateCryptoIssue() {
  // Test 1: Manual JWT creation to see exact format
  console.log('\n--- Manual JWT Creation ---');
  try {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload = {
      video: {
        room: 'test-room',
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true
      },
      iss: LIVEKIT_API_KEY,
      sub: 'test-user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      nbf: Math.floor(Date.now() / 1000) - 10,   // Valid from 10 seconds ago
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    const signature = crypto
      .createHmac('sha256', LIVEKIT_SECRET)
      .update(signatureInput)
      .digest('base64url');

    const manualJWT = `${signatureInput}.${signature}`;
    console.log('✅ Manual JWT created, length:', manualJWT.length);
    console.log('Manual JWT preview:', manualJWT.substring(0, 100) + '...');

    // Test validation
    const validationUrl = `https://belllive-9f7u9uab.livekit.cloud/rtc/validate?access_token=${encodeURIComponent(manualJWT)}`;
    const response = await fetch(validationUrl);
    console.log('Manual JWT validation:', response.status, response.ok);
    
  } catch (error) {
    console.log('❌ Manual JWT creation failed:', error.message);
  }

  // Test 2: LiveKit SDK with different options
  console.log('\n--- LiveKit SDK with RS256 attempt ---');
  try {
    // Note: LiveKit typically uses HS256, but let's test if this helps
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
      identity: 'test-user',
      ttl: 3600,
    });

    at.addGrant({
      room: 'test-room',
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    console.log('✅ LiveKit SDK token created, length:', token.length);
    
    // Decode and inspect
    const parts = token.split('.');
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log('Header algorithm:', header.alg);
    console.log('Issuer:', payload.iss);
    console.log('Subject:', payload.sub);
    console.log('Expiry:', new Date(payload.exp * 1000).toLocaleString());
    
  } catch (error) {
    console.log('❌ LiveKit SDK failed:', error.message);
  }

  // Test 3: Check secret encoding
  console.log('\n--- Secret Analysis ---');
  console.log('Secret as string:', LIVEKIT_SECRET);
  console.log('Secret length:', LIVEKIT_SECRET.length);
  console.log('Secret as hex:', Buffer.from(LIVEKIT_SECRET).toString('hex'));
  console.log('Secret as base64:', Buffer.from(LIVEKIT_SECRET).toString('base64'));
  
  // Check if secret looks like it might be base64 encoded
  try {
    const decoded = Buffer.from(LIVEKIT_SECRET, 'base64');
    console.log('Secret if base64 decoded:', decoded.toString());
    console.log('Decoded length:', decoded.length);
  } catch (error) {
    console.log('Secret is not valid base64');
  }
}

investigateCryptoIssue().catch(console.error);