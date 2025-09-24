#!/usr/bin/env node
// setup-livekit.js - Helper script to configure LiveKit credentials

import fs from 'fs';
import readline from 'readline';
import path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function setupLiveKit() {
  console.log('🎥 LiveKit Configuration Setup\n');
  console.log('Please get your credentials from: https://cloud.livekit.io\n');

  try {
    const projectUrl = await question('Enter your LiveKit WebSocket URL (e.g., wss://your-project.livekit.cloud): ');
    const apiKey = await question('Enter your API Key: ');
    const secret = await question('Enter your Secret Key: ');

    const envContent = `# LiveKit Configuration
VITE_LIVEKIT_URL=${projectUrl}
LIVEKIT_API_KEY=${apiKey}
LIVEKIT_SECRET=${secret}
VITE_BACKEND_URL=http://localhost:3001

# Production Backend URL (update when deploying)
# VITE_BACKEND_URL=https://your-backend.herokuapp.com
`;

    fs.writeFileSync('.env', envContent);
    console.log('\n✅ Configuration saved to .env file!');
    console.log('\n🚀 You can now run: npm run dev:full');
    console.log('\n📝 Next steps:');
    console.log('   1. Test your local setup');
    console.log('   2. Deploy your backend server');
    console.log('   3. Update VITE_BACKEND_URL for production');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }

  rl.close();
}

setupLiveKit();