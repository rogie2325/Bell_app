import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Mic, MicOff, Video, VideoOff, Phone, Users, MessageCircle, 
  Settings, Monitor, MonitorOff, Send, Menu, X, LogOut, UserPlus, Download,
  Share2, Copy, Link
} from 'lucide-react';

const BellApp = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomCategory, setRoomCategory] = useState('social');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  
  // PWA Install functionality
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  
  // Real multi-user functionality
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [currentUser, setCurrentUser] = useState(null);
  
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Generate invite link
  const generateInviteLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}?room=${encodeURIComponent(roomId)}&user=${encodeURIComponent(username)}`;
  };

  // Copy invite link to clipboard
  const copyInviteLink = async () => {
    try {
      const inviteLink = generateInviteLink();
      await navigator.clipboard.writeText(inviteLink);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy invite link:', err);
      // Fallback for older browsers
      const inviteLink = generateInviteLink();
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 3000);
    }
  };

  // Share invite link (native sharing or fallback)
  const shareInviteLink = async () => {
    const inviteLink = generateInviteLink();
    const shareText = `Join my video call on Bell!\n\nRoom: ${roomId}\nClick here: ${inviteLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Bell video call',
          text: `Join "${roomId}" on Bell`,
          url: inviteLink,
        });
      } catch (err) {
        console.log('Native sharing cancelled or failed');
        copyInviteLink();
      }
    } else {
      copyInviteLink();
    }
  };

  // Check for room parameter in URL on app load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const userParam = urlParams.get('user');
    
    if (roomParam) {
      setRoomId(roomParam);
      if (userParam) {
        setUsername(userParam);
      }
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // PWA Install functionality
  useEffect(() => {
    console.log('🔧 PWA: Setting up install prompt listener...');
    
    const handleBeforeInstallPrompt = (e) => {
      console.log('🎯 PWA: beforeinstallprompt event fired!');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      console.log('✅ PWA: App was installed');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    // Check if already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      console.log('📱 PWA: App is already installed');
      setShowInstallPrompt(false);
    } else {
      console.log('🌐 PWA: App running in browser, install available');
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Force show install button for testing (remove this in production)
    setTimeout(() => {
      if (!deferredPrompt) {
        console.log('🧪 PWA: No install prompt detected, showing fallback button');
        setShowInstallPrompt(true);
      }
    }, 3000);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt]);

  const handleInstallApp = async () => {
    console.log('🚀 PWA: Install button clicked');
    
    if (deferredPrompt) {
      console.log('📲 PWA: Using browser install prompt');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } else {
      console.log('📱 PWA: No deferred prompt, showing manual instructions');
      // Fallback for browsers that don't support install prompt
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      let instructions = '';
      if (isIOS) {
        instructions = 'Tap the Share button and select "Add to Home Screen"';
      } else if (isAndroid) {
        instructions = 'Tap the menu (⋮) and select "Add to Home Screen" or "Install app"';
      } else {
        instructions = 'Use your browser menu to install this app';
      }
      
      alert(`To install the Bell app:\n${instructions}`);
    }
  };

  // Real WebSocket connection for multi-user functionality
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      console.log('🔌 Connecting to WebSocket server...');
      
      // Connect to a free WebSocket service for demo
      const ws = new WebSocket('wss://socketsbay.com/wss/v2/2/demo/');
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        
        // Send user joined message
        ws.send(JSON.stringify({
          type: 'user-joined',
          user: currentUser,
          timestamp: new Date().toISOString()
        }));
      };
      
      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Received message:', message);
          
          switch (message.type) {
            case 'user-joined':
              handleUserJoined(message);
              break;
            case 'user-left':
              handleUserLeft(message);
              break;
            case 'offer':
              handleOffer(message);
              break;
            case 'answer':
              handleAnswer(message);
              break;
            case 'ice-candidate':
              handleIceCandidate(message);
              break;
            case 'chat-message':
              handleChatMessage(message);
              break;
            case 'room-joined':
              handleRoomJoined(message);
              break;
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        setIsConnected(false);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection failed. Please try again.');
      };
      
      socketRef.current = ws;
      
      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'user-left',
            user: currentUser,
            timestamp: new Date().toISOString()
          }));
        }
        ws.close();
      };
    }
  }, [isAuthenticated, currentUser]);

  // Camera initialization - separate useEffect to ensure function is defined
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🎥 Attempting to start camera...');
      // Small delay to ensure component is ready
      setTimeout(() => {
        requestCameraPermissions();
      }, 100);
    }
  }, [isAuthenticated]);

  const requestCameraPermissions = async () => {
    console.log('🔥 BUTTON CLICKED - Starting camera request...');
    
    try {
      // Check if we're on mobile
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log('📱 Is mobile device:', isMobile);
      
      // Check if we're on HTTPS or localhost
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      console.log('🔒 Is secure context:', isSecure);
      
      if (isMobile && !isSecure) {
        setError('📱 Mobile devices require HTTPS for camera access. Use the network URL with HTTPS.');
        return;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ getUserMedia not supported');
        setError('Camera not supported in this browser');
        return;
      }

      console.log('✅ getUserMedia is supported');
      console.log('🎥 About to request permissions...');
      
      // Mobile-friendly constraints
      const constraints = {
        video: {
          facingMode: "user", // Front camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: true
      };
      
      console.log('📱 Using constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('🎉 PERMISSIONS GRANTED! Stream received:', stream);
      console.log('📹 Video tracks:', stream.getVideoTracks());
      console.log('🎤 Audio tracks:', stream.getAudioTracks());
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('� Video element updated successfully');
      } else {
        console.log('❌ Video element (localVideoRef.current) is null');
      }
      
      setError(''); // Clear any previous errors
      console.log('✅ Camera setup complete!');
      
    } catch (error) {
      console.error('💥 CAMERA ERROR:', error);
      console.log('Error name:', error.name);
      console.log('Error message:', error.message);
      
      if (error.name === 'NotAllowedError') {
        setError('❌ Camera access denied. Please click "Allow" when Chrome asks for permissions.');
      } else if (error.name === 'NotFoundError') {
        setError('❌ No camera found. Make sure your camera is connected.');
      } else if (error.name === 'NotReadableError') {
        setError('❌ Camera is being used by another app. Close other camera apps and try again.');
      } else {
        setError('❌ Camera error: ' + error.message);
      }
    }
  };

  const handleSocketMessage = (data) => {
    switch (data.type) {
      case 'room-joined':
        setIsConnected(true);
        setCurrentRoom(data.roomId);
        setParticipants(data.participants || []);
        break;
      case 'user-joined':
        setParticipants(prev => [...prev, data.user]);
        break;
      case 'user-left':
        setParticipants(prev => prev.filter(p => p.id !== data.userId));
        break;
      case 'chat-message':
        setMessages(prev => [...prev, data.message]);
        break;
      case 'offer':
        handleOffer(data.offer, data.sender);
        break;
      case 'answer':
        handleAnswer(data.answer, data.sender);
        break;
      case 'ice-candidate':
        handleIceCandidate(data.candidate, data.sender);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const handleOffer = async (offer, senderId) => {
    try {
      const pc = createPeerConnection(senderId);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socketRef.current.send(JSON.stringify({
        type: 'answer',
        answer: answer,
        target: senderId
      }));
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (answer, senderId) => {
    try {
      const pc = peerConnectionsRef.current[senderId];
      if (pc) {
        await pc.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = (candidate, senderId) => {
    const pc = peerConnectionsRef.current[senderId];
    if (pc) {
      pc.addIceCandidate(candidate).catch(console.error);
    }
  };

  const createPeerConnection = (userId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          target: userId
        }));
      }
    };

    pc.ontrack = (event) => {
      // Handle incoming video stream
      const videoElement = document.getElementById(`video-${userId}`);
      if (videoElement) {
        videoElement.srcObject = event.streams[0];
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionsRef.current[userId] = pc;
    return pc;
  };

  const categories = [
    { id: 'social', name: 'Social', icon: '😊', color: 'bg-purple-500' },
    { id: 'business', name: 'Business', icon: '💼', color: 'bg-blue-500' },
    { id: 'study', name: 'Study Group', icon: '📚', color: 'bg-green-500' },
    { id: 'music', name: 'Music', icon: '🎵', color: 'bg-pink-500' },
    { id: 'health', name: 'Wellness', icon: '🏥', color: 'bg-teal-500' }
  ];

  const login = async () => {
    try {
      // Demo login - enhanced for multi-user
      if (email && password) {
        const mockToken = 'demo_token_' + Date.now();
        localStorage.setItem('bell_token', mockToken);
        
        // Create user object for multi-user functionality
        const user = {
          id: Date.now().toString(),
          username: email.split('@')[0] || 'User',
          email: email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          joinedAt: new Date().toISOString()
        };
        
        setCurrentUser(user);
        setIsAuthenticated(true);
        setUsername(user.username);
        setError('');
        
        console.log('👤 User logged in:', user);
      } else {
        setError('Please enter email and password');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    }
  };

  const register = async () => {
    try {
      // Demo registration - enhanced for multi-user
      if (username && email && password) {
        if (password.length < 6) {
          setError('Password must be at least 6 characters long');
          return;
        }
        const mockToken = 'demo_token_' + Date.now();
        localStorage.setItem('bell_token', mockToken);
        
        // Create user object for multi-user functionality
        const user = {
          id: Date.now().toString(),
          username: username,
          email: email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          joinedAt: new Date().toISOString()
        };
        
        setCurrentUser(user);
        setIsAuthenticated(true);
        setError('');
        
        console.log('👤 User registered:', user);
        localStorage.setItem('bell_token', mockToken);
        setIsAuthenticated(true);
        setError('');
      } else {
        setError('Please fill in all fields');
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
    }
  };

  const startLocalVideo = async () => {
    try {
      // Stop any existing streams first
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true, // Always request video initially
        audio: true  // Always request audio initially
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Apply current video/audio settings
      stream.getVideoTracks().forEach(track => {
        track.enabled = isVideoEnabled;
      });
      stream.getAudioTracks().forEach(track => {
        track.enabled = isAudioEnabled;
      });
      
      console.log('Camera started successfully');
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      if (error.name === 'NotAllowedError') {
        setError('Camera/microphone access denied. Please allow permissions and refresh.');
      } else if (error.name === 'NotFoundError') {
        setError('No camera or microphone found.');
      } else {
        setError('Failed to access camera/microphone: ' + error.message);
      }
      return null;
    }
  };

  const startScreenShare = async () => {
    try {
      console.log('🖥️ Starting screen share...');
      
      // Enhanced mobile detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
      
      // Check if browser supports screen sharing
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        const mobileFallbackMsg = isMobile ? 
          'Screen sharing is not supported on most mobile browsers. Please use a desktop browser for screen sharing.' :
          'Screen sharing is not supported in this browser';
        setError(mobileFallbackMsg);
        console.log('❌ Screen sharing not supported:', mobileFallbackMsg);
        return;
      }

      // Mobile-specific screen share constraints
      const constraints = isMobile ? {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 15, max: 30 }
        },
        audio: false
      } : {
        video: {
          displaySurface: "monitor",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      };

      console.log('📱 Mobile device detected:', isMobile);
      console.log('🔧 Using constraints:', constraints);

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      
      // Update local video element to show screen share
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        
        // Mobile-specific video settings for screen share
        if (isMobile) {
          localVideoRef.current.playsInline = true;
          localVideoRef.current.muted = true;
          setTimeout(() => {
            if (localVideoRef.current) {
              localVideoRef.current.play().catch(e => console.log('📱 Screen share video play failed:', e));
            }
          }, 100);
        }
      }
      
      // Handle when user stops sharing via browser UI
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('Screen sharing ended by user');
        stopScreenShare();
      });

      socketRef.current.send(JSON.stringify({
        type: 'start-screen-share'
      }));
      
      console.log('✅ Screen sharing started successfully');
      
    } catch (error) {
      console.error('💥 Screen share failed:', error);
      
      // Enhanced mobile error handling
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
      
      if (error.name === 'NotAllowedError') {
        const mobileMsg = isMobile ? 
          'Screen sharing permission denied. Note: Screen sharing has limited support on mobile devices.' :
          'Screen sharing permission denied';
        setError(mobileMsg);
      } else if (error.name === 'NotSupportedError') {
        const mobileMsg = isMobile ? 
          'Screen sharing is not supported on this mobile browser. Please try using a desktop browser.' :
          'Screen sharing not supported in this browser';
        setError(mobileMsg);
      } else {
        const mobileMsg = isMobile ? 
          `Screen sharing failed on mobile: ${error.message}. Mobile browsers have limited screen sharing support.` :
          'Screen sharing failed: ' + error.message;
        setError(mobileMsg);
      }
      setIsScreenSharing(false);
    }
  };

  const stopScreenShare = async () => {
    console.log('Stopping screen share...');
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      screenStreamRef.current = null;
    }
    
    setIsScreenSharing(false);
    
    // Switch back to camera
    console.log('Switching back to camera...');
    await startLocalVideo();
    
    socketRef.current.send(JSON.stringify({
      type: 'stop-screen-share'
    }));
    
    console.log('Screen sharing stopped successfully');
  };

  const joinRoom = async () => {
    console.log('🔴 JOIN ROOM CLICKED!');
    console.log('📝 Username:', username);
    console.log('📝 Room ID:', roomId);
    console.log('👤 Current User:', currentUser);
    
    if (!username || !roomId) {
      console.log('❌ Missing username or roomId');
      setError('Please enter both username and room ID');
      return;
    }
    
    try {
      console.log('🏠 Joining room:', roomId);
      setError('Connecting...'); // Show progress
      
      // Create currentUser if it doesn't exist (for direct room joining)
      let userToUse = currentUser;
      if (!currentUser) {
        userToUse = {
          id: Date.now().toString(),
          username: username,
          email: `${username}@guest.bell`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          joinedAt: new Date().toISOString()
        };
        setCurrentUser(userToUse);
        setIsAuthenticated(true);
        console.log('👤 Created guest user:', userToUse);
      }
      
      // Ensure WebSocket is connected
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        console.log('🔌 WebSocket not connected, connecting now...');
        setError('Connecting to server...');
        
        try {
          const ws = new WebSocket('wss://socketsbay.com/wss/v2/2/demo/');
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Connection timeout - server may be unavailable'));
            }, 10000);
            
            ws.onopen = () => {
              clearTimeout(timeout);
              console.log('✅ WebSocket connected for room join');
              setIsConnected(true);
              resolve();
            };
            
            ws.onerror = (error) => {
              clearTimeout(timeout);
              console.error('❌ WebSocket connection error:', error);
              reject(new Error('Failed to connect to server'));
            };
            
            ws.onclose = () => {
              console.log('🔌 WebSocket closed');
              setIsConnected(false);
            };
            
            ws.onmessage = (event) => {
              console.log('📨 WebSocket message received:', event.data);
            };
          });
          
          socketRef.current = ws;
        } catch (wsError) {
          console.error('❌ WebSocket setup failed:', wsError);
          setError(`Connection failed: ${wsError.message}`);
          return;
        }
      }
      
      // Try to get camera permissions, but don't fail if it doesn't work
      console.log('🎥 Requesting camera permissions (optional)...');
      setError('Getting camera permissions...');
      
      try {
        await requestCameraPermissions();
        console.log('✅ Camera permissions granted');
      } catch (cameraError) {
        console.log('⚠️ Camera permissions failed, continuing without camera:', cameraError.message);
        // Continue without camera - user can enable it later
      }
      
      // Send join room message to other users
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const joinMessage = {
          type: 'join-room',
          roomId: roomId,
          user: userToUse,
          category: roomCategory,
          timestamp: new Date().toISOString()
        };
        
        console.log('📤 Sending join message:', joinMessage);
        socketRef.current.send(JSON.stringify(joinMessage));
        
        setCurrentRoom(roomId);
        setIsConnected(true);
        setError(''); // Clear error on success
        console.log('✅ Successfully joined room!');
      } else {
        console.log('❌ WebSocket not ready after connection attempt');
        setError('Connection lost. Please try again.');
        return;
      }
    } catch (error) {
      console.error('💥 Failed to join room:', error);
      console.log('Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      });
      
      let errorMessage = 'Unknown error occurred';
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setError(`Failed to join room: ${errorMessage}`);
    }
  };

  const leaveRoom = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    Object.values(peerConnectionsRef.current).forEach(pc => {
      pc.close();
    });
    peerConnectionsRef.current = {};
    
    socketRef.current.send(JSON.stringify({ type: 'leave-room' }));
    
    setIsConnected(false);
    setCurrentRoom(null);
    setParticipants([]);
    setMessages([]);
    setIsScreenSharing(false);
  };

  const toggleVideo = () => {
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);
    
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = newVideoState;
        console.log('Video track enabled:', newVideoState);
      });
    }
    
    socketRef.current.send(JSON.stringify({
      type: 'toggle-video',
      enabled: newVideoState
    }));
  };

  const toggleAudio = () => {
    const newAudioState = !isAudioEnabled;
    setIsAudioEnabled(newAudioState);
    
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = newAudioState;
        console.log('Audio track enabled:', newAudioState);
      });
    }
    
    socketRef.current.send(JSON.stringify({
      type: 'toggle-audio',
      enabled: newAudioState
    }));
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !currentUser) return;
    
    const message = {
      id: Date.now(),
      username: currentUser.username,
      text: newMessage,
      timestamp: new Date().toLocaleTimeString(),
      avatar: currentUser.avatar
    };
    
    // Add message to local state immediately
    setMessages(prev => [...prev, message]);
    
    // Send to other users via WebSocket
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat-message',
        roomId: currentRoom,
        text: newMessage,
        fromUser: currentUser,
        timestamp: new Date().toISOString()
      }));
    }
    
    setNewMessage('');
  };

  const logout = () => {
    localStorage.removeItem('bell_token');
    setIsAuthenticated(false);
    setIsConnected(false);
    if (socketRef.current) {
      socketRef.current.close();
    }
  };

  // Check for existing auth token
  useEffect(() => {
    const token = localStorage.getItem('bell_token');
    if (token) {
      // In a real app, verify token with server
      setIsAuthenticated(true);
      setUsername('User'); // Get from token
    }
  }, []);

  // Authentication Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔔</div>
            <h1 className="text-4xl font-bold text-white mb-2">Bell</h1>
            <p className="text-gray-300">Connect and collaborate live</p>
            <p className="text-xs text-gray-400">Created by Elijah Rose</p>
            
            {/* PWA Install Button */}
            {showInstallPrompt && (
              <button
                onClick={handleInstallApp}
                className="mt-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-all transform hover:scale-105"
              >
                <Download size={16} />
                Install App
              </button>
            )}
          </div>
          
          <div className="flex mb-6">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 px-4 rounded-l-lg font-medium transition-all ${
                authMode === 'login' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 px-4 rounded-r-lg font-medium transition-all ${
                authMode === 'register' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Register
            </button>
          </div>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {authMode === 'register' && (
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Username"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Email"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Password"
              onKeyPress={(e) => e.key === 'Enter' && (authMode === 'login' ? login() : register())}
            />
            <button
              onClick={authMode === 'login' ? login : register}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Room Join Screen
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="text-6xl mb-4">🔔</div>
              <h1 className="text-4xl font-bold text-white mb-2">Bell</h1>
              <p className="text-gray-300">Welcome, {username}!</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-white p-2"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

          {/* Big Camera Test Button */}
          {!localStreamRef.current && (
            <div className="mb-6 p-4 bg-red-600/20 border border-red-500 rounded-lg">
              <div className="text-center">
                <h3 className="text-white font-semibold mb-2">🎥 Camera Access Required</h3>
                <p className="text-gray-300 text-sm mb-3">Click below to enable your camera and microphone</p>
                <button
                  onClick={() => {
                    console.log('🔴 RED BUTTON CLICKED!');
                    alert('Button clicked! Check console for details.');
                    requestCameraPermissions();
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold animate-pulse"
                >
                  Enable Camera & Microphone
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {/* Camera Preview */}
            <div>
              <label className="block text-white mb-2 font-medium">Camera Preview</label>
              <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video mb-4">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!localStreamRef.current && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center text-gray-400">
                      <div className="text-4xl mb-2">📹</div>
                      <p className="text-sm mb-2">Camera not started</p>
                      <button
                        onClick={requestCameraPermissions}
                        className="mt-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm animate-pulse"
                      >
                        🎥 Enable Camera Now
                      </button>
                      {error && (
                        <p className="text-red-300 text-xs mt-2 max-w-xs">{error}</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex space-x-1">
                  {!isVideoEnabled && (
                    <div className="bg-red-600 p-1 rounded">
                      <VideoOff className="h-3 w-3 text-white" />
                    </div>
                  )}
                  {!isAudioEnabled && (
                    <div className="bg-red-600 p-1 rounded">
                      <MicOff className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-2 left-2 flex space-x-2">
                  <button
                    onClick={toggleVideo}
                    className={`p-2 rounded-full text-white ${
                      isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={toggleAudio}
                    className={`p-2 rounded-full text-white ${
                      isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-white mb-2 font-medium">Room Category</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setRoomCategory(category.id)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      roomCategory === category.id
                        ? `${category.color} border-white text-white`
                        : 'bg-white/10 border-white/30 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    <div className="text-xl mb-1">{category.icon}</div>
                    <div className="text-sm font-medium">{category.name}</div>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-white mb-2 font-medium">Room ID</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter room ID or create new"
                onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
              />
            </div>
            
            {error && (
              <div className="bg-red-600/20 border border-red-500 rounded-lg p-3">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setError(''); // Clear previous errors
                  console.log('🔴 BUTTON CLICKED! Event:', e);
                  console.log('📝 Username value:', username);
                  console.log('📝 RoomId value:', roomId);
                  joinRoom();
                }}
                disabled={!roomId || !username}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Join Room {!username ? '(Enter Username)' : !roomId ? '(Enter Room ID)' : ''}
              </button>
              
              <p className="text-gray-400 text-xs text-center">
                Camera permissions are optional - you can enable video after joining
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🔔</div>
          <div>
            <h1 className="text-white font-semibold text-sm">Room: {currentRoom}</h1>
            <p className="text-gray-400 text-xs">
              {categories.find(c => c.id === roomCategory)?.icon} {categories.find(c => c.id === roomCategory)?.name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="lg:hidden p-2 text-gray-400 hover:text-white"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-gray-400 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex bg-gray-800 border-b border-gray-700 p-4 items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🔔</div>
          <div>
            <h1 className="text-white font-semibold">Room: {currentRoom}</h1>
            <p className="text-gray-400 text-sm">
              {categories.find(c => c.id === roomCategory)?.icon} {categories.find(c => c.id === roomCategory)?.name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-gray-400">
            <Users className="h-4 w-4" />
            <span className="text-sm">{participants.length + 1}/8</span>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Invite others"
          >
            <UserPlus className="h-4 w-4" />
          </button>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            onClick={leaveRoom}
            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
          >
            <Phone className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute top-0 right-0 w-64 h-full bg-gray-800 p-4 transform transition-transform">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-semibold">Room Info</h3>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{participants.length + 1}/8 participants</span>
                </div>
                <button
                  onClick={() => {
                    setShowInviteModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Invite Others</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              <button
                onClick={() => {
                  leaveRoom();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2 p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                <Phone className="h-4 w-4" />
                <span>Leave Room</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Video Grid */}
        <div className="flex-1 p-2 lg:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-4 h-full">
            {/* Local Video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs lg:text-sm">
                {username} (You)
              </div>
              <div className="absolute top-2 right-2 flex space-x-1">
                {isScreenSharing && (
                  <div className="bg-green-600 p-1 rounded">
                    <Monitor className="h-3 w-3 text-white" />
                  </div>
                )}
                {!isVideoEnabled && (
                  <div className="bg-red-600 p-1 rounded">
                    <VideoOff className="h-3 w-3 text-white" />
                  </div>
                )}
                {!isAudioEnabled && (
                  <div className="bg-red-600 p-1 rounded">
                    <MicOff className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Remote Videos - Real WebRTC participants */}
            {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
              const participant = participants.find(p => p.id === userId);
              return (
                <div key={userId} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={(video) => {
                      if (video && stream) {
                        video.srcObject = stream;
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs lg:text-sm">
                    {participant?.username || 'Remote User'}
                  </div>
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <div className="bg-green-600 p-1 rounded">
                      <Video className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  {participant?.avatar && (
                    <div className="absolute top-2 left-2 w-8 h-8 rounded-full overflow-hidden">
                      <img src={participant.avatar} alt={participant.username} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Waiting message when no participants */}
            {remoteStreams.size === 0 && (
              <div className="col-span-full flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Waiting for other participants to join...</p>
                  <p className="text-sm mt-1">Share room ID: <span className="font-mono font-bold text-white">{currentRoom}</span></p>
                </div>
              </div>
            )}
            
            {/* Empty Slots */}
            {Array.from({ length: Math.max(0, 8 - participants.length - 1) }).map((_, index) => (
              <div key={`empty-${index}`} className="bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center aspect-video">
                <div className="text-gray-500 text-center">
                  <Users className="h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2" />
                  <p className="text-xs lg:text-sm">Waiting for participant</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Sidebar - Desktop */}
        <div className={`hidden lg:flex w-80 bg-gray-800 border-l border-gray-700 flex-col`}>
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold flex items-center">
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(message => (
              <div key={message.id} className="flex items-start space-x-3 text-sm">
                {message.avatar && (
                  <img 
                    src={message.avatar} 
                    alt={message.username}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <div className="text-gray-400 mb-1">
                    <span className="font-medium text-white">{message.username}</span>
                    <span className="ml-2 text-xs">{message.timestamp}</span>
                  </div>
                  <div className="text-gray-300">{message.text}</div>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-gray-500 text-center">
                No messages yet. Start the conversation!
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder="Type a message..."
              />
              <button
                onClick={sendMessage}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar - Mobile Overlay */}
        {isChatOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsChatOpen(false)}>
            <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gray-800 flex flex-col transform transition-transform">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-white font-semibold flex items-center">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat
                </h3>
                <button onClick={() => setIsChatOpen(false)}>
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(message => (
                  <div key={message.id} className="text-sm">
                    <div className="text-gray-400 mb-1">
                      <span className="font-medium text-white">{message.user}</span>
                      <span className="ml-2 text-xs">{message.timestamp}</span>
                    </div>
                    <div className="text-gray-300">{message.text}</div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-gray-500 text-center">
                    No messages yet. Start the conversation!
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    placeholder="Type a message..."
                  />
                  <button
                    onClick={sendMessage}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex justify-center items-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full transition-colors ${
              isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isAudioEnabled ? (
              <Mic className="h-5 w-5 text-white" />
            ) : (
              <MicOff className="h-5 w-5 text-white" />
            )}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors ${
              isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isVideoEnabled ? (
              <Video className="h-5 w-5 text-white" />
            ) : (
              <VideoOff className="h-5 w-5 text-white" />
            )}
          </button>
          
          <button
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            className={`p-3 rounded-full transition-colors ${
              isScreenSharing ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isScreenSharing ? (
              <MonitorOff className="h-5 w-5 text-white" />
            ) : (
              <Monitor className="h-5 w-5 text-white" />
            )}
          </button>
          
          <button
            onClick={leaveRoom}
            className="p-3 bg-red-600 hover:bg-red-700 rounded-full transition-colors lg:hidden"
          >
            <Phone className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowInviteModal(false)}>
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold text-lg">Invite Others to Join</h3>
              <button onClick={() => setShowInviteModal(false)}>
                <X className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Room Code</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={roomId}
                    readOnly
                    className="flex-1 bg-gray-700 text-white p-3 rounded-lg border border-gray-600"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(roomId);
                      alert('Room code copied!');
                    }}
                    className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    <Copy className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">Direct Join Link</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={generateInviteLink()}
                    readOnly
                    className="flex-1 bg-gray-700 text-white p-3 rounded-lg border border-gray-600 text-xs"
                  />
                  <button
                    onClick={copyInviteLink}
                    className={`p-3 rounded-lg transition-colors ${
                      inviteLinkCopied 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {inviteLinkCopied ? (
                      <span className="text-white text-xs px-2">✓</span>
                    ) : (
                      <Copy className="h-4 w-4 text-white" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={shareInviteLink}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share Link</span>
                </button>
                <button
                  onClick={copyInviteLink}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Link className="h-4 w-4" />
                  <span>Copy Link</span>
                </button>
              </div>

              <div className="text-gray-400 text-xs text-center">
                Share this link or room code with others to invite them to your call
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BellApp;