import React, { useState } from 'react';
import { Room } from 'livekit-client';

const SimpleLiveKitApp = () => {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-white text-center mb-6">
          📹 LiveKit Test
        </h1>
        
        {!isConnected ? (
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            
            <button
              onClick={() => {
                if (roomId && username) {
                  alert('LiveKit import working! Ready to connect.');
                  setIsConnected(true);
                }
              }}
              disabled={!roomId || !username}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
            >
              Test LiveKit Connection
            </button>
          </div>
        ) : (
          <div className="text-center text-white">
            <h2 className="text-xl mb-4">✅ LiveKit Import Success!</h2>
            <p className="mb-4">Room: {roomId}</p>
            <p className="mb-4">User: {username}</p>
            <button
              onClick={() => setIsConnected(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleLiveKitApp;