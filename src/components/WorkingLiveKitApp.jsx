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
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import InstallPrompt from './InstallPrompt';

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

  // Backend URL - always use Vercel for now (since local server not running)
  const BACKEND_URL = 'https://bell-app.vercel.app';
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
  const RemoteParticipantVideo = ({ participant, isSmall = false }) => {
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
      <div className={`relative bg-gradient-to-br from-purple-900/30 to-blue-900/30 ${isSmall ? 'rounded-lg' : 'rounded-xl'} overflow-hidden shadow-lg h-full`}>
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="text-center text-white">
              <User size={isSmall ? 20 : 48} className="mx-auto mb-1 opacity-70" />
              {!isSmall && (
                <>
                  <div className="text-lg font-medium">{participant.name}</div>
                  <div className="text-sm text-white/60">Camera off</div>
                </>
              )}
            </div>
          </div>
        )}
        
        <div className={`absolute ${isSmall ? 'bottom-1 left-1' : 'bottom-3 left-3'} bg-black/70 backdrop-blur-sm text-white ${isSmall ? 'px-2 py-0.5' : 'px-3 py-1'} rounded-full ${isSmall ? 'text-xs' : 'text-sm'} font-medium flex items-center space-x-1`}>
          <span>{isSmall ? participant.name.split(' ')[0] : participant.name}</span>
          {hasAudio && <span className="text-green-400 text-xs">🎤</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Vertical Infinite Scrolling Background - Only show on welcome screen */}
      {!isConnected && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Column 1 - Top to Bottom */}
        <div className="absolute left-[5%] top-0 flex flex-col animate-scroll-down space-y-16">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="space-y-16">
              <div className="bg-black/40 backdrop-blur-sm rounded-full px-8 py-4 text-white font-semibold text-base flex items-center space-x-3 border border-white/10 rotate-12 shadow-lg min-w-max">
                <span>🍿</span>
                <span>Watch Movies</span>
              </div>
              <div className="bg-red-500/30 backdrop-blur-sm rounded-full px-8 py-4 text-white font-semibold text-base flex items-center space-x-3 border border-white/10 -rotate-6 shadow-lg min-w-max">
                <span>🎮</span>
                <span>Play Games</span>
              </div>
              <div className="bg-purple-500/30 backdrop-blur-sm rounded-full px-8 py-4 text-white font-semibold text-base flex items-center space-x-3 border border-white/10 rotate-3 shadow-lg min-w-max">
                <span>👥</span>
                <span>Meet People</span>
              </div>
            </div>
          ))}
        </div>

        {/* Column 2 - Bottom to Top */}
        <div className="absolute right-[5%] bottom-0 flex flex-col-reverse animate-scroll-up space-y-reverse space-y-16">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="space-y-reverse space-y-16">
              <div className="bg-teal-500/30 backdrop-blur-sm rounded-full px-8 py-4 text-white font-semibold text-base flex items-center space-x-3 border border-white/10 -rotate-12 shadow-lg min-w-max">
                <span>🎵</span>
                <span>Play Music</span>
              </div>
              <div className="bg-orange-500/30 backdrop-blur-sm rounded-full px-8 py-4 text-white font-semibold text-base flex items-center space-x-3 border border-white/10 rotate-6 shadow-lg min-w-max">
                <span>🧠</span>
                <span>Learn</span>
              </div>
              <div className="bg-cyan-400/30 backdrop-blur-sm rounded-full px-8 py-4 text-white font-semibold text-base flex items-center space-x-3 border border-white/10 -rotate-3 shadow-lg min-w-max">
                <span>👋</span>
                <span>Join Groups</span>
              </div>
            </div>
          ))}
        </div>

        {/* Column 3 - Top to Bottom (Slower) */}
        <div className="absolute left-[25%] top-0 flex flex-col animate-scroll-down-slow space-y-20">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="space-y-20">
              <div className="bg-blue-500/25 backdrop-blur-sm rounded-full px-6 py-3 text-white/80 font-medium text-sm flex items-center space-x-2 border border-white/10 rotate-6 shadow-md min-w-max">
                <Video size={16} />
                <span>HD Video</span>
              </div>
              <div className="bg-green-500/25 backdrop-blur-sm rounded-full px-6 py-3 text-white/80 font-medium text-sm flex items-center space-x-2 border border-white/10 -rotate-12 shadow-md min-w-max">
                <Mic size={16} />
                <span>Clear Audio</span>
              </div>
            </div>
          ))}
        </div>

        {/* Column 4 - Bottom to Top (Slower) */}
        <div className="absolute right-[25%] bottom-0 flex flex-col-reverse animate-scroll-up-slow space-y-reverse space-y-20">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="space-y-reverse space-y-20">
              <div className="bg-purple-400/25 backdrop-blur-sm rounded-full px-6 py-3 text-white/80 font-medium text-sm flex items-center space-x-2 border border-white/10 rotate-9 shadow-md min-w-max">
                <Users size={16} />
                <span>Connect</span>
              </div>
              <div className="bg-pink-400/25 backdrop-blur-sm rounded-full px-6 py-3 text-white/80 font-medium text-sm flex items-center space-x-2 border border-white/10 -rotate-6 shadow-md min-w-max">
                <Camera size={16} />
                <span>Share</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {!isConnected ? (
        // Login screen
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md w-full z-10 relative">
          <div className="text-center mb-6">
            {/* Lottie Animation */}
            <div className="w-24 h-24 mx-auto mb-4">
              <DotLottieReact
                src="https://lottie.host/382b9b34-6297-4922-b6f1-74ce1bd6a0df/GWEATjpKGc.lottie"
                loop
                autoplay
                className="w-full h-full"
              />
            </div>
            <h1 className="text-3xl font-bold text-white">
              Welcome To Bell
            </h1>
          </div>
          
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
          
          {/* Creator Credit */}
          <div className="mt-6 pt-4 border-t border-white/20">
            <p className="text-center text-white/60 text-sm">
              Created by <span className="text-white/80 font-medium">Elijah Rose</span>
            </p>
          </div>
        </div>
      ) : (
        // Video call interface - compact layout with bottom spacing
        <div className="w-full max-w-6xl mx-auto h-full flex flex-col relative pb-24">
          {/* Main video area with Yubo-style compact layout */}
          <div className="flex-1 relative overflow-hidden">
            {/* Compact video grid - Yubo style with better spacing */}
            <div className="h-full p-4 flex flex-col space-y-4">
              
              {/* Main video section - compact size */}
              <div className="flex-1 max-h-[60vh] min-h-[300px] max-w-4xl mx-auto">
                {participants.length > 0 ? (
                  /* When there are participants, show main participant video larger */
                  <div className="h-full rounded-2xl overflow-hidden shadow-xl">
                    <RemoteParticipantVideo participant={participants[0]} />
                  </div>
                ) : (
                  /* When alone, show local video in main area */
                  <div className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-2xl overflow-hidden shadow-xl h-full">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-medium">
                      You {!isVideoEnabled && '(Video Off)'}
                    </div>
                    {!isVideoEnabled && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="text-center text-white">
                          <VideoOff size={48} className="mx-auto mb-2 opacity-50" />
                          <div className="text-sm">Video Off</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom row - bigger thumbnails */}
              <div className="flex space-x-3 h-32">
                
                {participants.length > 0 && (
                  /* Local video thumbnail when others are present - bigger */
                  <div className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl overflow-hidden shadow-lg w-32 flex-shrink-0">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
                      You
                    </div>
                    {!isVideoEnabled && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <VideoOff size={24} className="text-white opacity-50" />
                      </div>
                    )}
                  </div>
                )}

                {/* Additional participants as medium thumbnails */}
                {participants.slice(1).map((participant, index) => (
                  <div key={participant.sid} className="w-32 flex-shrink-0 h-32 rounded-xl overflow-hidden shadow-lg">
                    <RemoteParticipantVideo participant={participant} isSmall={true} />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Room info */}
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md rounded-xl px-4 py-2 text-white shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="text-sm font-medium">Room {roomId}</div>
                <div className="text-xs text-white/70">•</div>
                <div className="text-xs text-white/70">{participants.length + 1} online</div>
              </div>
            </div>

            {/* Mobile audio enabler */}
            {participants.length > 0 && (
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
                  className="bg-blue-500/80 backdrop-blur-md hover:bg-blue-600/80 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg transition-all"
                >
                  🔊 Enable Audio
                </button>
              </div>
            )}
          </div>

          {/* iOS-style Glassmorphic Controls Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none group/controls"
            onTouchStart={() => {}} // Enable touch events for mobile
          >
            {/* Glassmorphic control panel - always visible with proper spacing */}
            <div id="control-panel" className="absolute bottom-12 left-1/2 transform -translate-x-1/2 pointer-events-auto opacity-100 transition-all duration-300 ease-out">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-2xl transition-all duration-200 ${
                      isVideoEnabled 
                        ? 'bg-white/20 text-white hover:bg-white/30' 
                        : 'bg-red-500/80 text-white hover:bg-red-500'
                    } backdrop-blur-sm border border-white/10 hover:border-white/30 hover:scale-105`}
                  >
                    {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                  </button>
                  
                  <button
                    onClick={toggleAudio}
                    className={`p-4 rounded-2xl transition-all duration-200 ${
                      isAudioEnabled 
                        ? 'bg-white/20 text-white hover:bg-white/30' 
                        : 'bg-red-500/80 text-white hover:bg-red-500'
                    } backdrop-blur-sm border border-white/10 hover:border-white/30 hover:scale-105`}
                  >
                    {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                  </button>

                  {/* Camera flip button - mobile only */}
                  {/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                    <button
                      onClick={flipCamera}
                      className="p-4 rounded-2xl bg-blue-500/80 text-white hover:bg-blue-500 transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/30 hover:scale-105"
                      title={`Switch to ${facingMode === 'user' ? 'rear' : 'front'} camera`}
                    >
                      <RotateCcw size={24} />
                    </button>
                  )}

                  <button
                    onClick={disconnectFromRoom}
                    className="p-4 rounded-2xl bg-red-500/80 text-white hover:bg-red-500 transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/30 hover:scale-105"
                  >
                    <PhoneOff size={24} />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile tap anywhere to show controls */}
            <div className="md:hidden absolute inset-0 bg-transparent pointer-events-auto" 
              onClick={() => {
                const panel = document.getElementById('control-panel');
                if (panel) {
                  const isVisible = panel.classList.contains('opacity-100');
                  if (isVisible) {
                    panel.classList.remove('opacity-100', 'translate-y-0');
                    panel.classList.add('translate-y-4');
                  } else {
                    panel.classList.add('opacity-100', 'translate-y-0');
                    panel.classList.remove('translate-y-4');
                    // Auto-hide after 4 seconds
                    setTimeout(() => {
                      panel.classList.remove('opacity-100', 'translate-y-0');
                      panel.classList.add('translate-y-4');
                    }, 4000);
                  }
                }
              }}
            />
          </div>
        </div>
      )}
      
      {/* Install App Prompt */}
      <InstallPrompt />
    </div>
  );
};

export default WorkingLiveKitApp;