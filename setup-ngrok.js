#!/usr/bin/env node

// setup-ngrok.js - Helper script for ngrok setup
import { spawn } from 'child_process';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Bell App - ngrok Setup Helper\n');

const questions = [
  {
    question: 'What port is your app running on? (default: 5173)',
    default: '5173',
    key: 'port'
  },
  {
    question: 'Do you want HTTPS? (y/n, default: y)',
    default: 'y',
    key: 'https'
  },
  {
    question: 'Do you have a custom ngrok domain? (optional)',
    default: '',
    key: 'domain'
  }
];

const answers = {};

function askQuestion(index) {
  if (index >= questions.length) {
    startNgrok();
    return;
  }

  const q = questions[index];
  rl.question(q.question + ' ', (answer) => {
    answers[q.key] = answer.trim() || q.default;
    askQuestion(index + 1);
  });
}

function startNgrok() {
  const port = answers.port;
  const useHttps = answers.https.toLowerCase() === 'y';
  const domain = answers.domain;

  console.log('\n🔧 Starting ngrok...\n');

  let command = 'ngrok';
  let args = [];

  if (useHttps) {
    args.push('http', port, '--scheme=https');
  } else {
    args.push('http', port);
  }

  if (domain) {
    args.push('--domain=' + domain);
  }

  console.log(`Running: ${command} ${args.join(' ')}\n`);

  const ngrok = spawn(command, args, {
    stdio: 'inherit'
  });

  ngrok.on('error', (error) => {
    console.error('❌ Error starting ngrok:', error.message);
    console.log('\n💡 Make sure ngrok is installed:');
    console.log('   npm install -g ngrok');
    console.log('   or download from: https://ngrok.com/download');
  });

  ngrok.on('close', (code) => {
    console.log(`\n🔌 ngrok process exited with code ${code}`);
  });

  // Handle cleanup
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping ngrok...');
    ngrok.kill();
    rl.close();
    process.exit(0);
  });
}

// Check if ngrok is installed
const checkNgrok = spawn('ngrok', ['version'], { stdio: 'pipe' });

checkNgrok.on('error', () => {
  console.log('❌ ngrok is not installed or not in PATH');
  console.log('\n📦 Install ngrok:');
  console.log('   npm install -g ngrok');
  console.log('   or download from: https://ngrok.com/download');
  console.log('\n🔑 Sign up for free at: https://ngrok.com');
  process.exit(1);
});

checkNgrok.on('close', (code) => {
  if (code === 0) {
    askQuestion(0);
  } else {
    console.log('❌ ngrok installation check failed');
    process.exit(1);
  }
});