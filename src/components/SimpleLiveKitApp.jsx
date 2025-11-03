import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Camera, Mic, MicOff, Video, VideoOff, Phone, Users, MessageCircle, 
  Settings, Send, X, PhoneOff, User, RotateCcw, Music, MoreVertical, Youtube
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
import { useAuth } from '../contexts/AuthContext';
import InstallPrompt from './InstallPrompt';
import PassTheAux from './PassTheAux';
import PassTheAuxEnhanced from './PassTheAuxEnhanced';
import FeatureAnnouncement from './FeatureAnnouncement';
import UserProfile from './UserProfile';
import WatchParty from './WatchParty';

const WorkingLiveKitApp = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState(currentUser?.displayName || currentUser?.email?.split('@')[0] || '');
  const [participants, setParticipants] = useState([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front camera, 'environment' for rear camera
  const [showPassTheAux, setShowPassTheAux] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false); // Track if music is playing
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showWatchParty, setShowWatchParty] = useState(false);
  const [isWatchingVideo, setIsWatchingVideo] = useState(false);
  const [watchPartyInvite, setWatchPartyInvite] = useState(null); // Watch Party invitation
  const [showWatchPartyInvite, setShowWatchPartyInvite] = useState(false);
  
  // Pass the Aux invitation state
  const [invitationSent, setInvitationSent] = useState(false);
  const [incomingInvitation, setIncomingInvitation] = useState(null); // { from: participantIdentity, fromName: displayName }
  const [showInvitationToast, setShowInvitationToast] = useState(false);
  
  // Video button dropdown menu state
  const [showVideoMenu, setShowVideoMenu] = useState(false);

  // LiveKit state
  const [room, setRoom] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);

  // Refs
  const localVideoRef = useRef(null);

  // Backend URL - use proxy for API calls
  const BACKEND_URL = window.location.origin;
  const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://belllive-9f7u9uab.livekit.cloud';
  
  console.log('🔧 Frontend Config:');
  console.log('Backend URL:', BACKEND_URL);
  console.log('LiveKit URL:', LIVEKIT_URL);
  console.log('Environment VITE_LIVEKIT_URL:', import.meta.env.VITE_LIVEKIT_URL);

  // Helper function to safely parse participant metadata
  const getParticipantMetadata = (participant) => {
    if (!participant) {
      console.log('❌ No participant provided to getParticipantMetadata');
      return null;
    }
    
    console.log('🔍 Getting metadata for participant:', participant.identity);
    console.log('   Raw metadata:', participant.metadata);
    
    if (!participant.metadata) {
      console.log('❌ No metadata found for', participant.identity);
      return null;
    }
    
    try {
      const parsed = JSON.parse(participant.metadata);
      console.log('✅ Parsed metadata for', participant.identity, ':', parsed);
      if (parsed.photoURL) {
        console.log('📸 Photo URL found:', parsed.photoURL);
      } else {
        console.log('⚠️ No photoURL in metadata for', participant.identity);
      }
      return parsed;
    } catch (e) {
      console.error('❌ Failed to parse metadata for', participant.identity, ':', e);
      console.error('   Raw metadata was:', participant.metadata);
      return null;
    }
  };

  // Update username when currentUser changes and log profile data
  useEffect(() => {
    if (currentUser) {
      if (!username) {
        setUsername(currentUser.displayName || currentUser.email?.split('@')[0] || '');
      }
      // Log current user profile data for debugging
      console.log('👤 Current user profile data:');
      console.log('   Display Name:', currentUser.displayName);
      console.log('   Photo URL:', currentUser.photoURL);
      console.log('   Bio:', currentUser.bio);
      console.log('   Email:', currentUser.email);
    }
  }, [currentUser]);

  // Auto-join room after Spotify authentication
  useEffect(() => {
    if (location.state?.autoJoinRoom && !isConnected) {
      const autoJoinRoomId = location.state.autoJoinRoom;
      console.log('🎵 Auto-joining room after Spotify auth:', autoJoinRoomId);
      setRoomId(autoJoinRoomId);
      // Small delay to ensure UI is ready
      setTimeout(() => {
        connectToRoom();
      }, 500);
    }
  }, [location.state]);

  // Update local participant metadata when currentUser or room changes
  useEffect(() => {
    const updateLocalMetadata = async () => {
      if (room && currentUser && isConnected) {
        const metadata = JSON.stringify({
          photoURL: currentUser.photoURL || null,
          bio: currentUser.bio || null,
        });
        
        console.log('🔄 Updating local participant metadata:', metadata);
        
        try {
          await room.localParticipant.setMetadata(metadata);
          console.log('✅ Local participant metadata updated successfully');
        } catch (error) {
          console.error('❌ Failed to update local participant metadata:', error);
        }
      }
    };

    updateLocalMetadata();
  }, [room, currentUser, isConnected]);

  // Close video menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showVideoMenu) {
        setShowVideoMenu(false);
      }
    };

    if (showVideoMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showVideoMenu]);

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

    // Warn if profile data might not be loaded
    if (!currentUser) {
      console.warn('⚠️ Connecting without user authentication - profile data will not be available');
    } else {
      console.log('✅ Connecting with user profile:');
      console.log('   Photo URL:', currentUser.photoURL || 'Not set');
      console.log('   Bio:', currentUser.bio || 'Not set');
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
          metadata: JSON.stringify({
            photoURL: currentUser?.photoURL || null,
            bio: currentUser?.bio || null,
          }),
        }),
      });

      console.log('📋 Current user photoURL:', currentUser?.photoURL);

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
        console.log('👋 Participant joined:', participant.identity);
        console.log('📋 Participant metadata on join:', participant.metadata);
        const updatedParticipants = Array.from(newRoom.remoteParticipants.values());
        setParticipants(updatedParticipants);
        console.log('👥 Updated participants:', updatedParticipants.length);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('👋 Participant left:', participant.identity);
        const updatedParticipants = Array.from(newRoom.remoteParticipants.values());
        setParticipants(updatedParticipants);
      });

      newRoom.on(RoomEvent.ParticipantMetadataChanged, (metadata, participant) => {
        console.log('📋 Metadata changed for:', participant.identity);
        console.log('📋 New metadata:', metadata);
        // Force re-render to show updated metadata
        const updatedParticipants = Array.from(newRoom.remoteParticipants.values());
        setParticipants([...updatedParticipants]);
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('🎥 Track subscribed:', track.kind, 'from', participant.identity);
        
        // Force re-render to attach new tracks
        const updatedParticipants = Array.from(newRoom.remoteParticipants.values());
        setParticipants([...updatedParticipants]);
        
        // Auto-play audio tracks immediately
        if (track.kind === 'audio') {
          console.log('🔊 Auto-playing audio track from:', participant.identity);
          // Audio tracks are automatically handled by the RemoteParticipantVideo component
        }
      });

      newRoom.on(RoomEvent.TrackMuted, (publication, participant) => {
        console.log('🎥 Track muted:', publication.kind, 'from', participant.identity);
        // Force re-render to show camera-off view with bio
        const updatedParticipants = Array.from(newRoom.remoteParticipants.values());
        setParticipants([...updatedParticipants]);
      });

      newRoom.on(RoomEvent.TrackUnmuted, (publication, participant) => {
        console.log('🎥 Track unmuted:', publication.kind, 'from', participant.identity);
        // Force re-render to show video again
        const updatedParticipants = Array.from(newRoom.remoteParticipants.values());
        setParticipants([...updatedParticipants]);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('👋 Disconnected from room');
        setIsConnected(false);
        setRoom(null);
        setParticipants([]);
      });

      // Listen for data messages (invitations)
      newRoom.on(RoomEvent.DataReceived, (payload, participant) => {
        const decoder = new TextDecoder();
        const message = decoder.decode(payload);
        
        try {
          const data = JSON.parse(message);
          console.log('📨 Data received:', data.type, 'from', participant?.identity);
          
          if (data.type === 'PASS_AUX_INVITE') {
            // Received invitation from another participant
            setIncomingInvitation({
              from: participant.identity,
              fromName: data.fromName || participant.identity
            });
            setShowInvitationToast(true);
          } else if (data.type === 'PASS_AUX_ACCEPT') {
            // Other participant accepted invitation
            console.log('✅ Invitation accepted by', participant.identity);
            setShowPassTheAux(true);
            setInvitationSent(false);
          } else if (data.type === 'PASS_AUX_DECLINE') {
            // Other participant declined invitation
            console.log('❌ Invitation declined by', participant.identity);
            setInvitationSent(false);
          } else if (data.type === 'WATCH_PARTY_INVITE') {
            // Received Watch Party invitation
            console.log('🎬 Watch Party invitation from', participant.identity);
            setWatchPartyInvite({
              from: participant.identity,
              fromName: data.hostName || participant.identity,
              videoUrl: data.videoUrl
            });
            setShowWatchPartyInvite(true);
            // Auto-open watch party modal to show invite
            setShowWatchParty(true);
          }
        } catch (error) {
          console.error('❌ Error parsing data message:', error);
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
  const disconnectFromRoom = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log('📞 Disconnecting from room...');
    
    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
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
    console.log('✅ Disconnected successfully');
  };

  // Toggle video
  const toggleVideo = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log('📹 Toggling video... Current state:', isVideoEnabled);
    console.log('📹 Local video track exists:', !!localVideoTrack);
    
    if (localVideoTrack) {
      if (isVideoEnabled) {
        localVideoTrack.mute();
        console.log('📹 Video muted - camera turning OFF');
      } else {
        localVideoTrack.unmute();
        console.log('📹 Video unmuted - camera turning ON');
      }
      setIsVideoEnabled(!isVideoEnabled);
      console.log('📹 New video state will be:', !isVideoEnabled);
      
      // Haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } else {
      console.error('❌ No local video track available!');
    }
  };

  // Toggle audio
  const toggleAudio = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log('🎤 Toggling audio...');
    if (localAudioTrack) {
      if (isAudioEnabled) {
        localAudioTrack.mute();
        console.log('🎤 Audio muted');
      } else {
        localAudioTrack.unmute();
        console.log('🎤 Audio unmuted');
      }
      setIsAudioEnabled(!isAudioEnabled);
      
      // Haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  // Flip camera (front/back) - mobile only
  const flipCamera = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!room || !localVideoTrack) return;

    try {
      console.log('🔄 Flipping camera...');
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (!isMobile) {
        console.log('Camera flip only available on mobile devices');
        return;
      }

      // Haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(100);
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

  // Send Pass the Aux invitation to all participants
  const sendPassTheAuxInvitation = () => {
    if (!room) return;
    
    const encoder = new TextEncoder();
    const message = JSON.stringify({
      type: 'PASS_AUX_INVITE',
      fromName: username || currentUser?.displayName || 'Someone'
    });
    const data = encoder.encode(message);
    
    // Send to all participants
    room.localParticipant.publishData(data, { reliable: true });
    
    setInvitationSent(true);
    console.log('📤 Pass the Aux invitation sent');
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  // Accept incoming Pass the Aux invitation
  const acceptInvitation = () => {
    if (!room || !incomingInvitation) return;
    
    const encoder = new TextEncoder();
    const message = JSON.stringify({
      type: 'PASS_AUX_ACCEPT'
    });
    const data = encoder.encode(message);
    
    // Send acceptance back
    room.localParticipant.publishData(data, { reliable: true });
    
    // Open Pass the Aux for both users
    setShowPassTheAux(true);
    setIncomingInvitation(null);
    setShowInvitationToast(false);
    
    console.log('✅ Invitation accepted');
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
  };

  // Decline incoming Pass the Aux invitation
  const declineInvitation = () => {
    if (!room || !incomingInvitation) return;
    
    const encoder = new TextEncoder();
    const message = JSON.stringify({
      type: 'PASS_AUX_DECLINE'
    });
    const data = encoder.encode(message);
    
    // Send decline notification
    room.localParticipant.publishData(data, { reliable: true });
    
    setIncomingInvitation(null);
    setShowInvitationToast(false);
    
    console.log('❌ Invitation declined');
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(100);
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
            console.log('🎥 Attaching remote video for:', participant.identity);
            videoTrack.attach(videoRef.current);
          }
        }

        // Handle audio track
        if (audioRef.current) {
          const audioTrack = participant.audioTrackPublications.values().next().value?.track;
          if (audioTrack && audioTrack.kind === 'audio') {
            console.log('🔊 Attaching remote audio for:', participant.identity);
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 relative">
            {/* Pulsing border animation */}
            <div className="absolute inset-0 rounded-lg border-2 border-blue-400/30 animate-pulse"></div>
            
            <div className="text-center text-white relative z-10 px-4 max-w-md">
              <div className="relative inline-block">
                {/* Profile picture with pulsing effect */}
                {(() => {
                  const metadata = getParticipantMetadata(participant);
                  console.log('🖼️ Rendering camera-off view for:', participant.identity);
                  console.log('📋 Metadata:', metadata);
                  console.log('🖼️ Has photoURL:', !!metadata?.photoURL);
                  console.log('📝 Has bio:', !!metadata?.bio);
                  return metadata?.photoURL ? (
                    <div className="relative">
                      <img 
                        src={metadata.photoURL} 
                        alt={participant.identity}
                        className={`${isSmall ? 'w-16 h-16' : 'w-24 h-24 md:w-32 md:h-32'} rounded-full object-cover mx-auto mb-2 border-4 border-blue-400/50 shadow-lg`}
                      />
                      {/* Pulsing ring around profile pic */}
                      <div className="absolute inset-0 rounded-full border-4 border-blue-400/50 animate-ping"></div>
                    </div>
                  ) : (
                    <>
                      <User size={isSmall ? 32 : 64} className="mx-auto mb-2 opacity-70" />
                      {/* Pulsing ring around icon */}
                      <div className="absolute inset-0 rounded-full border-2 border-blue-400/50 animate-ping"></div>
                    </>
                  );
                })()}
              </div>
              {!isSmall && (
                <>
                  <div className="text-lg md:text-xl font-bold mt-2">{participant.identity || participant.name}</div>
                  {/* Show bio if available */}
                  {(() => {
                    const metadata = getParticipantMetadata(participant);
                    if (metadata?.bio) {
                      console.log('✅ Displaying bio for', participant.identity, ':', metadata.bio);
                      return (
                        <div className="text-sm md:text-base text-white/80 mt-2 italic max-w-xs mx-auto">
                          "{metadata.bio}"
                        </div>
                      );
                    } else {
                      console.log('❌ No bio to display for', participant.identity);
                      return null;
                    }
                  })()}
                  <div className="text-xs md:text-sm text-white/60 mt-2 flex items-center justify-center gap-2">
                    <VideoOff size={16} />
                    <span>Camera Off</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        <div className={`absolute ${isSmall ? 'bottom-1 left-1' : 'bottom-3 left-3'} bg-black/70 backdrop-blur-sm text-white ${isSmall ? 'px-2 py-0.5' : 'px-3 py-1'} rounded-full ${isSmall ? 'text-xs' : 'text-sm'} font-medium flex items-center space-x-2`}>
          {/* Profile picture next to name */}
          {(() => {
            const metadata = getParticipantMetadata(participant);
            return metadata?.photoURL ? (
              <img 
                src={metadata.photoURL} 
                alt={participant.identity}
                className={`${isSmall ? 'w-5 h-5' : 'w-6 h-6'} rounded-full object-cover border-2 border-white/30`}
              />
            ) : null;
          })()}
          <span>{isSmall ? (participant.identity || participant.name).split(' ')[0] : (participant.identity || participant.name)}</span>
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
        // Welcome screen
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md w-full z-10 relative">
          {/* Profile button in top-right */}
          <button
            onClick={() => setShowUserProfile(true)}
            className="absolute top-4 right-4 bg-white/20 backdrop-blur-md rounded-full p-2 text-white shadow-lg hover:bg-white/30 transition-all active:scale-95 border border-white/20"
            title="Profile"
          >
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt="Profile" 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <User size={20} />
            )}
          </button>

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
            <p className="text-white/80 text-sm mt-2">
              Hi, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}! 👋
            </p>
          </div>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-2 ml-1">Your Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            
            <div>
              <label className="block text-white/70 text-sm mb-2 ml-1">Room ID</label>
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
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        // Video call interface - Side-by-side layout like screenshot
        <div className="w-full h-screen flex flex-col relative">
          {/* Connection Status Indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs md:text-sm font-medium flex items-center gap-2 shadow-lg border border-white/20">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>Connected{participants.length > 0 ? ` • ${participants.length + 1} in call` : ''}</span>
            </div>
          </div>
          
          {/* Main video area */}
          <div className="flex-1 relative overflow-hidden pb-28 md:pb-24">
            
            {/* Hide videos completely when music is playing or watching video */}
            {!isMusicPlaying && !isWatchingVideo && (
              /* Normal Video Layout */
              <div className={`h-full p-2 md:p-4 flex flex-col md:flex-row md:items-center md:justify-center gap-2 md:gap-4 transition-all duration-500 ${
                showPassTheAux ? 'mt-20 md:mt-24' : ''
              }`}>
                
                {/* Local video */}
                <div className={`relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl md:rounded-2xl overflow-hidden shadow-xl flex-1 transition-all duration-500 ${
                  showPassTheAux ? 'md:max-w-xs max-h-40 md:h-64' : 'md:max-w-md max-h-72 md:h-96'
                }`}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 bg-black/70 backdrop-blur-sm text-white px-2 md:px-3 py-1 md:py-2 rounded-full text-xs md:text-sm font-medium flex items-center space-x-2">
                  {/* Profile picture next to name */}
                  {currentUser?.photoURL && (
                    <img 
                      src={currentUser.photoURL} 
                      alt={username}
                      className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover border-2 border-white/30"
                    />
                  )}
                  <span>{username || 'You'}</span>
                </div>
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center text-white relative px-4 max-w-md">
                      {/* Pulsing border animation */}
                      <div className="absolute inset-0 rounded-xl border-2 border-blue-400/30 animate-pulse"></div>
                      
                      <div className="relative z-10">
                        <div className="relative inline-block">
                          {/* Show profile picture with pulsing effect when camera is off */}
                          {currentUser?.photoURL ? (
                            <div className="relative">
                              <img 
                                src={currentUser.photoURL} 
                                alt={username}
                                className="w-20 h-20 md:w-32 md:h-32 rounded-full object-cover mx-auto mb-2 border-4 border-blue-400/50 shadow-lg"
                              />
                              {/* Pulsing ring around profile pic */}
                              <div className="absolute inset-0 rounded-full border-4 border-blue-400/50 animate-ping"></div>
                            </div>
                          ) : (
                            <>
                              <VideoOff size={40} className="md:w-16 md:h-16 mx-auto mb-2 opacity-70" />
                              {/* Pulsing ring around icon */}
                              <div className="absolute inset-0 rounded-full border-2 border-blue-400/50 animate-ping"></div>
                            </>
                          )}
                        </div>
                        <div className="text-base md:text-lg font-bold mt-2">{username || 'You'}</div>
                        {/* Show bio if available */}
                        {currentUser?.bio && (
                          <div className="text-sm md:text-base text-white/80 mt-2 italic max-w-xs mx-auto">
                            "{currentUser.bio}"
                          </div>
                        )}
                        <div className="text-xs md:text-sm text-white/60 mt-2 flex items-center justify-center gap-2">
                          <VideoOff size={16} />
                          <span>Camera Off</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Remote participants - show first participant or placeholder */}
              {participants.length > 0 ? (
                <div className={`flex-1 rounded-xl md:rounded-2xl overflow-hidden shadow-xl transition-all duration-500 ${
                  showPassTheAux ? 'md:max-w-xs max-h-40 md:h-64' : 'md:max-w-md max-h-72 md:h-96'
                }`}>
                  <RemoteParticipantVideo participant={participants[0]} />
                </div>
              ) : (
                <div className={`relative bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl md:rounded-2xl overflow-hidden shadow-xl flex-1 flex items-center justify-center transition-all duration-500 ${
                  showPassTheAux ? 'md:max-w-xs max-h-40 md:h-64' : 'md:max-w-md max-h-72 md:h-96'
                }`}>
                  <div className="text-center text-white relative">
                    {/* Pulsing border */}
                    <div className="absolute inset-0 rounded-xl border-2 border-purple-400/30 animate-pulse"></div>
                    
                    <div className="relative z-10">
                      <div className="relative inline-block">
                        <User size={40} className="md:w-16 md:h-16 mx-auto mb-2 opacity-50" />
                        {/* Pulsing ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-purple-400/50 animate-ping"></div>
                      </div>
                      <div className="text-sm md:text-base font-medium mt-2">Waiting for others...</div>
                      <div className="text-xs md:text-sm text-white/60">Camera Off</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional participants - show as smaller thumbnails */}
              {participants.length > 1 && (
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
                  {participants.slice(1, 3).map((participant) => (
                    <div key={participant.sid} className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 rounded-lg md:rounded-xl overflow-hidden shadow-lg">
                      <RemoteParticipantVideo participant={participant} isSmall={true} />
                    </div>
                  ))}
                </div>
              )}
              </div>
            )}
            
            {/* Room info */}
            <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-black/70 backdrop-blur-md rounded-lg md:rounded-xl px-2 py-1.5 md:px-4 md:py-2 text-white shadow-lg">
              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="text-xs md:text-sm font-medium">Room {roomId}</div>
                <div className="text-xs text-white/70">•</div>
                <div className="text-xs text-white/70">{participants.length + 1} online</div>
              </div>
            </div>

            {/* User Profile Button */}
            <button
              onClick={() => setShowUserProfile(true)}
              className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/70 backdrop-blur-md rounded-full p-2 md:p-3 text-white shadow-lg hover:bg-black/80 transition-all active:scale-95"
              title="Profile"
            >
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="Profile" 
                  className="w-6 h-6 md:w-8 md:h-8 rounded-full"
                />
              ) : (
                <User size={20} className="md:w-6 md:h-6" />
              )}
            </button>
          </div>

          {/* Pass The Aux Component - Top Center */}
          {showPassTheAux && (
            <div className="fixed top-0 left-0 right-0 pt-safe pt-4 pointer-events-none z-[1001]">
              <div className="max-w-4xl mx-auto px-4 pointer-events-auto">
                <PassTheAuxEnhanced 
                  roomName={roomId} 
                  participants={participants}
                  room={room}
                  onClose={() => setShowPassTheAux(false)}
                  onMusicStateChange={setIsMusicPlaying}
                />
              </div>
            </div>
          )}

          {/* Watch Party Component - Center of screen */}
          {showWatchParty && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1002] flex items-center justify-center p-4">
              <WatchParty 
                room={room}
                participants={participants}
                onClose={() => setShowWatchParty(false)}
                onVideoStateChange={setIsWatchingVideo}
              />
            </div>
          )}

          {/* iOS-style Glassmorphic Controls - Fixed at bottom, always visible */}
          <div className="fixed bottom-0 left-0 right-0 pb-safe pb-6 md:pb-8 pointer-events-none z-50">
            <div className="max-w-6xl mx-auto px-4 pointer-events-auto">
              
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl md:rounded-3xl p-3 md:p-4 shadow-2xl mx-auto w-fit">
                <div className="flex items-center justify-center space-x-3 md:space-x-4">
                  {/* Video button with dropdown menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleVideo(e);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowVideoMenu(!showVideoMenu);
                      }}
                      className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-200 ${
                        isVideoEnabled 
                          ? 'bg-white/20 text-white active:bg-white/30' 
                          : 'bg-red-500/80 text-white active:bg-red-500'
                      } backdrop-blur-sm border border-white/10 active:scale-95 touch-manipulation select-none relative`}
                    >
                      <div className="flex items-center justify-center">
                        {isVideoEnabled ? <Video size={22} className="md:w-6 md:h-6" /> : <VideoOff size={22} className="md:w-6 md:h-6" />}
                      </div>
                      
                      {/* Mobile: Menu icon in corner */}
                      {/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowVideoMenu(!showVideoMenu);
                          }}
                          className="absolute -top-1 -right-1 bg-white/30 backdrop-blur-sm rounded-full p-1 cursor-pointer"
                        >
                          <MoreVertical size={10} />
                        </div>
                      )}
                    </button>
                    
                    {/* Dropdown menu for video options */}
                    {showVideoMenu && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl overflow-hidden min-w-[160px] z-[100]">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            flipCamera(e);
                            setShowVideoMenu(false);
                          }}
                          className="w-full px-4 py-3 text-white hover:bg-white/10 active:bg-white/20 transition-colors flex items-center gap-3 text-sm"
                        >
                          <RotateCcw size={18} />
                          <span>{facingMode === 'user' ? 'Rear Camera' : 'Front Camera'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleAudio(e);
                    }}
                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-200 ${
                      isAudioEnabled 
                        ? 'bg-white/20 text-white active:bg-white/30' 
                        : 'bg-red-500/80 text-white active:bg-red-500'
                    } backdrop-blur-sm border border-white/10 active:scale-95 touch-manipulation select-none`}
                  >
                    {isAudioEnabled ? <Mic size={22} className="md:w-6 md:h-6" /> : <MicOff size={22} className="md:w-6 md:h-6" />}
                  </button>

                  {/* Pass The Aux button - only show when room is connected */}
                  {room && isConnected && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (participants.length === 0) {
                            // No participants, just open Pass the Aux
                            setShowPassTheAux(!showPassTheAux);
                          } else if (!showPassTheAux && !invitationSent) {
                            // Send invitation to join Pass the Aux
                            sendPassTheAuxInvitation();
                          } else {
                            // Toggle Pass the Aux
                            setShowPassTheAux(!showPassTheAux);
                          }
                        }}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-200 ${
                          showPassTheAux 
                            ? 'bg-purple-500/80 text-white active:bg-purple-500' 
                            : invitationSent 
                              ? 'bg-blue-500/80 text-white active:bg-blue-500' 
                              : 'bg-white/20 text-white active:bg-white/30'
                        } backdrop-blur-sm border border-white/10 active:scale-95 touch-manipulation select-none relative`}
                        title={
                          invitationSent 
                            ? 'Invitation sent...' 
                            : participants.length > 0 
                              ? 'Invite to Pass The Aux' 
                              : 'Pass The Aux'
                        }
                      >
                        <Music size={22} className="md:w-6 md:h-6" />
                        {invitationSent && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Watch Party button - only show when room is connected */}
                  {room && isConnected && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowWatchParty(!showWatchParty);
                      }}
                      className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-200 ${
                        showWatchParty 
                          ? 'bg-red-500/80 text-white active:bg-red-500' 
                          : 'bg-white/20 text-white active:bg-white/30'
                      } backdrop-blur-sm border border-white/10 active:scale-95 touch-manipulation select-none`}
                      title="Watch Party"
                    >
                      <Youtube size={22} className="md:w-6 md:h-6" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      disconnectFromRoom(e);
                    }}
                    className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-red-500/80 text-white active:bg-red-500 transition-all duration-200 backdrop-blur-sm border border-white/10 active:scale-95 touch-manipulation select-none"
                  >
                    <PhoneOff size={22} className="md:w-6 md:h-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Install App Prompt */}
      <InstallPrompt />
      
      {/* Feature Announcement */}
      {isConnected && <FeatureAnnouncement />}
      
      {/* User Profile Modal */}
      {showUserProfile && <UserProfile onClose={() => setShowUserProfile(false)} />}
      
      {/* Pass the Aux Invitation Toast */}
      {showInvitationToast && incomingInvitation && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000] animate-slide-down">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl shadow-2xl p-4 md:p-6 max-w-sm mx-4 backdrop-blur-xl border border-white/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Music className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Pass The Aux Invitation</h3>
                <p className="text-white/90 text-sm mb-4">
                  <span className="font-semibold">{incomingInvitation.fromName}</span> wants to share music with you!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={acceptInvitation}
                    className="flex-1 bg-white text-purple-600 font-semibold py-2 px-4 rounded-xl hover:bg-white/90 active:scale-95 transition-all"
                  >
                    Accept
                  </button>
                  <button
                    onClick={declineInvitation}
                    className="flex-1 bg-white/20 text-white font-semibold py-2 px-4 rounded-xl hover:bg-white/30 active:scale-95 transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowInvitationToast(false);
                  setIncomingInvitation(null);
                }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkingLiveKitApp;