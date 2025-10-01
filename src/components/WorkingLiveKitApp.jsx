import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Mic, MicOff, Video, VideoOff, Phone, Users, MessageCircle, 
  Settings, Send, X, PhoneOff, User, RotateCcw
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

const WorkingLiveKitApp = () => {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [participants, setParticipants] = useState([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front camera, 'environment' for rear camera

  // LiveKit state
  const [room, setRoom] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);

  // Refs
  const localVideoRef = useRef(null);

  // Backend URL - detect if we're on localhost or ngrok
  const BACKEND_URL = window.location.hostname === 'localhost' ? 
    'http://localhost:3001' : 
    window.location.origin;
  const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://belllive-9f7u9uab.livekit.cloud';
  
  console.log('🔧 Frontend Config:');
  console.log('Backend URL:', BACKEND_URL);
  console.log('LiveKit URL:', LIVEKIT_URL);
  console.log('Environment VITE_LIVEKIT_URL:', import.meta.env.VITE_LIVEKIT_URL);

  // Initialize audio context for mobile
  const initializeAudioContext = () => {
    if (!audioContext) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
        console.log('🔊 Audio context initialized');
        return ctx;
      } catch (error) {
        console.warn('⚠️ Could not initialize audio context:', error);
        return null;
      }
    }
    return audioContext;
  };

  // Test camera first, then connect to LiveKit
  const connectToRoom = async () => {
    if (!roomId || !username) {
      setError('Please enter room ID and username');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Initialize audio context for mobile audio playback
      const ctx = initializeAudioContext();
      if (ctx && ctx.state === 'suspended') {
        console.log('🔊 Resuming audio context...');
        await ctx.resume();
      }

      // First test basic camera access
      console.log('🧪 Testing camera access...');
      
      // Check mobile requirements
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log('📱 Device type:', isMobile ? 'Mobile' : 'Desktop');
      console.log('🔒 Secure context:', window.isSecureContext);
      console.log('� Protocol:', window.location.protocol);
      
      if (isMobile && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Mobile devices require HTTPS for camera access. Please use ngrok with HTTPS or ensure you\'re on localhost.');
      }

      // Test basic getUserMedia first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available in this browser');
      }

      console.log('🎥 Testing basic camera access...');
      const testStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      
      console.log('✅ Basic camera test passed');
      testStream.getTracks().forEach(track => track.stop()); // Clean up test stream

      console.log('�🎯 Getting token from backend...');
      
      // Get token from your server
      const response = await fetch(`${BACKEND_URL}/api/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomId,
          participantName: username,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const { token } = await response.json();
      console.log('✅ Token received');

      // Create room instance
      const newRoom = new Room();
      
      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log('🎉 Connected to room');
        setIsConnected(true);
        setRoom(newRoom);
        
        // Update participants list
        const remoteParticipants = Array.from(newRoom.remoteParticipants.values());
        setParticipants(remoteParticipants);
        console.log('👥 Initial participants:', remoteParticipants.length);
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('👋 Participant joined:', participant.name);
        const updatedParticipants = Array.from(newRoom.remoteParticipants.values());
        setParticipants(updatedParticipants);
        console.log('👥 Updated participants:', updatedParticipants.length);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('👋 Participant left:', participant.name);
        const updatedParticipants = Array.from(newRoom.remoteParticipants.values());
        setParticipants(updatedParticipants);
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('🎥 Track subscribed:', track.kind, 'from', participant.name);
        
        // Force re-render to attach new tracks
        const updatedParticipants = Array.from(newRoom.remoteParticipants.values());
        setParticipants([...updatedParticipants]);
        
        // Auto-play audio tracks immediately
        if (track.kind === 'audio') {
          console.log('🔊 Auto-playing audio track from:', participant.name);
          // Audio tracks are automatically handled by the RemoteParticipantVideo component
        }
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('👋 Disconnected from room');
        setIsConnected(false);
        setRoom(null);
        setParticipants([]);
      });

      // Connect to the room
      await newRoom.connect(LIVEKIT_URL, token);

      // Enable camera and microphone
      await enableCameraAndMicrophone(newRoom);

    } catch (error) {
      console.error('❌ Connection failed:', error);
      
      let errorMessage = 'Connection failed: ';
      if (error.message.includes('HTTPS') || error.message.includes('secure')) {
        errorMessage = '📱 Mobile camera requires HTTPS. Please use: ngrok http 5173 --domain=your-domain.ngrok-free.app';
      } else if (error.message.includes('getUserMedia')) {
        errorMessage += 'Camera not available. Please check permissions.';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  // Enable camera and microphone with mobile fallback
  const enableCameraAndMicrophone = async (room) => {
    try {
      console.log('🎥 Enabling camera...');
      console.log('📱 User agent:', navigator.userAgent);
      console.log('🔒 Secure context:', window.isSecureContext);
      console.log('📹 getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);

      // Check if we're on mobile and need HTTPS
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isLocalHost = window.location.hostname === 'localhost';
      
      if (isMobile && !window.isSecureContext && !isLocalHost) {
        throw new Error('Camera requires HTTPS on mobile devices. Please use ngrok or localhost.');
      }

      // Mobile-friendly constraints with camera facing mode
      const videoConstraints = isMobile ? {
        facingMode: facingMode,
        width: { ideal: 480, max: 640 },
        height: { ideal: 360, max: 480 },
        frameRate: { ideal: 15, max: 30 }
      } : {
        facingMode: facingMode, 
        width: { ideal: 640 },
        height: { ideal: 480 }
      };

      console.log('� Creating video track with constraints:', videoConstraints);
      const videoTrack = await createLocalVideoTrack(videoConstraints);

      console.log('🎤 Creating audio track...');
      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      });

      // Publish tracks
      console.log('📡 Publishing video track...');
      await room.localParticipant.publishTrack(videoTrack);
      
      console.log('📡 Publishing audio track...');
      await room.localParticipant.publishTrack(audioTrack);

      // Store tracks
      setLocalVideoTrack(videoTrack);
      setLocalAudioTrack(audioTrack);

      // Attach video to element
      if (localVideoRef.current) {
        console.log('🔌 Attaching video to element...');
        videoTrack.attach(localVideoRef.current);
      }

      console.log('✅ Camera and microphone enabled successfully');
    } catch (error) {
      console.error('❌ Media setup failed:', error);
      
      let errorMessage = 'Media setup failed: ';
      if (error.message.includes('getUserMedia')) {
        errorMessage += 'Camera not available. Please check permissions and try using HTTPS.';
      } else if (error.message.includes('NotAllowedError')) {
        errorMessage += 'Camera permission denied. Please allow camera access.';
      } else if (error.message.includes('NotFoundError')) {
        errorMessage += 'No camera found. Please check your camera is connected.';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
    }
  };

  // Disconnect from room
  const disconnectFromRoom = async () => {
    if (room) {
      await room.disconnect();
    }
    
    // Clean up tracks
    if (localVideoTrack) {
      localVideoTrack.stop();
      setLocalVideoTrack(null);
    }
    if (localAudioTrack) {
      localAudioTrack.stop();
      setLocalAudioTrack(null);
    }

    setIsConnected(false);
    setRoom(null);
  };

  // Toggle video
  const toggleVideo = async () => {
    if (localVideoTrack) {
      if (isVideoEnabled) {
        localVideoTrack.mute();
      } else {
        localVideoTrack.unmute();
      }
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Toggle audio
  const toggleAudio = async () => {
    if (localAudioTrack) {
      if (isAudioEnabled) {
        localAudioTrack.mute();
      } else {
        localAudioTrack.unmute();
      }
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Flip camera (front/back) - mobile only
  const flipCamera = async () => {
    if (!room || !localVideoTrack) return;

    try {
      console.log('🔄 Flipping camera...');
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (!isMobile) {
        console.log('Camera flip only available on mobile devices');
        return;
      }

      // Toggle between front ('user') and back ('environment') camera
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
      console.log('Switching from', facingMode, 'to', newFacingMode);

      // Stop current video track
      localVideoTrack.stop();
      
      // Create new video track with flipped camera
      const videoConstraints = {
        facingMode: newFacingMode,
        width: { ideal: 480, max: 640 },
        height: { ideal: 360, max: 480 },
        frameRate: { ideal: 15, max: 30 }
      };

      const newVideoTrack = await createLocalVideoTrack(videoConstraints);

      // Replace the track in the room
      await room.localParticipant.unpublishTrack(localVideoTrack);
      await room.localParticipant.publishTrack(newVideoTrack);

      // Update local video element
      if (localVideoRef.current) {
        newVideoTrack.attach(localVideoRef.current);
      }

      // Update state
      setLocalVideoTrack(newVideoTrack);
      setFacingMode(newFacingMode);

      console.log('✅ Camera flipped successfully to', newFacingMode);
    } catch (error) {
      console.error('❌ Camera flip failed:', error);
      setError('Failed to flip camera: ' + error.message);
    }
  };

  // Remote participant video component
  const RemoteParticipantVideo = ({ participant }) => {
    const videoRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
      if (participant) {
        // Handle video track
        if (videoRef.current) {
          const videoTrack = participant.videoTrackPublications.values().next().value?.track;
          if (videoTrack && videoTrack.kind === 'video') {
            console.log('🎥 Attaching remote video for:', participant.name);
            videoTrack.attach(videoRef.current);
          }
        }

        // Handle audio track
        if (audioRef.current) {
          const audioTrack = participant.audioTrackPublications.values().next().value?.track;
          if (audioTrack && audioTrack.kind === 'audio') {
            console.log('🔊 Attaching remote audio for:', participant.name);
            audioTrack.attach(audioRef.current);
            
            // Force play with user interaction
            setTimeout(() => {
              if (audioRef.current && audioRef.current.srcObject) {
                console.log('🔊 Attempting to play remote audio...');
                audioRef.current.play()
                  .then(() => console.log('✅ Remote audio playing'))
                  .catch(e => console.warn('⚠️ Remote audio play failed:', e));
              }
            }, 100);
          }
        }

        return () => {
          // Cleanup tracks
          participant.videoTrackPublications.forEach((publication) => {
            if (publication.track) {
              publication.track.detach();
            }
          });
          participant.audioTrackPublications.forEach((publication) => {
            if (publication.track) {
              publication.track.detach();
            }
          });
        };
      }
    }, [participant]);

    const hasVideo = participant.videoTrackPublications.size > 0 && 
                     Array.from(participant.videoTrackPublications.values()).some(pub => !pub.isMuted);

    const hasAudio = participant.audioTrackPublications.size > 0 && 
                     Array.from(participant.audioTrackPublications.values()).some(pub => !pub.isMuted);

    return (
      <div className="relative bg-black/30 rounded-lg overflow-hidden">
        {/* Hidden audio element for remote audio playback */}
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          muted={false}
          volume={1.0}
          style={{ display: 'none' }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              console.log('🔊 Audio metadata loaded, attempting play...');
              audioRef.current.play().catch(e => {
                console.warn('⚠️ Audio autoplay failed:', e);
              });
            }
          }}
        />
        
        {hasVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <User size={48} className="mx-auto mb-2" />
              <div className="text-sm">{participant.name}</div>
              <div className="text-xs text-white/70">No video</div>
            </div>
          </div>
        )}
        
        <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm flex items-center space-x-1">
          <span>{participant.name}</span>
          {hasAudio && <span className="text-green-400">🎤</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      {!isConnected ? (
        // Login screen
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-white text-center mb-6">
            📹 LiveKit Bell App
          </h1>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}
          
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
              onClick={connectToRoom}
              disabled={!roomId || !username || isConnecting}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Join Room'}
            </button>
          </div>
        </div>
      ) : (
        // Video call interface
        <div className="w-full h-full flex flex-col">
          {/* Video area */}
          <div className="flex-1 relative bg-black/20 rounded-lg overflow-hidden">
            {/* Video grid */}
            <div className={`grid gap-2 p-4 h-full ${participants.length === 0 ? 'grid-cols-1' : participants.length === 1 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
              
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
              </div>

              {/* Remote participants */}
              {participants.map((participant, index) => (
                <RemoteParticipantVideo key={participant.sid} participant={participant} />
              ))}

              {/* Empty slots for more participants */}
              {Array.from({ length: Math.max(0, 3 - participants.length) }).map((_, index) => (
                <div key={`empty-${index}`} className="bg-black/20 rounded-lg flex items-center justify-center border-2 border-dashed border-white/20">
                  <div className="text-center text-white/50">
                    <Users size={32} className="mx-auto mb-2" />
                    <div className="text-xs">Waiting for user...</div>
                  </div>
                </div>
              ))}

            </div>
            
            {/* Room info */}
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
              <div className="text-sm">Room: {roomId}</div>
              <div className="text-sm">User: {username}</div>
              <div className="text-sm">Participants: {participants.length + 1}</div>
            </div>

            {/* Mobile audio enabler */}
            <div className="absolute top-4 right-4">
              <button
                onClick={async () => {
                  console.log('🔊 Manually enabling audio...');
                  
                  // Resume audio context
                  const ctx = initializeAudioContext();
                  if (ctx && ctx.state === 'suspended') {
                    await ctx.resume();
                  }

                  // Force play all remote audio elements
                  participants.forEach((participant, index) => {
                    const audioElements = document.querySelectorAll('audio');
                    audioElements.forEach(audio => {
                      if (audio.srcObject) {
                        console.log('🔊 Playing audio element...');
                        audio.play().catch(e => console.warn('Audio play failed:', e));
                      }
                    });
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                🔊 Enable Audio
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4 mt-6">
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

            {/* Camera flip button - mobile only */}
            {/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
              <button
                onClick={flipCamera}
                className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                title={`Switch to ${facingMode === 'user' ? 'rear' : 'front'} camera`}
              >
                <RotateCcw size={20} />
              </button>
            )}

            <button
              onClick={disconnectFromRoom}
              className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkingLiveKitApp;