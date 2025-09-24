// test-wrong-credentials.js - Test with potentially wrong credentials
import { AccessToken } from 'livekit-server-sdk';

const CORRECT_API_KEY = 'APIcMRDDkDnN5Nr';
const CORRECT_SECRET = 'VTrMcXRGUhjzJyfsAJw315O0HPtpVXIgej3CtCRynbK';

// Test different credential combinations
const testCombinations = [
  { name: 'Correct credentials', api: CORRECT_API_KEY, secret: CORRECT_SECRET },
  { name: 'Wrong API key', api: 'WrongApiKey', secret: CORRECT_SECRET },
  { name: 'Wrong secret', api: CORRECT_API_KEY, secret: 'WrongSecret' },
  { name: 'Environment var names', api: process.env.LIVEKIT_API_KEY, secret: process.env.LIVEKIT_API_SECRET },
  { name: 'Alt environment var names', api: process.env.LIVEKIT_API_KEY, secret: process.env.LIVEKIT_SECRET },
];

async function testCredentials() {
  console.log('🔍 Testing different credential combinations...\n');
  
  for (const combo of testCombinations) {
    console.log(`--- Testing: ${combo.name} ---`);
    console.log(`API Key: ${combo.api?.substring(0, 10) || 'undefined'}...`);
    console.log(`Secret: ${combo.secret?.substring(0, 10) || 'undefined'}...`);
    
    if (!combo.api || !combo.secret) {
      console.log('❌ Missing credentials\n');
      continue;
    }
    
    try {
      const at = new AccessToken(combo.api, combo.secret, {
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
      console.log('✅ Token generated, length:', token.length);
      
      // Test validation
      try {
        const response = await fetch(`https://belllive-9f7u9uab.livekit.cloud/rtc/validate?access_token=${encodeURIComponent(token)}`);
        console.log('Validation status:', response.status);
        
        if (response.ok) {
          console.log('✅ Token validation successful');
        } else {
          const errorText = await response.text();
          console.log('❌ Token validation failed:', errorText);
        }
      } catch (validationError) {
        console.log('❌ Validation request failed:', validationError.message);
      }
      
    } catch (tokenError) {
      console.log('❌ Token generation failed:', tokenError.message);
    }
    
    console.log('');
  }
}

testCredentials().catch(console.error);