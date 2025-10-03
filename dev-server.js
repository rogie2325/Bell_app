// dev-server.js - Simple development server for serving built files
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000; // Use fixed port to avoid conflicts

// Enable CORS for all origins
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files with proper MIME types
app.use(express.static(join(__dirname, 'dist'), {
  maxAge: 0, // Disable caching
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    // Set proper MIME types for JavaScript modules
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (path.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    
    // Disable caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Serve the React app for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Development server running on port ${PORT}`);
  console.log(`🌍 Access your app at: http://localhost:${PORT}`);
  console.log(`📱 For mobile testing, use your local IP or ngrok`);
});