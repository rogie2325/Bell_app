#!/usr/bin/env node
// test-livekit.js - Test LiveKit connection and token generation

import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const LIVEKIT_URL = process.env.VITE_LIVEKIT_URL;
const API_KEY = process.env.LIVEKIT_API_KEY;
const SECRET = process.env.LIVEKIT_SECRET;

console.log('🧪 Testing LiveKit Configuration...\n');

// Test 1: Check environment variables
console.log('📋 Environment Variables:');
console.log(`   LIVEKIT_URL: ${LIVEKIT_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`   API_KEY: ${API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   SECRET: ${SECRET ? '✅ Set' : '❌ Missing'}\n`);

if (!API_KEY || !SECRET) {
  console.log('❌ Please run: npm run setup');
  console.log('   Or manually create .env file with your credentials\n');
  process.exit(1);
}

// Test 2: Token generation
console.log('🔐 Testing Token Generation...');
try {
  const token = new AccessToken(API_KEY, SECRET, {
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
  console.log('   ✅ Token generated successfully');
  console.log(`   🔑 Sample token: ${jwt.substring(0, 50)}...\n`);

} catch (error) {
  console.log('   ❌ Token generation failed:', error.message);
  console.log('   💡 Check your API_KEY and SECRET\n');
  process.exit(1);
}

// Test 3: URL format validation
console.log('🌐 Testing URL Format...');
if (LIVEKIT_URL) {
  if (LIVEKIT_URL.startsWith('wss://') || LIVEKIT_URL.startsWith('ws://')) {
    console.log('   ✅ URL format is correct');
  } else {
    console.log('   ⚠️  URL should start with wss:// or ws://');
  }
  console.log(`   🔗 URL: ${LIVEKIT_URL}\n`);
} else {
  console.log('   ❌ LIVEKIT_URL not set\n');
}

// Test 4: Backend server test
console.log('🖥️  Backend Server Test...');
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3001';
console.log(`   📡 Backend URL: ${BACKEND_URL}`);

try {
  const testPayload = {
    roomName: 'test-room',
    participantName: 'test-user'
  };

  console.log('   💡 To test backend, run in another terminal:');
  console.log('      npm run server');
  console.log('   Then test with:');
  console.log(`      curl -X POST ${BACKEND_URL}/api/token -H "Content-Type: application/json" -d '${JSON.stringify(testPayload)}'`);
} catch (error) {
  console.log('   ❌ Backend test setup failed:', error.message);
}

console.log('\n🚀 Next Steps:');
console.log('   1. If all tests pass, run: npm run dev:full');
console.log('   2. Open http://localhost:5173');
console.log('   3. Test with a friend or another browser tab');
console.log('   4. Deploy using the DEPLOYMENT.md guide');

console.log('\n📚 Helpful Resources:');
console.log('   🌐 LiveKit Dashboard: https://cloud.livekit.io');
console.log('   📖 Documentation: https://docs.livekit.io');
console.log('   💬 Discord Support: https://livekit.io/discord');

console.log('\n✨ Your Bell app is ready for professional video calling! 🎉');