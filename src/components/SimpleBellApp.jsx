import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Mic, MicOff, Video, VideoOff, Phone, Users, MessageCircle, 
  Settings, Monitor, MonitorOff, Send, Menu, X, LogOut, UserPlus, Download,
  Share2, Copy, Link, PhoneOff
} from 'lucide-react';

const SimpleBellApp = () => {
  // Room state
  const [roomId, setRoomId] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [participants, setParticipants] = useState([]);

  // Media state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // UI state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [username] = useState(`User${Math.floor(Math.random() * 1000)}`);

  // Refs
  const localVideoRef = useRef(null);
  const messagesEndRef = useRef(null);
  const peerConnections = useRef({});

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

  // Initialize camera immediately when component loads
  useEffect(() => {
    console.log('🎥 Auto-initializing camera...');
    initializeMedia().catch(error => {
      console.log('Camera initialization failed:', error.message);
    });
  }, []);

  // Media functions
  const initializeMedia = async () => {
    try {
      console.log('🎥 Starting camera initialization...');
      console.log('🌐 Protocol:', window.location.protocol);
      console.log('🔒 Secure context:', window.isSecureContext);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }
      
      console.log('✅ getUserMedia supported');
      
      console.log('🔄 Requesting camera permission...');
      
      // Mobile-friendly constraints
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const constraints = {
        video: isMobile ? {
          facingMode: 'user',
          width: { ideal: 480 },
          height: { ideal: 360 }
        } : { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      console.log('📱 Device type:', isMobile ? 'Mobile' : 'Desktop');
      console.log('🎥 Using constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('🎉 Camera permission granted!');
      console.log('📹 Video tracks:', stream.getVideoTracks().length);
      console.log('🎤 Audio tracks:', stream.getAudioTracks().length);

      setLocalStream(stream);
      console.log('✅ Media initialized successfully');
      return stream;
    } catch (error) {
      console.error('❌ Camera initialization failed:', error);
      
      let errorMessage = '';
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = 'Camera permission denied. Please click "Allow" when your browser asks for camera access.';
          break;
        case 'NotFoundError':
          errorMessage = 'No camera found. Please check that your camera is connected.';
          break;
        case 'NotReadableError':
          errorMessage = 'Camera is busy. Please close other apps using your camera.';
          break;
        default:
          errorMessage = 'Camera error: ' + error.message;
      }
      
      setError(errorMessage);
      throw error;
    }
  };

  // Simple room joining (no server required for basic testing)
  const joinRoom = async () => {
    if (!roomId) {
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

      // Simple local room joining for testing
      setCurrentRoom({ id: roomId, name: roomId, participantCount: 1 });
      
      // Add a welcome message
      const welcomeMessage = {
        id: Date.now(),
        text: `Welcome to room "${roomId}"! Open this same URL in another browser to test multi-user.`,
        user: { username: 'System', avatar: '🤖' },
        timestamp: new Date().toISOString(),
        isSystem: true
      };
      setMessages([welcomeMessage]);

      // Ensure video is properly connected after room join
      setTimeout(() => {
        if (localStream && localVideoRef.current) {
          console.log('🔄 Re-connecting video after room join...');
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.play().catch(e => console.warn('Video play failed:', e));
        }
      }, 100);

      console.log('🏠 Joined room locally:', roomId);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      setError('Failed to join room: ' + error.message);
      setIsLoading(false);
    }
  };

  const leaveRoom = () => {
    setCurrentRoom(null);
    setParticipants([]);
    setMessages([]);
    console.log('👋 Left room');
  };

  // Media control functions
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  // Chat functions
  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      text: newMessage.trim(),
      user: { username: username, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` },
      timestamp: new Date().toISOString(),
      isSystem: false
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
                {currentRoom ? `Room: ${currentRoom.name}` : 'Simple Testing Mode'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-white/70 text-sm">
              {username} • Camera Test Mode
            </div>
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
                placeholder="Enter Room ID (e.g., test-123)"
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
                        localStream.getTracks().forEach(track => track.stop());
                        setLocalStream(null);
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
                disabled={!roomId || isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
              >
                {isLoading ? 'Joining...' : 'Join Room'}
              </button>
            </div>

            <div className="mt-6 text-center text-white/50 text-xs">
              Simple camera testing - no server required
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
              </div>

              {/* Placeholder for other participants */}
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-black/20 rounded-lg flex items-center justify-center border-2 border-dashed border-white/20">
                  <div className="text-center text-white/50">
                    <Users size={48} className="mx-auto mb-2" />
                    <div className="text-sm">Waiting for users...</div>
                  </div>
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

            {/* Debug info */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
              <div>Room: {currentRoom?.name}</div>
              <div>Camera: {localStream ? '✅' : '❌'}</div>
              <div>Video Element: {localVideoRef.current?.srcObject ? '✅' : '❌'}</div>
              <div>Mode: Testing</div>
              {localStream && (
                <button 
                  onClick={() => {
                    if (localVideoRef.current && localStream) {
                      console.log('🔧 Manual video refresh...');
                      localVideoRef.current.srcObject = localStream;
                      localVideoRef.current.play();
                    }
                  }}
                  className="mt-2 px-2 py-1 bg-blue-600 rounded text-xs"
                >
                  Fix Video
                </button>
              )}
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

export default SimpleBellApp;