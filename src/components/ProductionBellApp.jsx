import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Camera, Mic, MicOff, Video, VideoOff, Phone, Users, MessageCircle, 
  Settings, Monitor, MonitorOff, Send, Menu, X, LogOut, UserPlus, Download,
  Share2, Copy, Link, PhoneOff
} from 'lucide-react';

const ProductionBellApp = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState(localStorage.getItem('bell_token'));

  // Connection state
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Room state
  const [roomId, setRoomId] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [participants, setParticipants] = useState([]);

  // Media state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // UI state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const localVideoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const peerConnections = useRef({});

  // Server URL - adjust for production
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://192.168.2.54:3001';

  // Auto-authenticate for testing (bypass login)
  useEffect(() => {
    if (!isAuthenticated && !user) {
      console.log('🚀 Auto-authenticating for testing...');
      const testUser = {
        id: Date.now().toString(),
        username: `User${Math.floor(Math.random() * 1000)}`,
        email: `user${Math.floor(Math.random() * 1000)}@test.com`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
      };
      
      const testToken = 'test-token-' + Date.now();
      
      setUser(testUser);
      setIsAuthenticated(true);
      setToken(testToken);
      localStorage.setItem('bell_token', testToken);
      
      console.log('✅ Auto-authenticated as:', testUser.username);
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (token && !socket && user) {
      console.log('🔌 Connecting to server:', SERVER_URL);
      const newSocket = io(SERVER_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to server');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Authenticate with JWT token
        newSocket.emit('authenticate', { token });
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        setIsConnected(false);
        setConnectionStatus('disconnected');
      });

      newSocket.on('authenticated', (data) => {
        console.log('✅ Authenticated:', data.user);
        setUser(data.user);
        setIsAuthenticated(true);
        setError('');
      });

      newSocket.on('auth_error', (data) => {
        console.error('❌ Authentication failed:', data.error);
        setError(data.error);
        setIsAuthenticated(false);
        localStorage.removeItem('bell_token');
        setToken(null);
      });

      newSocket.on('room_joined', (data) => {
        console.log('🏠 Joined room:', data.room);
        setCurrentRoom(data.room);
        setParticipants(data.participants || []);
        setMessages(data.messages || []);
        setError('');
      });

      newSocket.on('user_joined', (data) => {
        console.log('👤 User joined:', data.user);
        setParticipants(prev => [...prev, data.user]);
        
        // Add system message
        const systemMessage = {
          id: Date.now(),
          text: `${data.user.username} joined the room`,
          user: { username: 'System', avatar: '🤖' },
          timestamp: new Date().toISOString(),
          isSystem: true
        };
        setMessages(prev => [...prev, systemMessage]);
      });

      newSocket.on('user_left', (data) => {
        console.log('👋 User left:', data.user);
        setParticipants(prev => prev.filter(p => p.id !== data.user.id));
        
        // Clean up peer connection
        if (peerConnections.current[data.user.id]) {
          peerConnections.current[data.user.id].close();
          delete peerConnections.current[data.user.id];
        }
        
        // Remove remote stream
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.user.id);
          return newMap;
        });

        // Add system message
        const systemMessage = {
          id: Date.now(),
          text: `${data.user.username} left the room`,
          user: { username: 'System', avatar: '🤖' },
          timestamp: new Date().toISOString(),
          isSystem: true
        };
        setMessages(prev => [...prev, systemMessage]);
      });

      newSocket.on('chat_message', (message) => {
        console.log('💬 New message:', message);
        setMessages(prev => [...prev, message]);
      });

      // WebRTC signaling events
      newSocket.on('webrtc_offer', async (data) => {
        console.log('📞 Received offer from:', data.senderUser?.username);
        await handleWebRTCOffer(data, newSocket);
      });

      newSocket.on('webrtc_answer', async (data) => {
        console.log('📞 Received answer from:', data.senderId);
        await handleWebRTCAnswer(data);
      });

      newSocket.on('webrtc_ice_candidate', async (data) => {
        console.log('🧊 Received ICE candidate from:', data.senderId);
        await handleICECandidate(data);
      });

      newSocket.on('user_video_toggle', (data) => {
        setParticipants(prev => prev.map(p => 
          p.id === data.userId ? { ...p, isVideoEnabled: data.enabled } : p
        ));
      });

      newSocket.on('user_audio_toggle', (data) => {
        setParticipants(prev => prev.map(p => 
          p.id === data.userId ? { ...p, isAudioEnabled: data.enabled } : p
        ));
      });

      newSocket.on('error', (data) => {
        console.error('❌ Server error:', data.error);
        setError(data.error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [token]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update video element when localStream changes
  useEffect(() => {
    console.log('🔄 LocalStream changed:', !!localStream);
    if (localStream && localVideoRef.current) {
      console.log('🎥 Updating video element with stream');
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      localVideoRef.current.playsInline = true;
      
      // Ensure video plays
      const playVideo = async () => {
        try {
          await localVideoRef.current.play();
          console.log('✅ Video playing successfully');
        } catch (error) {
          console.warn('Video play failed, retrying...', error);
          setTimeout(playVideo, 100);
        }
      };
      
      playVideo();
    } else if (!localStream && localVideoRef.current) {
      console.log('🔌 Clearing video element');
      localVideoRef.current.srcObject = null;
    }
  }, [localStream]);

  // Authentication functions
  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('bell_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      setError('');
      
      console.log('✅ Login successful:', data.user);
    } catch (error) {
      console.error('❌ Login failed:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${SERVER_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      localStorage.setItem('bell_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      setError('');
      
      console.log('✅ Registration successful:', data.user);
    } catch (error) {
      console.error('❌ Registration failed:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.emit('leave_room');
      socket.disconnect();
    }
    
    localStorage.removeItem('bell_token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setCurrentRoom(null);
    setParticipants([]);
    setMessages([]);
    
    // Clean up media streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Clean up peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setRemoteStreams(new Map());
  };

  // Media functions
  const initializeMedia = async () => {
    try {
      console.log('🎥 Starting camera initialization...');
      console.log('🌐 Protocol:', window.location.protocol);
      console.log('🔒 Secure context:', window.isSecureContext);
      console.log('📱 User agent:', navigator.userAgent.substring(0, 100));
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }
      
      console.log('✅ getUserMedia supported');
      
      // Check available devices first
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        
        console.log('🎥 Video devices found:', videoDevices.length);
        console.log('🎤 Audio devices found:', audioDevices.length);
        
        if (videoDevices.length === 0) {
          throw new Error('No camera devices found');
        }
      } catch (deviceError) {
        console.warn('Could not enumerate devices:', deviceError);
      }
      
      console.log('🔄 Requesting camera permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('🎉 Camera permission granted!');
      console.log('📹 Video tracks:', stream.getVideoTracks().length);
      console.log('🎤 Audio tracks:', stream.getAudioTracks().length);
      
      // Log track details
      stream.getVideoTracks().forEach((track, index) => {
        console.log(`📹 Video track ${index}:`, track.label, track.readyState);
      });
      
      stream.getAudioTracks().forEach((track, index) => {
        console.log(`🎤 Audio track ${index}:`, track.label, track.readyState);
      });

      setLocalStream(stream);
      
      console.log('✅ Stream set in state, updating video elements...');
      
      // Update video element immediately
      if (localVideoRef.current) {
        console.log('🖥️ Setting video element srcObject');
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        localVideoRef.current.playsInline = true;
        
        // Force video to load and play
        localVideoRef.current.load();
        setTimeout(() => {
          if (localVideoRef.current) {
            localVideoRef.current.play().catch(e => {
              console.warn('Video play failed:', e);
            });
          }
        }, 100);
      } else {
        console.error('❌ Video element not found');
      }

      console.log('✅ Media initialized successfully');
      return stream;
    } catch (error) {
      console.error('❌ Camera initialization failed:', error);
      console.log('Error details:', {
        name: error.name,
        message: error.message,
        constraint: error.constraint
      });
      
      let errorMessage = '';
      let helpText = '';
      
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = 'Camera permission denied';
          helpText = 'Please click "Allow" when your browser asks for camera access, then try again.';
          break;
        case 'NotFoundError':
          errorMessage = 'No camera found';
          helpText = 'Please check that your camera is connected and not being used by another app.';
          break;
        case 'NotReadableError':
          errorMessage = 'Camera is busy';
          helpText = 'Please close other apps that might be using your camera (Skype, Zoom, etc.).';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Camera constraints not supported';
          helpText = 'Your camera may not support the requested resolution.';
          break;
        case 'SecurityError':
          errorMessage = 'Security error';
          helpText = 'Camera access may be blocked. Try using HTTPS or check browser settings.';
          break;
        case 'AbortError':
          errorMessage = 'Camera request was aborted';
          helpText = 'The camera request was cancelled. Please try again.';
          break;
        default:
          errorMessage = 'Camera error: ' + error.message;
          helpText = 'Please check your camera and browser permissions.';
      }
      
      setError(`${errorMessage}. ${helpText}`);
      
      // Show browser-specific help
      const isChrome = /Chrome/.test(navigator.userAgent);
      const isFirefox = /Firefox/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      if (isChrome && error.name === 'NotAllowedError') {
        console.log('💡 Chrome tip: Look for camera icon in address bar and click "Allow"');
      } else if (isFirefox && error.name === 'NotAllowedError') {
        console.log('💡 Firefox tip: Click on the camera icon in the address bar');
      } else if (isSafari && error.name === 'NotAllowedError') {
        console.log('💡 Safari tip: Go to Safari > Settings > Websites > Camera');
      }
      
      throw error;
    }
  };

  // WebRTC functions
  const createPeerConnection = (userId, socket) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);

    // Add local stream to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('🎥 Received remote track from:', userId);
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev).set(userId, remoteStream));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate to:', userId);
        socket.emit('webrtc_ice_candidate', {
          candidate: event.candidate,
          targetId: userId
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state with ${userId}:`, pc.connectionState);
    };

    peerConnections.current[userId] = pc;
    return pc;
  };

  const handleWebRTCOffer = async (data, socket) => {
    try {
      const { offer, senderId, senderUser } = data;
      const pc = createPeerConnection(senderId, socket);

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc_answer', {
        answer: answer,
        targetId: senderId
      });

      console.log('📞 Sent answer to:', senderUser?.username);
    } catch (error) {
      console.error('❌ Failed to handle WebRTC offer:', error);
    }
  };

  const handleWebRTCAnswer = async (data) => {
    try {
      const { answer, senderId } = data;
      const pc = peerConnections.current[senderId];
      
      if (pc) {
        await pc.setRemoteDescription(answer);
        console.log('📞 Applied answer from:', senderId);
      }
    } catch (error) {
      console.error('❌ Failed to handle WebRTC answer:', error);
    }
  };

  const handleICECandidate = async (data) => {
    try {
      const { candidate, senderId } = data;
      const pc = peerConnections.current[senderId];
      
      if (pc) {
        await pc.addIceCandidate(candidate);
        console.log('🧊 Added ICE candidate from:', senderId);
      }
    } catch (error) {
      console.error('❌ Failed to handle ICE candidate:', error);
    }
  };

  // Initialize camera immediately when authenticated
  useEffect(() => {
    if (isAuthenticated && !localStream) {
      console.log('🎥 Auto-initializing camera after authentication...');
      initializeMedia().catch(error => {
        console.log('Camera initialization failed, will try again when joining room:', error.message);
      });
    }
  }, [isAuthenticated, localStream]);

  // Room functions
  const joinRoom = async () => {
    if (!roomId || !socket) {
      setError('Please enter a room ID');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Initialize media if not already done
      if (!localStream) {
        console.log('🎥 Initializing camera for room join...');
        await initializeMedia();
      }

      // Join room via socket
      socket.emit('join_room', { roomId });

      console.log('🏠 Attempting to join room:', roomId);
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      setError('Failed to join room: ' + error.message);
      setIsLoading(false);
    }
  };

  // When participants change, establish WebRTC connections
  useEffect(() => {
    if (currentRoom && socket && localStream && participants.length > 0) {
      participants.forEach(async (participant) => {
        if (participant.id !== user?.id && !peerConnections.current[participant.id]) {
          try {
            console.log('📞 Creating WebRTC offer for:', participant.username);
            
            const pc = createPeerConnection(participant.id, socket);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('webrtc_offer', {
              offer: offer,
              targetId: participant.id
            });
          } catch (error) {
            console.error('❌ Failed to create offer for:', participant.username, error);
          }
        }
      });
      
      setIsLoading(false);
    }
  }, [participants, currentRoom, socket, localStream, user]);

  const leaveRoom = () => {
    if (socket) {
      socket.emit('leave_room');
    }
    
    setCurrentRoom(null);
    setParticipants([]);
    setMessages([]);
    
    // Clean up peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setRemoteStreams(new Map());
  };

  // Media control functions
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
        
        if (socket) {
          socket.emit('toggle_video', { enabled: !isVideoEnabled });
        }
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
        
        if (socket) {
          socket.emit('toggle_audio', { enabled: !isAudioEnabled });
        }
      }
    }
  };

  // Chat functions
  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    socket.emit('chat_message', { text: newMessage.trim() });
    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Authentication screen (DISABLED for testing)
  if (false && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔔</div>
            <h1 className="text-4xl font-bold text-white mb-2">Bell</h1>
            <p className="text-white/70">Production Video Calling</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {authMode === 'register' && (
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                disabled={isLoading}
              />
            )}
            
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              disabled={isLoading}
            />
            
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              disabled={isLoading}
            />

            <button
              onClick={authMode === 'login' ? handleLogin : handleRegister}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
            >
              {isLoading ? 'Please wait...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </button>

            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="w-full text-white/70 hover:text-white text-sm transition-colors"
              disabled={isLoading}
            >
              {authMode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
            </button>
          </div>

          <div className="mt-6 text-center text-white/50 text-xs">
            Connection: {connectionStatus}
          </div>
        </div>
      </div>
    );
  }

  // Main app interface
  return (
    <div className="h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl">🔔</div>
            <div>
              <h1 className="text-white font-bold">Bell</h1>
              <p className="text-white/70 text-sm">
                {currentRoom ? `Room: ${currentRoom.name}` : 'Production Ready'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-white/70 text-sm">
              {user?.username} • {connectionStatus}
            </div>
            <button
              onClick={handleLogout}
              className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {!currentRoom ? (
        // Room joining interface
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Join a Room</h2>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                disabled={isLoading}
              />
              
              {/* Camera preview */}
              {localStream && (
                <div className="relative">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-32 object-cover rounded-lg border border-green-500/50"
                  />
                  <div className="absolute bottom-1 left-1 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    ✅ Camera Ready
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2">
                <button
                  onClick={async () => {
                    try {
                      if (localStream) {
                        // Stop existing stream
                        localStream.getTracks().forEach(track => track.stop());
                        setLocalStream(null);
                        console.log('🔄 Stopped existing camera stream');
                      }
                      await initializeMedia();
                    } catch (error) {
                      console.error('Camera test failed:', error);
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 rounded-lg transition-all disabled:opacity-50 text-sm"
                >
                  {localStream ? '🔄 Refresh Camera' : '🎥 Test Camera'}
                </button>
                
                {localStream && (
                  <button
                    onClick={() => {
                      console.log('🔄 Force video refresh');
                      if (localVideoRef.current && localStream) {
                        localVideoRef.current.srcObject = localStream;
                        localVideoRef.current.play();
                      }
                    }}
                    className="px-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg text-sm"
                  >
                    🔄
                  </button>
                )}
              </div>
              
              <button
                onClick={joinRoom}
                disabled={!roomId || isLoading || !isConnected}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
              >
                {isLoading ? 'Joining...' : 'Join Room'}
              </button>
            </div>

            <div className="mt-6 text-center text-white/50 text-xs">
              Participants see each other in real-time
            </div>
          </div>
        </div>
      ) : (
        // Video call interface
        <div className="flex-1 flex">
          {/* Video area */}
          <div className="flex-1 relative">
            {/* Remote videos grid */}
            <div className="absolute inset-0 grid grid-cols-2 gap-2 p-4">
              {/* Local video */}
              <div className="relative bg-black/30 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  You {!isVideoEnabled && '(Video Off)'}
                </div>
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <VideoOff size={48} className="text-white/50" />
                  </div>
                )}
                {(!localStream || !isVideoEnabled) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center text-white">
                      <VideoOff size={48} className="mx-auto mb-2 text-white/50" />
                      <div className="text-sm">No Video</div>
                      <button 
                        onClick={() => initializeMedia()} 
                        className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                      >
                        Enable Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Remote videos */}
              {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
                const participant = participants.find(p => p.id === userId);
                return (
                  <div key={userId} className="relative bg-black/30 rounded-lg overflow-hidden">
                    <video
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                      ref={(video) => {
                        if (video) video.srcObject = stream;
                      }}
                    />
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      {participant?.username || 'Unknown'} {!participant?.isVideoEnabled && '(Video Off)'}
                    </div>
                    {!participant?.isVideoEnabled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <VideoOff size={48} className="text-white/50" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Placeholder for empty slots */}
              {Array.from({ length: Math.max(0, 3 - remoteStreams.size) }).map((_, index) => (
                <div key={`empty-${index}`} className="bg-black/20 rounded-lg flex items-center justify-center border-2 border-dashed border-white/20">
                  <Users size={48} className="text-white/30" />
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center space-x-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full transition-colors ${
                    isVideoEnabled ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                  }`}
                >
                  {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
                
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-full transition-colors ${
                    isAudioEnabled ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                  }`}
                >
                  {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </button>

                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                >
                  <MessageCircle size={20} />
                </button>

                <button
                  onClick={leaveRoom}
                  className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <PhoneOff size={20} />
                </button>
              </div>
            </div>

            {/* Participants count and debug */}
            <div className="absolute top-4 right-4 space-y-2">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
                <Users size={16} className="inline mr-2" />
                {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
              </div>
              
              {/* Debug panel */}
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs">
                <div>Room: {currentRoom?.name || 'Unknown'}</div>
                <div>Stream: {localStream ? '✅' : '❌'}</div>
                <div>Remote: {remoteStreams.size}</div>
                <button 
                  onClick={() => {
                    console.log('🔄 Force video refresh');
                    if (localVideoRef.current && localStream) {
                      localVideoRef.current.srcObject = localStream;
                      localVideoRef.current.play();
                    }
                  }}
                  className="mt-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                >
                  Fix Video
                </button>
              </div>
            </div>
          </div>

          {/* Chat sidebar */}
          {isChatOpen && (
            <div className="w-80 bg-black/30 backdrop-blur-sm border-l border-white/10 flex flex-col">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">Chat</h3>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="text-white/70 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className={`${message.isSystem ? 'text-center' : ''}`}>
                    {message.isSystem ? (
                      <div className="text-white/50 text-sm italic">
                        {message.text}
                      </div>
                    ) : (
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <img 
                            src={message.user.avatar} 
                            alt={message.user.username}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-white font-medium text-sm">
                            {message.user.username}
                          </span>
                          <span className="text-white/50 text-xs">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-white/90 text-sm">{message.text}</p>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-white/10">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 p-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 text-sm"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductionBellApp;