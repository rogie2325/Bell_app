import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Mic, MicOff, Video, VideoOff, Phone, Users, MessageCircle, 
  Settings, Send, X, PhoneOff, User
} from 'lucide-react';
import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteParticipant,
  ConnectionState,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from 'livekit-client';

const SimpleTestApp = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-white text-center mb-6">
          📹 Bell App - Loading Test
        </h1>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
        
        <div className="text-center text-white">
          <p className="mb-4">If you can see this, React is working!</p>
          <p className="text-sm text-white/70">LiveKit imports: {typeof Room !== 'undefined' ? '✅' : '❌'}</p>
          <p className="text-sm text-white/70">Icons: {typeof Video !== 'undefined' ? '✅' : '❌'}</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleTestApp;