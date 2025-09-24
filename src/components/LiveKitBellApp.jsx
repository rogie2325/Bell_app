import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, Mic, MicOff, Video, VideoOff, Phone, Users, MessageCircle, 
  Settings, Monitor, MonitorOff, Send, Menu, X, LogOut, UserPlus, Download,
  Share2, Copy, Link, PhoneOff, User, RotateCcw
} from 'lucide-react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  LocalParticipant,
  ConnectionState,
  ParticipantEvent,
  TrackPublication,
  createLocalVideoTrack,
  createLocalAudioTrack,
  VideoPresets,
  DataPacket_Kind,
  Encoder,
} from 'livekit-client';

const LiveKitBellApp = () => {
  // UI State
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [participants, setParticipants] = useState(new Map());
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState('user'); // 'user' for front, 'environment' for back
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState('');
  
  // LiveKit specific state
  const [room, setRoom] = useState(null);
  const [localParticipant, setLocalParticipant] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Refs
  const localVideoRef = useRef(null);
  const messagesEndRef = useRef(null);

  // LiveKit server configuration
  const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://your-livekit-server.com';
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Generate access token by calling backend API
  const generateAccessToken = async (roomName, participantName) => {
    console.log('🔑 Generating token for:', { roomName, participantName });
    console.log('🌐 Backend URL:', BACKEND_URL);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName,
          participantName,
        }),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend error response:', errorText);
        throw new Error(`Failed to generate token: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Token generated successfully');
      console.log('🎫 Token type:', typeof data.token);
      console.log('🎫 Token value:', data.token);
      
      // Ensure token is a string
      const token = typeof data.token === 'string' ? data.token : String(data.token);
      console.log('🎫 Final token type:', typeof token);
      
      return token;
    } catch (error) {
      console.error('❌ Token generation error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      throw new Error(`Token generation failed: ${error.message}`);
    }
  };

  // Connect to LiveKit room
  const connectToRoom = async () => {
    if (!roomId || !username) {
      setError('Please enter both room ID and username');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('connecting');
    setError('');

    try {
      // Create new room instance with minimal configuration to avoid crypto errors
      const newRoom = new Room({
        // Disable features that might cause cryptographic issues
        adaptiveStream: false,
        dynacast: false,
        publishDefaults: {
          simulcast: false, // Disable simulcast
        },
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });

      // Set up event listeners
      setupRoomListeners(newRoom);

      // Generate access token
      console.log('🎫 Requesting token for connection...');
      
      // Create unique participant identity to avoid conflicts
      const uniqueIdentity = `${username}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆔 Unique identity:', uniqueIdentity);
      
      const token = await generateAccessToken(roomId, uniqueIdentity);
      console.log('🎫 Token received for connection:', typeof token);
      console.log('🎫 Token length:', token?.length);
      console.log('🎫 Token preview:', token ? token.substring(0, 100) + '...' : 'null/undefined');

      // Validate token format
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token received from server');
      }

      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error(`Invalid JWT format - expected 3 parts, got ${tokenParts.length}`);
      }

      // Connect to room with detailed logging and timeout
      console.log('🔌 Attempting to connect to room...');
      console.log('🔌 LiveKit URL:', LIVEKIT_URL);
      console.log('🔌 Room ID:', roomId);
      console.log('🔌 Username:', username);
      
      // Set a connection timeout
      const connectWithTimeout = Promise.race([
        newRoom.connect(LIVEKIT_URL, token),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
        )
      ]);
      
      await connectWithTimeout;

      setRoom(newRoom);
      setLocalParticipant(newRoom.localParticipant);
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Initialize existing participants safely
      const existingParticipants = new Map();
      if (newRoom.participants && typeof newRoom.participants.forEach === 'function') {
        newRoom.participants.forEach((participant) => {
          existingParticipants.set(participant.sid, participant);
          console.log('Existing participant found:', participant.identity);
        });
      } else if (newRoom.participants && typeof newRoom.participants.values === 'function') {
        // Handle if participants is a Map
        for (const participant of newRoom.participants.values()) {
          existingParticipants.set(participant.sid, participant);
          console.log('Existing participant found:', participant.identity);
        }
      }
      setParticipants(existingParticipants);

      // Enable camera and microphone by default
      await enableCamera();
      await enableMicrophone();

    } catch (error) {
      console.error('Failed to connect to room:', error);
      setError(`Failed to connect: ${error.message}`);
      setConnectionStatus('disconnected');
    } finally {
      setIsConnecting(false);
    }
  };

  // Set up room event listeners
  const setupRoomListeners = (room) => {
    room.on(RoomEvent.Connected, () => {
      console.log('Connected to room');
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from room');
      setIsConnected(false);
      setConnectionStatus('disconnected');
      cleanup();
    });

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('Participant connected:', participant.identity);
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.set(participant.sid, participant);
        return newMap;
      });
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log('Participant disconnected:', participant.identity);
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.delete(participant.sid);
        return newMap;
      });
    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('Track subscribed:', track.kind, 'from', participant.identity);
      if (track.kind === Track.Kind.Video) {
        // Force re-render of participant videos
        setParticipants(prev => new Map(prev));
      } else if (track.kind === Track.Kind.Audio) {
        // Ensure remote audio is played
        const audioElement = track.attach();
        if (audioElement) {
          audioElement.autoplay = true;
          audioElement.play().catch(error => {
            console.log('Audio autoplay failed:', error);
            // Add user interaction requirement notice
          });
        }
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
      track.detach();
      if (track.kind === Track.Kind.Video) {
        // Force re-render of participant videos
        setParticipants(prev => new Map(prev));
      }
    });

    room.on(RoomEvent.DataReceived, (payload, participant) => {
      const message = JSON.parse(new TextDecoder().decode(payload));
      if (message.type === 'chat') {
        setMessages(prev => [...prev, {
          id: Date.now(),
          user: participant?.identity || 'Unknown',
          message: message.content,
          timestamp: new Date()
        }]);
      }
    });

    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log('Connection state changed:', state);
      switch (state) {
        case ConnectionState.Connected:
          setConnectionStatus('connected');
          break;
        case ConnectionState.Connecting:
          setConnectionStatus('connecting');
          break;
        case ConnectionState.Disconnected:
          setConnectionStatus('disconnected');
          break;
      }
    });
  };

  // Enable camera
  const enableCamera = async (facingMode = currentFacingMode) => {
    try {
      // Stop existing video track if any
      if (localVideoTrack) {
        localVideoTrack.stop();
        if (room?.localParticipant) {
          await room.localParticipant.unpublishTrack(localVideoTrack);
        }
        setLocalVideoTrack(null);
      }

      // Create video track with mobile-friendly constraints
      const videoConstraints = {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: { ideal: facingMode } // This enables camera flip on mobile
      };

      const track = await createLocalVideoTrack({
        video: videoConstraints
      });

      if (room?.localParticipant) {
        await room.localParticipant.publishTrack(track);
      }
      
      setLocalVideoTrack(track);
      setCurrentFacingMode(facingMode);
      
      // Attach to local video element
      if (localVideoRef.current) {
        track.attach(localVideoRef.current);
      }
      
      setIsVideoEnabled(true);
    } catch (error) {
      console.error('Failed to enable camera:', error);
      setError(`Failed to enable camera: ${error.message}`);
    }
  };

  // Flip camera (mobile)
  const flipCamera = async () => {
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    console.log('Flipping camera from', currentFacingMode, 'to', newFacingMode);
    await enableCamera(newFacingMode);
  };

  // Disable camera
  const disableCamera = async () => {
    try {
      if (localVideoTrack) {
        await localVideoTrack.mute();
      }
      setIsVideoEnabled(false);
    } catch (error) {
      console.error('Failed to disable camera:', error);
    }
  };

  // Enable microphone
  const enableMicrophone = async () => {
    try {
      if (localAudioTrack) {
        await localAudioTrack.unmute();
      } else {
        // Create audio track with mobile-optimized settings
        const audioConstraints = {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        };

        const track = await createLocalAudioTrack({
          audio: audioConstraints
        });

        if (room?.localParticipant) {
          await room.localParticipant.publishTrack(track);
        }
        
        setLocalAudioTrack(track);
      }
      setIsAudioEnabled(true);
      console.log('✅ Audio enabled successfully');
    } catch (error) {
      console.error('Failed to enable microphone:', error);
      setError(`Failed to enable microphone: ${error.message}`);
    }
  };

  // Disable microphone
  const disableMicrophone = async () => {
    try {
      if (localAudioTrack) {
        await localAudioTrack.mute();
      }
      setIsAudioEnabled(false);
    } catch (error) {
      console.error('Failed to disable microphone:', error);
    }
  };

  // Toggle camera
  const toggleCamera = async () => {
    if (isVideoEnabled) {
      await disableCamera();
    } else {
      await enableCamera();
    }
  };

  // Toggle microphone
  const toggleMicrophone = async () => {
    if (isAudioEnabled) {
      await disableMicrophone();
    } else {
      await enableMicrophone();
    }
  };

  // Start screen sharing
  const startScreenShare = async () => {
    try {
      await room?.localParticipant.setScreenShareEnabled(true);
      setIsScreenSharing(true);
    } catch (error) {
      console.error('Failed to start screen share:', error);
      setError('Failed to start screen sharing');
    }
  };

  // Stop screen sharing
  const stopScreenShare = async () => {
    try {
      await room?.localParticipant.setScreenShareEnabled(false);
      setIsScreenSharing(false);
    } catch (error) {
      console.error('Failed to stop screen share:', error);
    }
  };

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (!newMessage.trim() || !room) return;

    try {
      const message = {
        type: 'chat',
        content: newMessage.trim()
      };
      
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));
      
      await room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
      
      // Add to local messages
      setMessages(prev => [...prev, {
        id: Date.now(),
        user: username,
        message: newMessage.trim(),
        timestamp: new Date(),
        isLocal: true
      }]);
      
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
    }
  };

  // Leave room
  const leaveRoom = async () => {
    if (room) {
      await room.disconnect();
      cleanup();
    }
  };

  // Cleanup function
  const cleanup = () => {
    try {
      // Clean up local tracks
      if (localVideoTrack) {
        localVideoTrack.stop();
        if (localVideoTrack.detach) {
          localVideoTrack.detach();
        }
      }
      if (localAudioTrack) {
        localAudioTrack.stop();
        if (localAudioTrack.detach) {
          localAudioTrack.detach();
        }
      }
      
      // Clean up remote participant tracks
      participants.forEach((participant) => {
        try {
          if (participant.tracks) {
            participant.tracks.forEach((publication) => {
              if (publication.track && publication.track.detach) {
                publication.track.detach();
              }
            });
          }
        } catch (error) {
          console.warn('Error cleaning up participant tracks:', error);
        }
      });
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
    
    setRoom(null);
    setLocalParticipant(null);
    setLocalVideoTrack(null);
    setLocalAudioTrack(null);
    setParticipants(new Map());
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
    setCurrentFacingMode('user');
  };

  // Render participant video
  const ParticipantVideo = ({ participant, isLocal = false }) => {
    const videoRef = useRef(null);
    const [videoTrack, setVideoTrack] = useState(null);

    useEffect(() => {
      if (!participant) return;

      if (isLocal) {
        // For local participant, use the track we manage separately
        if (localVideoTrack && localVideoRef.current) {
          localVideoTrack.attach(localVideoRef.current);
        }
        return;
      }

      // For remote participants
      const updateVideoTrack = () => {
        let track = null;
        
        // Try different ways to get the video track
        if (participant.getTrack && typeof participant.getTrack === 'function') {
          const trackPub = participant.getTrack(Track.Source.Camera);
          track = trackPub?.track;
        } else if (participant.tracks) {
          // Alternative: search through tracks
          for (const [trackSid, publication] of participant.tracks) {
            if (publication.track && publication.track.kind === Track.Kind.Video) {
              track = publication.track;
              break;
            }
          }
        }
        
        console.log('Updating video track for', participant.identity, track ? 'found' : 'not found');
        
        if (track !== videoTrack) {
          // Clean up previous track
          if (videoTrack && videoRef.current) {
            videoTrack.detach(videoRef.current);
          }
          
          setVideoTrack(track);
          
          // Attach new track
          if (track && videoRef.current) {
            track.attach(videoRef.current);
          }
        }
      };

      // Initial track setup
      updateVideoTrack();

      // Listen for track changes
      const handleTrackSubscribed = (track, publication, remoteParticipant) => {
        if (remoteParticipant === participant && track.kind === Track.Kind.Video) {
          updateVideoTrack();
        }
      };

      const handleTrackUnsubscribed = (track, publication, remoteParticipant) => {
        if (remoteParticipant === participant && track.kind === Track.Kind.Video) {
          updateVideoTrack();
        }
      };

      // Add event listeners
      room?.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room?.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      
      return () => {
        // Cleanup
        if (videoTrack && videoRef.current) {
          videoTrack.detach(videoRef.current);
        }
        room?.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        room?.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      };
    }, [participant, room, isLocal, localVideoTrack, videoTrack]);

    const hasVideo = isLocal ? localVideoTrack : videoTrack;

    return (
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        {hasVideo ? (
          <video
            ref={isLocal ? localVideoRef : videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-center">
              <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm opacity-75">No video</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
          {isLocal ? `${participant?.identity || username} (You)` : participant?.identity}
        </div>
      </div>
    );
  };

  // Connection form
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bell</h1>
            <p className="text-gray-600">Connect and collaborate instantly</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your name"
                disabled={isConnecting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter room ID"
                disabled={isConnecting}
              />
            </div>

            <button
              onClick={connectToRoom}
              disabled={isConnecting || !username || !roomId}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isConnecting ? 'Connecting...' : 'Join Room'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="capitalize">{connectionStatus}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main video call interface
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Video className="w-6 h-6 text-indigo-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">{roomId}</h1>
              <p className="text-sm text-gray-400">{participants.size + 1} participants</p>
            </div>
          </div>
          
          <button
            onClick={leaveRoom}
            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
          {/* Local video */}
          <ParticipantVideo participant={localParticipant} isLocal={true} />
          
          {/* Remote participants */}
          {Array.from(participants.values()).map((participant) => (
            <ParticipantVideo key={participant.sid} participant={participant} />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleMicrophone}
            className={`p-3 rounded-full ${
              isAudioEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
            }`}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? (
              <Mic className="w-5 h-5 text-white" />
            ) : (
              <MicOff className="w-5 h-5 text-white" />
            )}
          </button>

          <button
            onClick={toggleCamera}
            className={`p-3 rounded-full ${
              isVideoEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? (
              <Camera className="w-5 h-5 text-white" />
            ) : (
              <VideoOff className="w-5 h-5 text-white" />
            )}
          </button>

          {/* Camera flip button (mobile) */}
          {isVideoEnabled && (
            <button
              onClick={flipCamera}
              className="p-3 rounded-full bg-gray-600 hover:bg-gray-500"
              title="Flip camera"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
          )}

          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full ${
              isScreenSharing ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
            title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-5 h-5 text-white" />
            ) : (
              <Monitor className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Chat sidebar (simplified for this example) */}
      <div className="fixed right-4 bottom-20 w-80 bg-white rounded-lg shadow-xl">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Chat</h3>
        </div>
        <div className="h-64 overflow-y-auto p-4 space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className={`text-sm ${msg.isLocal ? 'text-right' : ''}`}>
              <div className={`inline-block max-w-xs p-2 rounded ${
                msg.isLocal ? 'bg-indigo-500 text-white' : 'bg-gray-200'
              }`}>
                {!msg.isLocal && <div className="font-semibold text-xs mb-1">{msg.user}</div>}
                {msg.message}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 px-3 py-2 border rounded-lg"
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveKitBellApp;