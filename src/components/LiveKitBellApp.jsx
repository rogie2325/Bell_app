import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, Mic, MicOff, Video, VideoOff, Phone, Users, MessageCircle, 
  Settings, Monitor, MonitorOff, Send, Menu, X, LogOut, UserPlus, Download,
  Share2, Copy, Link, PhoneOff
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
      // Create new room instance
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });

      // Set up event listeners
      setupRoomListeners(newRoom);

      // Generate access token
      const token = await generateAccessToken(roomId, username);

      // Connect to room
      await newRoom.connect(LIVEKIT_URL, token);

      setRoom(newRoom);
      setLocalParticipant(newRoom.localParticipant);
      setIsConnected(true);
      setConnectionStatus('connected');

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
      setParticipants(prev => new Map(prev.set(participant.sid, participant)));
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
      if (track.kind === Track.Kind.Video) {
        const videoElement = track.attach();
        // You can attach this to a video element in your UI
        console.log('Video track subscribed:', participant.identity);
      } else if (track.kind === Track.Kind.Audio) {
        const audioElement = track.attach();
        audioElement.play();
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
  const enableCamera = async () => {
    try {
      if (localVideoTrack) {
        await localVideoTrack.unmute();
      } else {
        const track = await createLocalVideoTrack();
        await room?.localParticipant.publishTrack(track);
        setLocalVideoTrack(track);
        
        // Attach to local video element
        if (localVideoRef.current) {
          track.attach(localVideoRef.current);
        }
      }
      setIsVideoEnabled(true);
    } catch (error) {
      console.error('Failed to enable camera:', error);
      setError('Failed to enable camera');
    }
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
        const track = await createLocalAudioTrack();
        await room?.localParticipant.publishTrack(track);
        setLocalAudioTrack(track);
      }
      setIsAudioEnabled(true);
    } catch (error) {
      console.error('Failed to enable microphone:', error);
      setError('Failed to enable microphone');
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
  };

  // Render participant video
  const ParticipantVideo = ({ participant, isLocal = false }) => {
    const videoRef = useRef(null);
    const [videoTrack, setVideoTrack] = useState(null);

    useEffect(() => {
      if (isLocal) {
        // Local video is handled separately
        return;
      }

      const updateVideoTrack = () => {
        const track = participant.getTrack(Track.Source.Camera)?.track;
        if (track && track !== videoTrack) {
          setVideoTrack(track);
          if (videoRef.current) {
            track.attach(videoRef.current);
          }
        }
      };

      updateVideoTrack();
      participant.on(ParticipantEvent.TrackSubscribed, updateVideoTrack);
      
      return () => {
        participant.off(ParticipantEvent.TrackSubscribed, updateVideoTrack);
      };
    }, [participant, videoTrack, isLocal]);

    return (
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={isLocal ? localVideoRef : videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
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
          >
            {isVideoEnabled ? (
              <Camera className="w-5 h-5 text-white" />
            ) : (
              <VideoOff className="w-5 h-5 text-white" />
            )}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full ${
              isScreenSharing ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
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