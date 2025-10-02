// production-server.js - Production-ready WebSocket server for Bell App
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';

const app = express();
const server = createServer(app);

// Production configuration
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'bell-app-secret-change-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// CORS configuration
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? ['https://your-domain.com', 'https://bell-app.vercel.app'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(limiter);

// Socket.IO configuration
const io = new SocketIOServer(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// In-memory storage (replace with database in production)
const users = new Map();
const rooms = new Map();
const activeConnections = new Map();

// Utility functions
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

const validateJWT = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const createRoom = (roomId, creatorId) => {
  const room = {
    id: roomId,
    name: roomId,
    creator: creatorId,
    participants: new Map(),
    messages: [],
    createdAt: new Date(),
    isActive: true,
    maxParticipants: 50
  };
  rooms.set(roomId, room);
  return room;
};

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const userId = generateId();
    const user = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      createdAt: new Date(),
      isOnline: false
    };

    users.set(userId, user);

    // Generate JWT token
    const token = jwt.sign(
      { userId, username, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = Array.from(users.values()).find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Room management endpoints
app.get('/api/rooms', (req, res) => {
  const activeRooms = Array.from(rooms.values())
    .filter(room => room.isActive)
    .map(room => ({
      id: room.id,
      name: room.name,
      participantCount: room.participants.size,
      maxParticipants: room.maxParticipants,
      createdAt: room.createdAt
    }));
  
  res.json({ rooms: activeRooms });
});

app.post('/api/rooms', (req, res) => {
  try {
    const { roomName, isPrivate = false } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const userData = validateJWT(token);
    
    if (!userData) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const roomId = roomName || generateId();
    
    if (rooms.has(roomId)) {
      return res.status(409).json({ error: 'Room already exists' });
    }

    const room = createRoom(roomId, userData.userId);
    room.isPrivate = isPrivate;
    
    res.status(201).json({
      room: {
        id: room.id,
        name: room.name,
        isPrivate: room.isPrivate,
        participantCount: 0,
        maxParticipants: room.maxParticipants
      }
    });
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeRooms: rooms.size,
    activeUsers: activeConnections.size,
    environment: NODE_ENV
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  let currentUser = null;
  let currentRoom = null;

  // Authentication middleware for socket
  socket.on('authenticate', (data) => {
    try {
      const { token } = data;
      const userData = validateJWT(token);
      
      if (!userData) {
        socket.emit('auth_error', { error: 'Invalid token' });
        return;
      }

      const user = users.get(userData.userId);
      if (!user) {
        socket.emit('auth_error', { error: 'User not found' });
        return;
      }

      currentUser = { ...user };
      delete currentUser.password;
      currentUser.socketId = socket.id;
      currentUser.isOnline = true;

      activeConnections.set(socket.id, currentUser);
      
      socket.emit('authenticated', { user: currentUser });
      console.log(`✅ User authenticated: ${currentUser.username} (${socket.id})`);
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('auth_error', { error: 'Authentication failed' });
    }
  });

  // Join room
  socket.on('join_room', (data) => {
    if (!currentUser) {
      socket.emit('error', { error: 'Authentication required' });
      return;
    }

    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('error', { error: 'Room ID is required' });
        return;
      }

      // Leave current room if any
      if (currentRoom) {
        socket.leave(currentRoom);
        const room = rooms.get(currentRoom);
        if (room) {
          room.participants.delete(currentUser.id);
          socket.to(currentRoom).emit('user_left', {
            user: currentUser,
            participantCount: room.participants.size
          });
        }
      }

      // Create room if it doesn't exist
      let room = rooms.get(roomId);
      if (!room) {
        room = createRoom(roomId, currentUser.id);
      }

      // Check room capacity
      if (room.participants.size >= room.maxParticipants) {
        socket.emit('error', { error: 'Room is full' });
        return;
      }

      // Join the room
      socket.join(roomId);
      currentRoom = roomId;
      
      // Add user to room participants
      room.participants.set(currentUser.id, {
        ...currentUser,
        joinedAt: new Date(),
        isVideoEnabled: true,
        isAudioEnabled: true
      });

      // Get all participants in room
      const participants = Array.from(room.participants.values()).map(p => ({
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        isVideoEnabled: p.isVideoEnabled,
        isAudioEnabled: p.isAudioEnabled,
        joinedAt: p.joinedAt
      }));

      // Notify user they joined
      socket.emit('room_joined', {
        room: {
          id: room.id,
          name: room.name,
          participantCount: room.participants.size
        },
        participants,
        messages: room.messages.slice(-50) // Last 50 messages
      });

      // Notify others in room
      socket.to(roomId).emit('user_joined', {
        user: currentUser,
        participantCount: room.participants.size
      });

      console.log(`👥 ${currentUser.username} joined room: ${roomId} (${room.participants.size} participants)`);
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { error: 'Failed to join room' });
    }
  });

  // Leave room
  socket.on('leave_room', () => {
    if (currentRoom && currentUser) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.participants.delete(currentUser.id);
        socket.to(currentRoom).emit('user_left', {
          user: currentUser,
          participantCount: room.participants.size
        });

        // Clean up empty rooms
        if (room.participants.size === 0) {
          room.isActive = false;
          setTimeout(() => {
            if (room.participants.size === 0) {
              rooms.delete(currentRoom);
              console.log(`🗑️ Deleted empty room: ${currentRoom}`);
            }
          }, 300000); // Delete after 5 minutes of being empty
        }
      }
      
      socket.leave(currentRoom);
      currentRoom = null;
      console.log(`👋 ${currentUser.username} left room`);
    }
  });

  // Chat message
  socket.on('chat_message', (data) => {
    if (!currentUser || !currentRoom) {
      socket.emit('error', { error: 'Join a room first' });
      return;
    }

    try {
      const { text } = data;
      
      if (!text || text.trim().length === 0) {
        return;
      }

      const message = {
        id: generateId(),
        text: text.trim(),
        user: currentUser,
        timestamp: new Date().toISOString(),
        roomId: currentRoom
      };

      // Store message in room
      const room = rooms.get(currentRoom);
      if (room) {
        room.messages.push(message);
        
        // Keep only last 100 messages
        if (room.messages.length > 100) {
          room.messages = room.messages.slice(-100);
        }
      }

      // Broadcast to all users in room
      io.to(currentRoom).emit('chat_message', message);
      console.log(`💬 Message from ${currentUser.username} in ${currentRoom}: ${text.substring(0, 50)}...`);
    } catch (error) {
      console.error('Chat message error:', error);
      socket.emit('error', { error: 'Failed to send message' });
    }
  });

  // WebRTC signaling
  socket.on('webrtc_offer', (data) => {
    if (!currentRoom) return;
    
    socket.to(data.targetId).emit('webrtc_offer', {
      offer: data.offer,
      senderId: socket.id,
      senderUser: currentUser
    });
  });

  socket.on('webrtc_answer', (data) => {
    if (!currentRoom) return;
    
    socket.to(data.targetId).emit('webrtc_answer', {
      answer: data.answer,
      senderId: socket.id
    });
  });

  socket.on('webrtc_ice_candidate', (data) => {
    if (!currentRoom) return;
    
    socket.to(data.targetId).emit('webrtc_ice_candidate', {
      candidate: data.candidate,
      senderId: socket.id
    });
  });

  // Media controls
  socket.on('toggle_video', (data) => {
    if (!currentUser || !currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (room && room.participants.has(currentUser.id)) {
      const participant = room.participants.get(currentUser.id);
      participant.isVideoEnabled = data.enabled;
      
      socket.to(currentRoom).emit('user_video_toggle', {
        userId: currentUser.id,
        enabled: data.enabled
      });
    }
  });

  socket.on('toggle_audio', (data) => {
    if (!currentUser || !currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (room && room.participants.has(currentUser.id)) {
      const participant = room.participants.get(currentUser.id);
      participant.isAudioEnabled = data.enabled;
      
      socket.to(currentRoom).emit('user_audio_toggle', {
        userId: currentUser.id,
        enabled: data.enabled
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    
    // Clean up user from room
    if (currentRoom && currentUser) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.participants.delete(currentUser.id);
        socket.to(currentRoom).emit('user_left', {
          user: currentUser,
          participantCount: room.participants.size
        });
      }
    }
    
    // Remove from active connections
    activeConnections.delete(socket.id);
    
    // Update user online status
    if (currentUser) {
      const user = users.get(currentUser.id);
      if (user) {
        user.isOnline = false;
      }
    }
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Production Bell server running on port ${PORT}`);
  console.log(`🌐 Environment: ${NODE_ENV}`);
  console.log(`🔒 JWT Secret configured: ${!!JWT_SECRET}`);
  console.log(`🔌 WebSocket server ready for real-time connections`);
  console.log(`🌍 Server accessible at: http://192.168.2.54:${PORT}`);
});