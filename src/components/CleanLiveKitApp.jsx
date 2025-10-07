import React, { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useLocalParticipant,
  useRoomContext,
  Chat,
  ChatToggle
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, Room } from 'livekit-client';
import {
  Phone,
  PhoneOff,
  Users,
} from 'lucide-react';
import InstallPrompt from './InstallPrompt';

// Configuration
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://belllive-9f7u9uab.livekit.cloud';
const SERVER_URL = window.location.origin; // Use current origin (works for both localhost and ngrok)

// Room Component using LiveKit official components following best practices
const VideoRoom = ({ token, onDisconnect }) => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={LIVEKIT_URL}
      onDisconnected={onDisconnect}
      // Don't remount this component - follow LiveKit best practices
      style={{ height: '100vh' }}
      connect={true}
    >
      {/* All components inside LiveKitRoom can use hooks */}
      <VideoLayout chatOpen={chatOpen} setChatOpen={setChatOpen} />
      {/* RoomAudioRenderer handles all audio automatically */}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
};

// Video Layout Component - uses LiveKit hooks for real-time state
const VideoLayout = ({ chatOpen, setChatOpen }) => {
  // Use LiveKit hooks for real-time track state - follows best practices
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Video Layout using LiveKit GridLayout */}
      <div className="flex-1 p-4">
        <GridLayout tracks={tracks} style={{ height: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      </div>

      {/* Chat Panel using LiveKit Chat component */}
      {chatOpen && (
        <div className="h-80 border-t border-white/20 bg-black/20 backdrop-blur-sm">
          <Chat style={{ height: '100%' }} />
        </div>
      )}

      {/* Control Bar using LiveKit ControlBar - handles all media controls */}
      <div className="p-4 bg-black/20 backdrop-blur-sm border-t border-white/20">
        <div className="flex justify-center items-center space-x-4">
          <ControlBar 
            variation="verbose"
            controls={{
              microphone: true,
              camera: true,
              screenShare: true,
              chat: false, // We use custom chat toggle
              leave: true
            }}
          />
          
          {/* Custom Chat Toggle using LiveKit styling */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`p-3 rounded-full transition-colors ${
              chatOpen 
                ? 'bg-blue-600 text-white' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            aria-label="Toggle Chat"
          >
            💬
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const LiveKitBellApp = () => {
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  // Get token and connect
  const connectToRoom = useCallback(async () => {
    if (!roomName.trim() || !userName.trim()) {
      setError('Please enter both room name and your name');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      console.log('🎫 Requesting access token...');
      
      const response = await fetch(`${SERVER_URL}/api/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomName.trim(),
          participantName: userName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const { token: accessToken } = await response.json();
      
      console.log('✅ Access token received');
      setToken(accessToken);

    } catch (error) {
      console.error('❌ Connection failed:', error);
      setError(`Failed to connect: ${error.message}`);
      setIsConnecting(false);
    }
  }, [roomName, userName]);

  // Handle disconnection
  const handleDisconnect = useCallback(() => {
    console.log('🔌 Disconnected from room');
    setToken('');
    setIsConnecting(false);
    setError('');
  }, []);

  // If we have a token, render the video room
  if (token) {
    return (
      <div className="h-screen">
        <VideoRoom token={token} onDisconnect={handleDisconnect} />
      </div>
    );
  }

  // Otherwise render the join form
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <InstallPrompt />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">🔔 Bell Live</h1>
          <p className="text-purple-200">Connect instantly with crystal clear video calls</p>
        </div>

        {/* Connection Form */}
        <div className="max-w-md mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-center mb-4">Join a Room</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Room ID</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && connectToRoom()}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter room ID (e.g. 123)"
                disabled={isConnecting}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && connectToRoom()}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your name"
                disabled={isConnecting}
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={connectToRoom}
              disabled={isConnecting || !roomName.trim() || !userName.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>Join Room</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveKitBellApp;