import React from 'react';
import {
  LiveKitRoom,
  VideoConference,
  formatChatMessageLinks,
} from '@livekit/components-react';
import '@livekit/components-styles/styles.css';

const LiveKitVideoConference = ({ 
  roomUrl, 
  token, 
  onDisconnected, 
  userName = 'User' 
}) => {
  if (!roomUrl || !token) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Connecting to room...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="livekit-video-conference w-full h-full">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={roomUrl}
        data-lk-theme="default"
        style={{ height: '100vh' }}
        onDisconnected={onDisconnected}
      >
        <VideoConference 
          chatMessageFormatter={formatChatMessageLinks}
        />
      </LiveKitRoom>
    </div>
  );
};

export default LiveKitVideoConference;