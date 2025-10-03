import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Mic, MicOff, Video, VideoOff, Phone, Users, MessageCircle, 
  Settings, Send, X, PhoneOff, User, RotateCcw, Monitor, MonitorOff, ChevronDown
} from 'lucide-react';
import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteParticipant,
  ConnectionState,
  createLocalVideoTrack,
  createLocalAudioTrack,
  createLocalScreenTracks,
  DataPacket_Kind,
} from 'livekit-client';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import InstallPrompt from './InstallPrompt';

// Remote participant video component (moved out to top-level to avoid nesting/bracing issues)
const RemoteParticipantVideo = ({ participant, isSmall = false }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (participant && videoRef.current) {
      console.log('🔄 RemoteParticipantVideo useEffect triggered for:', participant.name || participant.identity);
      console.log('📊 Video publications:', participant.videoTrackPublications.size);
      console.log('🖥️ User agent:', navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop');
      
      // Clear any existing video first
      if (videoRef.current.srcObject) {
        console.log('🧹 Clearing existing video source');
        videoRef.current.srcObject = null;
      }
      
      // Handle video tracks - prioritize screen share over camera
      const publications = Array.from(participant.videoTrackPublications.values());
      console.log('📋 All video publications:', publications.map(pub => ({
        source: pub.source,
        isSubscribed: pub.isSubscribed,
        isMuted: pub.isMuted,
        hasTrack: !!pub.track
      })));
      
      let videoTrack = null;
      
      // Check for screen share track first
      const screenTrack = publications.find(pub => pub.source === 'screen_share' && pub.isSubscribed && pub.track && !pub.isMuted);
      if (screenTrack?.track) {
        videoTrack = screenTrack.track;
        console.log('🖥️ Attaching screen share for:', participant.name || participant.identity);
      } else {
        // Fall back to regular camera video
        const cameraTrack = publications.find(pub => (pub.source === 'camera' || !pub.source) && pub.isSubscribed && pub.track && !pub.isMuted);
        if (cameraTrack?.track) {
          videoTrack = cameraTrack.track;
          console.log('🎥 Attaching camera video for:', participant.name || participant.identity);
        } else {
          console.log('❌ No suitable video track found for:', participant.name || participant.identity);
        }
      }
      
      if (videoTrack && videoTrack.kind === 'video') {
        try {
          console.log('🔗 Attempting to attach video track...');
          videoTrack.attach(videoRef.current);
          console.log('✅ Successfully attached video for:', participant.name || participant.identity);
          
          // Force video to play
          setTimeout(() => {
            if (videoRef.current && videoRef.current.srcObject) {
              videoRef.current.play().catch(e => console.warn('Video play failed:', e));
            }
          }, 100);
        } catch (error) {
          console.error('❌ Failed to attach video:', error);
        }
      } else {
        console.log('⚠️ No video track to attach for:', participant.name || participant.identity);
      }

      // Handle audio tracks - ENHANCED
      if (audioRef.current) {
        // Clear any existing audio first
        audioRef.current.srcObject = null;
        
        const audioPublications = Array.from(participant.audioTrackPublications.values());
        const audioPublication = audioPublications.find(pub => pub.isSubscribed && pub.track && !pub.isMuted);
        
        if (audioPublication?.track && audioPublication.track.kind === 'audio') {
          try {
            console.log('🔊 Attaching remote audio for:', participant.name || participant.identity);
            audioPublication.track.attach(audioRef.current);
            
            // Enhanced audio playback with multiple attempts
            const attemptPlay = (attempts = 0) => {
              if (audioRef.current && audioRef.current.srcObject && attempts < 3) {
                console.log(`🔊 Attempting to play remote audio (attempt ${attempts + 1})...`);
                audioRef.current.play()
                  .then(() => {
                    console.log('✅ Remote audio playing successfully');
                    // Set volume to ensure it's audible
                    audioRef.current.volume = 1.0;
                  })
                  .catch(e => {
                    console.warn(`⚠️ Remote audio play failed (attempt ${attempts + 1}):`, e);
                    if (attempts < 2) {
                      // Retry after a short delay
                      setTimeout(() => attemptPlay(attempts + 1), 200 * (attempts + 1));
                    }
                  });
              }
            };
            
            // Start playback attempts
            setTimeout(() => attemptPlay(), 100);
          } catch (error) {
            console.error('❌ Failed to attach audio:', error);
          }
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

  // Additional effect to handle track publication changes
  useEffect(() => {
    if (!participant) return;

    const handleTrackPublication = () => {
      console.log('🔄 Track publication changed, re-checking video attachment for:', participant.name);
      // Trigger re-render by forcing component update
      setTimeout(() => {
        if (videoRef.current && participant.videoTrackPublications.size > 0) {
          const publications = Array.from(participant.videoTrackPublications.values());
          const availableTrack = publications.find(pub => pub.isSubscribed && pub.track && !pub.isMuted);
          if (availableTrack && !videoRef.current.srcObject) {
            console.log('🔄 Re-attempting video attachment...');
            try {
              availableTrack.track.attach(videoRef.current);
            } catch (error) {
              console.error('❌ Re-attachment failed:', error);
            }
          }
        }
      }, 100);
    };

    // Listen for track subscription changes
    participant.on('trackSubscribed', handleTrackPublication);
    participant.on('trackUnsubscribed', handleTrackPublication);
    
    return () => {
      participant.off('trackSubscribed', handleTrackPublication);
      participant.off('trackUnsubscribed', handleTrackPublication);
    };
  }, [participant]);

  const hasVideo = participant.videoTrackPublications.size > 0 && 
                   Array.from(participant.videoTrackPublications.values()).some(pub => !pub.isMuted);

  const hasAudio = participant.audioTrackPublications.size > 0 && 
                   Array.from(participant.audioTrackPublications.values()).some(pub => !pub.isMuted);

  const isScreenSharing = Array.from(participant.videoTrackPublications.values())
                         .some(pub => pub.source === 'screen_share' && !pub.isMuted);

  return (
    <div className={`relative bg-gradient-to-br from-purple-900/40 to-blue-900/40 ${isSmall ? 'rounded-lg' : 'rounded-xl'} overflow-hidden shadow-lg h-full w-full`}>
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
          style={{ aspectRatio: 'auto' }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm">
          <div className="text-center text-white">
            {/* Audio spectrum circle for participants */}
            <div className="relative">
              <div className={`${isSmall ? 'w-12 h-12' : 'w-16 h-16'} mx-auto mb-3 rounded-full bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center`}>
                <User size={isSmall ? 16 : 24} className="text-white" />
                {/* Audio spectrum animation - shows when speaking */}
                {hasAudio && (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping opacity-30"></div>
                    <div className="absolute inset-1 rounded-full border border-purple-300 animate-pulse"></div>
                  </>
                )}
              </div>
              <div className={`text-white ${isSmall ? 'text-xs' : 'text-sm'} font-medium`}>{participant.name}</div>
              <div className={`text-white/70 ${isSmall ? 'text-xs' : 'text-sm'} mt-1`}>Camera Off</div>
              {hasAudio && (
                <div className="text-green-400 text-xs mt-1 flex items-center justify-center">
                  🎤 Speaking
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced name tag with better visibility */}
      <div className={`absolute ${isSmall ? 'bottom-2 left-2' : 'bottom-3 left-3'} bg-black/85 backdrop-blur-md text-white ${isSmall ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-lg ${isSmall ? 'text-sm' : 'text-base'} font-semibold flex items-center space-x-2 shadow-xl border border-white/10`}>
        <span className="truncate max-w-24 md:max-w-32">{participant.name}</span>
        <div className="flex items-center space-x-1">
          {hasAudio && <span className="text-green-400 text-sm">🎤</span>}
          {isScreenSharing && <span className="text-blue-400 text-sm">🖥️</span>}
        </div>
      </div>
      
      {/* Connection quality indicator */}
      <div className={`absolute ${isSmall ? 'top-2 right-2' : 'top-3 right-3'}`}>
        <div className={`${isSmall ? 'w-2 h-2' : 'w-3 h-3'} bg-green-400 rounded-full animate-pulse shadow-lg border border-white/20`}></div>
      </div>
    </div>
  );
};

const WorkingLiveKitApp = () => {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [participants, setParticipants] = useState([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notification, setNotification] = useState(null);
  const [shouldRing, setShouldRing] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front camera, 'environment' for rear camera

  // LiveKit state
  const [room, setRoom] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [screenShareTrack, setScreenShareTrack] = useState(null);

  // Refs
  const localVideoRef = useRef(null);
  const localThumbnailRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const messageInputRef = useRef(null);
  const cameraMenuRef = useRef(null);
  // Device detection
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Backend URL - always use Vercel for now (since local server not running)
  const BACKEND_URL = 'https://bell-app.vercel.app';
  const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://belllive-9f7u9uab.livekit.cloud';

  // Effect to manage local video track attachment
  useEffect(() => {
    if (localVideoTrack) {
      // Attach to main video element
      if (localVideoRef.current) {
        localVideoTrack.attach(localVideoRef.current);
      }
      
      // Attach to thumbnail if others are present
      if (participants.length > 0 && localThumbnailRef.current) {
        localVideoTrack.attach(localThumbnailRef.current);
      }
    }

    return () => {
      // Cleanup: detach from elements
      if (localVideoTrack) {
        if (localVideoRef.current) {
          localVideoTrack.detach(localVideoRef.current);
        }
        if (localThumbnailRef.current) {
          localVideoTrack.detach(localThumbnailRef.current);
        }
      }
    };
  }, [localVideoTrack, participants.length]);
  
  console.log('🔧 Frontend Config:');
  console.log('Backend URL:', BACKEND_URL);
  console.log('LiveKit URL:', LIVEKIT_URL);
  console.log('Environment VITE_LIVEKIT_URL:', import.meta.env.VITE_LIVEKIT_URL);

  // Initialize audio context for mobile - ENHANCED
  const initializeAudioContext = () => {
    if (!audioContext) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
        console.log('🔊 Audio context initialized');
        
        // Resume context if suspended (required for mobile)
        if (ctx.state === 'suspended') {
          console.log('🔊 Audio context suspended, attempting to resume...');
          ctx.resume().then(() => {
            console.log('✅ Audio context resumed successfully');
          }).catch(error => {
            console.warn('⚠️ Failed to resume audio context:', error);
          });
        }
        
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
        setMessages([]);
        setIsChatOpen(false);
        setUnreadCount(0);
      });

      // Handle incoming chat messages
      newRoom.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const message = JSON.parse(new TextDecoder().decode(payload));
          if (message.type === 'chat') {
            const newChatMessage = {
              id: Date.now() + Math.random(),
              text: message.text,
              sender: participant?.name || 'Unknown',
              timestamp: new Date(),
              isLocal: false
            };
            
            setMessages(prev => [...prev, newChatMessage]);
            
            // Increment unread count if chat is closed
            if (!isChatOpen) {
              setUnreadCount(prev => prev + 1);
            }
            
            // Trigger bell ring animation for new messages
            setShouldRing(true);
            setTimeout(() => setShouldRing(false), 800);
            
            // Show notification animation when chat is closed
            if (!isChatOpen) {
              setNotification({
                id: Date.now(),
                sender: participant?.name || 'Unknown',
                text: message.text,
                timestamp: new Date()
              });
              
              // Auto-dismiss notification after 4 seconds
              setTimeout(() => {
                setNotification(null);
              }, 4000);
            }
            
            console.log('💬 New message from', participant?.name, ':', message.text);
          }
        } catch (error) {
          console.warn('Failed to parse chat message:', error);
        }
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
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1,
        // Enhanced mobile audio constraints
        ...(isMobile && {
          sampleSize: 16,
          latency: 0.01 // Low latency for real-time communication
        })
      });

      // Publish tracks
      console.log('📡 Publishing video track...');
      await room.localParticipant.publishTrack(videoTrack);
      
      console.log('📡 Publishing audio track...');
      await room.localParticipant.publishTrack(audioTrack);

      // Store tracks
      setLocalVideoTrack(videoTrack);
      setLocalAudioTrack(audioTrack);

      // Attach video to main element
      if (localVideoRef.current) {
        console.log('🔌 Attaching video to main element...');
        videoTrack.attach(localVideoRef.current);
      }

      // Ensure local video shows in thumbnail when others join
      setTimeout(() => {
        const thumbnailVideos = document.querySelectorAll('video[data-participant="local"]');
        thumbnailVideos.forEach(videoEl => {
          if (videoTrack && videoEl && videoEl !== localVideoRef.current) {
            console.log('🔌 Attaching video to thumbnail...');
            videoTrack.attach(videoEl);
          }
        });
      }, 100);

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
    if (screenShareTrack) {
      screenShareTrack.stop();
      setScreenShareTrack(null);
    }

    setIsConnected(false);
    setIsScreenSharing(false);
    setRoom(null);
  };

  // Toggle video - FIXED: Don't unpublish tracks, just mute/unmute
  const toggleVideo = async () => {
    if (!localVideoTrack || !room) return;

    try {
      if (isVideoEnabled) {
        // Turn off video - ONLY mute, don't unpublish
        console.log('🎥 Turning off camera...');
        localVideoTrack.mute();
        console.log('📹 Video muted (track still published)');
      } else {
        // Turn on video - ONLY unmute, track is already published
        console.log('🎥 Turning on camera...');
        localVideoTrack.unmute();
        console.log('📹 Video unmuted (track already published)');
      }
      setIsVideoEnabled(!isVideoEnabled);
      console.log('✅ Video toggle complete:', !isVideoEnabled ? 'ON' : 'OFF');
    } catch (error) {
      console.error('❌ Video toggle failed:', error);
      setError('Failed to toggle video: ' + error.message);
    }
  };

  // Toggle audio - FIXED: Don't unpublish tracks, just mute/unmute
  const toggleAudio = async () => {
    if (!localAudioTrack || !room) return;

    try {
      if (isAudioEnabled) {
        // Turn off audio - ONLY mute, don't unpublish
        console.log('🎤 Turning off microphone...');
        localAudioTrack.mute();
        console.log('🔇 Audio muted (track still published)');
      } else {
        // Turn on audio - ONLY unmute, track is already published
        console.log('🎤 Turning on microphone...');
        localAudioTrack.unmute();
        console.log('🔊 Audio unmuted (track already published)');
      }
      setIsAudioEnabled(!isAudioEnabled);
      console.log('✅ Audio toggle complete:', !isAudioEnabled ? 'ON' : 'OFF');
    } catch (error) {
      console.error('❌ Audio toggle failed:', error);
      setError('Failed to toggle audio: ' + error.message);
    }
  };

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (!room) return;

    try {
      if (isScreenSharing) {
        // Stop screen sharing
        console.log('🖥️ Stopping screen share...');
        if (screenShareTrack) {
          await room.localParticipant.unpublishTrack(screenShareTrack);
          screenShareTrack.stop();
          setScreenShareTrack(null);
        }
        setIsScreenSharing(false);
        console.log('✅ Screen share stopped');
      } else {
        // Start screen sharing
        console.log('🖥️ Starting screen share...');
        
        try {
          const tracks = await createLocalScreenTracks({
            audio: true, // Include system audio if available
            video: true,
          });

          for (const track of tracks) {
            await room.localParticipant.publishTrack(track, {
              name: track.kind === 'video' ? 'screen-video' : 'screen-audio',
              source: track.kind === 'video' ? 'screen_share' : 'screen_share_audio',
            });

            if (track.kind === 'video') {
              setScreenShareTrack(track);
            }
          }

          setIsScreenSharing(true);
          console.log('✅ Screen share started');
        } catch (screenError) {
          console.error('❌ Screen share failed:', screenError);
          if (screenError.name === 'NotAllowedError') {
            setError('Screen sharing permission denied. Please allow screen sharing access.');
          } else if (screenError.name === 'NotSupportedError') {
            setError('Screen sharing is not supported in this browser.');
          } else {
            setError('Failed to start screen sharing: ' + screenError.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Screen share toggle failed:', error);
      setError('Screen sharing failed: ' + error.message);
    }
  };

  // Chat functions
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setUnreadCount(0); // Clear unread count when opening chat
      setNotification(null); // Clear notification when opening chat
      setShouldRing(false); // Stop bell animation when opening chat
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !room) return;

    try {
      // Create message object
      const message = {
        type: 'chat',
        text: newMessage.trim()
      };

      // Send to other participants
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));
      await room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);

      // Add to local messages
      const localMessage = {
        id: Date.now() + Math.random(),
        text: newMessage.trim(),
        sender: username || 'You',
        timestamp: new Date(),
        isLocal: true
      };

      setMessages(prev => [...prev, localMessage]);
      setNewMessage('');

      console.log('💬 Message sent:', message.text);
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message: ' + error.message);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize audio context on first user interaction (required for mobile)
  useEffect(() => {
    const handleUserInteraction = () => {
      const ctx = initializeAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          console.log('✅ Audio context resumed on user interaction');
        }).catch(error => {
          console.warn('⚠️ Failed to resume audio context on interaction:', error);
        });
      }
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    // Add listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Close camera menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cameraMenuRef.current && !cameraMenuRef.current.contains(event.target)) {
        setShowCameraMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

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

  

  // Main WorkingLiveKitApp component return
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
        // Video call interface - responsive layout with proper mobile spacing
        <div className="w-full max-w-6xl mx-auto h-screen flex flex-col relative pb-20 md:pb-24">
          {/* Main video area with Yubo-style compact layout */}
          <div className="flex-1 relative overflow-hidden">
            {/* Equal-sized video grid for all participants */}
            <div className="h-full p-3">
              {/* Uniform video grid - same size boxes for everyone */}
              <div className="h-full">
                {(() => {
                  // All participants including local user - equal sized boxes
                  const allParticipants = [
                    // Local user always first
                    { type: 'local', name: username || 'You' },
                    // Remote participants
                    ...participants.map(p => ({ type: 'remote', participant: p }))
                  ];
                  
                  const totalCount = allParticipants.length;
                  
                  // Grid layout based on total count - mobile-first equal sizing
                  let gridCols = 'grid-cols-1';
                  if (totalCount === 1) gridCols = 'grid-cols-1';
                  else if (totalCount === 2) gridCols = 'grid-cols-1 md:grid-cols-2';
                  else if (totalCount <= 4) gridCols = 'grid-cols-2 md:grid-cols-2';
                  else if (totalCount <= 6) gridCols = 'grid-cols-2 md:grid-cols-3';
                  else if (totalCount <= 9) gridCols = 'grid-cols-3 md:grid-cols-3';
                  else gridCols = 'grid-cols-3 md:grid-cols-4';

                  return (
                    <div className={`grid ${gridCols} gap-2 sm:gap-3 h-full auto-rows-fr`}>
                      {allParticipants.map((item, index) => (
                        <div key={item.type === 'local' ? 'local-user' : item.participant.sid} 
                             className="relative bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-lg overflow-hidden shadow-lg min-h-[120px] sm:min-h-[160px] md:min-h-[180px]">
                          
                          {item.type === 'local' ? (
                            /* Local user video box */
                            <>
                              {isVideoEnabled ? (
                                <video
                                  ref={index === 0 ? localVideoRef : localThumbnailRef}
                                  autoPlay
                                  playsInline
                                  muted
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800/60 to-gray-900/60">
                                  <div className="text-center">
                                    {/* Audio spectrum circle when camera off */}
                                    <div className="relative">
                                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center">
                                        <User size={24} className="text-white" />
                                        {/* Audio spectrum animation */}
                                        <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-30"></div>
                                        <div className="absolute inset-1 rounded-full border border-blue-300 animate-pulse"></div>
                                      </div>
                                      <div className="text-white text-sm font-medium">{item.name}</div>
                                      <div className="text-white/70 text-xs mt-1">Camera Off</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Name tag for local user */}
                              <div className="absolute bottom-2 left-2 bg-black/85 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-sm font-semibold border border-blue-400/30 shadow-xl">
                                <span className="truncate max-w-20">{item.name}</span>
                              </div>
                              
                              {/* Connection indicator */}
                              <div className="absolute top-2 right-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg border border-white/20"></div>
                              </div>
                            </>
                          ) : (
                            /* Remote participant video box */
                            <RemoteParticipantVideo participant={item.participant} isSmall={false} />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {/* Room info - now unobstructed */}
            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md rounded-xl px-4 py-2 text-white shadow-lg z-30">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="text-sm font-medium">Room {roomId}</div>
                <div className="text-xs text-white/70">•</div>
                <div className="text-xs text-white/70">{participants.length + 1} online</div>
              </div>
            </div>


          </div>

          {/* Floating Control Panel - Mobile Optimized */}
          <div className={`fixed bottom-8 left-4 right-4 flex justify-center animate-pulse-subtle ${isChatOpen && isMobile ? 'z-30' : 'z-50'}`}>
            <div className="bg-white/15 backdrop-blur-xl border border-white/30 rounded-2xl p-3 md:p-4 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:-translate-y-1">
              <div className="flex items-center justify-center space-x-2 md:space-x-3 flex-wrap gap-2">
                {/* Camera Button with Dropdown */}
                <div className="relative" ref={cameraMenuRef}>
                  <button
                    onClick={() => {
                      // On desktop, just toggle video. On mobile, show menu for long press or show menu
                      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                      if (isMobile) {
                        setShowCameraMenu(!showCameraMenu);
                      } else {
                        toggleVideo();
                      }
                    }}
                    onContextMenu={(e) => {
                      // Right click or long press on desktop also shows menu
                      e.preventDefault();
                      setShowCameraMenu(!showCameraMenu);
                    }}
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl transition-all duration-200 touch-manipulation flex-shrink-0 flex items-center justify-center relative ${
                      isVideoEnabled 
                        ? 'bg-white/25 text-white hover:bg-white/35' 
                        : 'bg-red-500/90 text-white hover:bg-red-500'
                    } backdrop-blur-sm border border-white/20 hover:border-white/40 active:scale-95 ${showCameraMenu ? 'ring-2 ring-white/40' : ''}`}
                    title={/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Camera options' : (isVideoEnabled ? 'Turn off camera' : 'Turn on camera')}
                  >
                    <div className="flex items-center space-x-1">
                      {isVideoEnabled ? <Video size={18} className="md:w-5 md:h-5" /> : <VideoOff size={18} className="md:w-5 md:h-5" />}
                      {/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                        <ChevronDown size={12} className="md:w-3 md:h-3 opacity-70" />
                      )}
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {showCameraMenu && (
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-xl border border-white/30 rounded-xl p-2 shadow-2xl min-w-max z-50">
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            toggleVideo();
                            setShowCameraMenu(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-medium"
                        >
                          {isVideoEnabled ? <VideoOff size={16} /> : <Video size={16} />}
                          <span>{isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}</span>
                        </button>

                        {/* Camera flip option - mobile only */}
                        {/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                          <button
                            onClick={() => {
                              flipCamera();
                              setShowCameraMenu(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-medium"
                          >
                            <RotateCcw size={16} />
                            <span>Switch to {facingMode === 'user' ? 'rear' : 'front'} camera</span>
                          </button>
                        )}
                      </div>
                      
                      {/* Arrow pointer */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
                    </div>
                  )}
                </div>
                
                {/* Audio toggle for all devices */}
                <button
                  onClick={toggleAudio}
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl transition-all duration-200 touch-manipulation flex-shrink-0 flex items-center justify-center ${
                    isAudioEnabled 
                      ? 'bg-white/25 text-white hover:bg-white/35' 
                      : 'bg-red-500/90 text-white hover:bg-red-500'
                  } backdrop-blur-sm border border-white/20 hover:border-white/40 active:scale-95`}
                  title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {isAudioEnabled ? <Mic size={18} className="md:w-5 md:h-5" /> : <MicOff size={18} className="md:w-5 md:h-5" />}
                </button>

                <button
                  onClick={toggleScreenShare}
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl transition-all duration-200 touch-manipulation flex-shrink-0 flex items-center justify-center ${
                    isScreenSharing 
                      ? 'bg-green-500/90 text-white hover:bg-green-600' 
                      : 'bg-white/25 text-white hover:bg-white/35'
                  } backdrop-blur-sm border border-white/20 hover:border-white/40 active:scale-95`}
                  title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
                >
                  {isScreenSharing ? <MonitorOff size={18} className="md:w-5 md:h-5" /> : <Monitor size={18} className="md:w-5 md:h-5" />}
                </button>

                <button
                  onClick={disconnectFromRoom}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-red-500/90 text-white hover:bg-red-600 transition-all duration-200 touch-manipulation backdrop-blur-sm border border-white/20 hover:border-white/40 active:scale-95 flex-shrink-0 flex items-center justify-center"
                  title="Leave call"
                >
                  <PhoneOff size={18} className="md:w-5 md:h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Floating Chat Window Button */}
          <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50">
            <div className="relative">
              <button
                onClick={toggleChat}
                className={`w-14 h-14 md:w-16 md:h-16 rounded-full transition-all duration-300 touch-manipulation flex items-center justify-center relative shadow-2xl backdrop-blur-xl border-2 ${
                  isChatOpen 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 border-red-400/50 text-white transform rotate-0' 
                    : 'bg-gradient-to-r from-blue-500/90 to-purple-500/90 border-blue-400/50 text-white hover:from-blue-600/90 hover:to-purple-600/90'
                } hover:scale-105 active:scale-95 ${shouldRing ? 'animate-bell-ring' : ''}`}
                title={isChatOpen ? 'Close chat window' : 'Open chat window'}
              >
                <div className={`transition-all duration-300 ${isChatOpen ? 'rotate-90' : 'rotate-0'}`}>
                  {isChatOpen ? (
                    <X size={24} className="md:w-7 md:h-7" />
                  ) : (
                    <MessageCircle size={24} className="md:w-7 md:h-7" />
                  )}
                </div>
                
                {/* Enhanced unread messages badge */}
                {unreadCount > 0 && !isChatOpen && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-bounce shadow-lg border-2 border-white/20">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
                
                {/* Enhanced pulse animation */}
                {unreadCount > 0 && !isChatOpen && (
                  <div className="absolute inset-0 rounded-full bg-red-400/30 animate-ping"></div>
                )}
              </button>
              
              {/* Floating tooltip */}
              {!isChatOpen && (
                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black/90 text-white px-3 py-1.5 rounded-lg text-sm font-medium opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {unreadCount > 0 ? `${unreadCount} new messages` : 'Open chat'}
                  <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-r-0 border-t-4 border-b-4 border-transparent border-l-black/90"></div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Window - Modern window-like experience */}
          <div className={`fixed ${isMobile ? 'inset-4' : 'top-4 right-4 bottom-4 w-80 md:w-96'} bg-black/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl transform transition-all duration-300 ease-out ${isChatOpen ? 'z-[60]' : 'z-40'} ${
            isChatOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95 pointer-events-none'
          }`}>
            <div className="flex flex-col h-full">
              {/* Chat Window Header */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/20 rounded-t-2xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <MessageCircle size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Chat</h3>
                    <span className="text-white/60 text-xs">({participants.length + 1} online)</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Minimize button (desktop only) */}
                  {!isMobile && (
                    <button
                      onClick={toggleChat}
                      className="w-8 h-8 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-colors flex items-center justify-center"
                      title="Minimize chat"
                    >
                      <div className="w-3 h-0.5 bg-current rounded"></div>
                    </button>
                  )}
                  {/* Close button */}
                  <button
                    onClick={toggleChat}
                    className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors flex items-center justify-center"
                    title="Close chat"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={chatMessagesRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/20"
              >
                {messages.length === 0 ? (
                  <div className="text-center text-white/60 mt-8">
                    <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No messages yet.</p>
                    <p className="text-xs mt-1">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex flex-col space-y-1 ${
                        message.isLocal ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className={`max-w-[75%] p-3 rounded-2xl ${
                        message.isLocal 
                          ? 'bg-blue-500 text-white rounded-br-sm' 
                          : 'bg-white/15 text-white rounded-bl-sm'
                      }`}>
                        <p className="text-sm break-words">{message.text}</p>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-white/60">
                        <span className="font-medium">{message.sender}</span>
                        <span>•</span>
                        <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Enhanced Message Input Window */}
              <div className={`p-4 bg-gradient-to-r from-gray-900/50 to-gray-800/50 border-t border-white/20 rounded-b-2xl ${isMobile ? 'pb-20' : ''}`}>
                {/* Typing indicator area */}
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-white/60">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Ready to chat</span>
                    </div>
                    <span className="text-xs text-white/40">{newMessage.length}/500</span>
                  </div>
                </div>
                
                {/* Message input with enhanced styling */}
                <div className="flex space-x-3 items-end">
                  <div className="flex-1 relative">
                    <input
                      ref={messageInputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onFocus={() => {
                        // Auto-scroll to input when focused on mobile
                        if (isMobile) {
                          setTimeout(() => {
                            messageInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 100);
                        }
                      }}
                      placeholder="Type your message..."
                      className="w-full px-4 py-3 bg-white/15 border-2 border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400/50 focus:bg-white/20 transition-all duration-200 resize-none"
                      maxLength={500}
                    />
                    {/* Enhanced focus indicator */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                  </div>
                  
                  {/* Enhanced send button */}
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className={`w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center shadow-lg ${
                      newMessage.trim() 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transform hover:scale-105 active:scale-95' 
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }`}
                    title="Send message"
                  >
                    <Send size={18} className={newMessage.trim() ? 'transform translate-x-0.5' : ''} />
                  </button>
                </div>
                
                {/* Helper text */}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-white/40">Press Enter to send • Shift+Enter for new line</p>
                  {newMessage.trim() && (
                    <button
                      onClick={() => setNewMessage('')}
                      className="text-xs text-white/40 hover:text-white/60 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Message Notification Toast */}
      {notification && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50">
          <div className="bg-gradient-to-r from-blue-500/95 to-purple-500/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl transform animate-slide-in-top">
            {/* Notification header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle size={16} className="text-white" />
                </div>
                <div className="text-white font-semibold text-sm">New Message</div>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
            
            {/* Message content */}
            <div className="space-y-2">
              <div className="text-white/90 font-medium text-sm">{notification.sender}</div>
              <div className="text-white text-sm leading-relaxed break-words">
                {notification.text.length > 60 ? `${notification.text.substring(0, 60)}...` : notification.text}
              </div>
              <div className="text-white/60 text-xs">
                {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2 mt-3">
              <button
                onClick={() => {
                  setNotification(null);
                  setIsChatOpen(true);
                }}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
              >
                Reply
              </button>
              <button
                onClick={() => setNotification(null)}
                className="px-3 py-2 text-white/70 hover:text-white text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
            
            {/* Auto-dismiss progress bar */}
            <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/60 rounded-full animate-shrink-width"></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Install App Prompt */}
      <InstallPrompt />
    </div>
  );
};

export default WorkingLiveKitApp;