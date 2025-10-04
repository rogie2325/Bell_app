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
  const [isChatOpen, setIsChatOpen] = useState(false); // Chat visibility state
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState('');
  
  // LiveKit specific state
  const [room, setRoom] = useState(null);
  const [localParticipant, setLocalParticipant] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioContext, setAudioContext] = useState(null);

  // Refs
  const localVideoRef = useRef(null);

  // Enable all remote audio (for mobile compatibility)
  const enableAllAudio = async () => {
    console.log('🔊 Manually enabling all audio...');
    
    // Initialize audio context
    const ctx = initializeAudioContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Force play all audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      if (audio.srcObject) {
        console.log('🔊 Playing audio element...');
        audio.muted = false;
        audio.volume = 1.0;
        audio.play().catch(e => console.warn('Audio play failed:', e));
      }
    });
  };
  const messagesEndRef = useRef(null);

  // LiveKit server configuration
  const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://your-livekit-server.com';
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://10.12.2.170:3001';

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Function to initialize and resume audio context
  const initializeAudioContext = async () => {
    if (audioContext && audioContext.state === 'running') {
      console.log('🔊 Audio context already running');
      return;
    }

    try {
      const newAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (newAudioContext.state === 'suspended') {
        console.log('🔊 Resuming suspended audio context');
        await newAudioContext.resume();
      }
      setAudioContext(newAudioContext);
      console.log('🔊 Audio context initialized and running:', newAudioContext.state);
    } catch (error) {
      console.error('🔊 Failed to initialize audio context:', error);
    }
  };

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
      console.log('Room participants object:', newRoom.participants);
      console.log('Room participants type:', typeof newRoom.participants);
      console.log('Room state:', newRoom.state);
      
      // Wait for room to be fully connected
      if (newRoom.state === ConnectionState.Connected) {
        // Get all remote participants
        const remoteParticipants = newRoom.remoteParticipants;
        console.log('Remote participants from room:', remoteParticipants);
        
        if (remoteParticipants && remoteParticipants.size > 0) {
          remoteParticipants.forEach((participant) => {
            existingParticipants.set(participant.sid, participant);
            console.log('Existing remote participant found:', participant.identity, 'SID:', participant.sid);
            console.log('Participant tracks:', participant.trackPublications);
          });
        }
      }
      
      console.log('Total existing participants loaded:', existingParticipants.size);
      setParticipants(existingParticipants);
      
      // Set local participant
      setLocalParticipant(newRoom.localParticipant);
      console.log('Local participant set:', newRoom.localParticipant?.identity);

      // Enable camera and microphone by default with better error handling
      console.log('🎥 Enabling camera and microphone...');
      
      try {
        await enableCamera();
        console.log('✅ Camera enabled successfully');
      } catch (error) {
        console.error('❌ Camera enable failed:', error);
      }
      
      try {
        await enableMicrophone();
        console.log('✅ Microphone enabled successfully');
      } catch (error) {
        console.error('❌ Microphone enable failed:', error);
      }

      // Give some time for tracks to publish and be received by other participants
      setTimeout(() => {
        console.log('🔄 Refreshing participants after media setup');
        setParticipants(prev => new Map(prev));
      }, 1000);

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
      console.log('✅ Connected to room');
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Refresh participants after connection is established
      setTimeout(() => {
        const remoteParticipants = room.remoteParticipants;
        if (remoteParticipants && remoteParticipants.size > 0) {
          const participantMap = new Map();
          remoteParticipants.forEach((participant) => {
            participantMap.set(participant.sid, participant);
            console.log('🔄 Refreshed remote participant:', participant.identity);
          });
          setParticipants(participantMap);
        }
      }, 500);
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log('❌ Disconnected from room');
      setIsConnected(false);
      setConnectionStatus('disconnected');
      cleanup();
    });

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('Participant connected:', participant.identity, 'SID:', participant.sid);
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.set(participant.sid, participant);
        console.log('Updated participants map size:', newMap.size);
        console.log('All participants:', Array.from(newMap.values()).map(p => p.identity));
        return newMap;
      });
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log('Participant disconnected:', participant.identity, 'SID:', participant.sid);
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.delete(participant.sid);
        console.log('Updated participants map size after disconnect:', newMap.size);
        return newMap;
      });
    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log('Track subscribed:', track.kind, 'from', participant.identity);
      console.log('Track details:', {
        trackSid: track.sid,
        source: track.source,
        muted: track.isMuted,
        enabled: track.isEnabled
      });
      
      if (track.kind === Track.Kind.Video) {
        // Force re-render of participant videos
        setParticipants(prev => new Map(prev));
      } else if (track.kind === Track.Kind.Audio) {
        // Ensure remote audio is played immediately
        const audioElement = track.attach();
        if (audioElement) {
          audioElement.autoplay = true;
          audioElement.volume = 1.0;
          audioElement.play().then(() => {
            console.log('Audio started playing for', participant.identity);
          }).catch(error => {
            console.log('Audio autoplay failed for', participant.identity, error);
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

    // Handle track publications (when tracks become available)
    room.on(RoomEvent.TrackPublished, (publication, participant) => {
      console.log('Track published:', publication.kind, 'by', participant.identity);
      // Force update to pick up new tracks
      setParticipants(prev => new Map(prev));
    });

    room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
      console.log('Track unpublished:', publication.kind, 'by', participant.identity);
      setParticipants(prev => new Map(prev));
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
      if (localVideoTrack && facingMode === currentFacingMode) {
        // Just unmute existing track if same facing mode
        await localVideoTrack.unmute();
        console.log('✅ Video track unmuted');
      } else {
        // Only recreate if facing mode changed or no track exists
        if (localVideoTrack) {
          // Clean up existing track when switching cameras
          localVideoTrack.stop();
          if (room?.localParticipant) {
            await room.localParticipant.unpublishTrack(localVideoTrack);
          }
        }

        console.log('🎥 Creating video track with facing mode:', facingMode);
        
        // Create video track with mobile-friendly constraints
        const videoConstraints = {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: { ideal: facingMode }
        };

        const track = await createLocalVideoTrack(videoConstraints);

        if (room?.localParticipant) {
          await room.localParticipant.publishTrack(track);
          console.log('✅ Video track published');
        }
        
        setLocalVideoTrack(track);
        setCurrentFacingMode(facingMode);
        
        // Attach to local video element
        if (localVideoRef.current) {
          track.attach(localVideoRef.current);
        }
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
        // Just unmute existing track - don't recreate
        await localAudioTrack.unmute();
        console.log('✅ Audio track unmuted');
      } else {
        // Only create new track if none exists
        console.log('🎤 Creating new audio track...');
        const audioConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Mobile-friendly settings
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 }
        };

        const track = await createLocalAudioTrack(audioConstraints);

        if (room?.localParticipant) {
          await room.localParticipant.publishTrack(track);
          console.log('✅ Audio track published');
        }
        
        setLocalAudioTrack(track);
      }
      setIsAudioEnabled(true);
    } catch (error) {
      console.error('Failed to enable microphone:', error);
      setError(`Failed to enable microphone: ${error.message}`);
    }
  };

  // Disable microphone - ONLY MUTE, don't destroy
  const disableMicrophone = async () => {
    try {
      if (localAudioTrack) {
        // Only mute the track - keep it alive and published
        await localAudioTrack.mute();
        console.log('✅ Audio track muted (track preserved)');
      }
      setIsAudioEnabled(false);
    } catch (error) {
      console.error('Failed to mute microphone:', error);
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
    setIsChatOpen(false);
  };

  // Render participant video
  const ParticipantVideo = ({ participant, isLocal = false }) => {
    const videoRef = useRef(null);
    const audioRef = useRef(null);
    const [videoTrack, setVideoTrack] = useState(null);
    const [audioTrack, setAudioTrack] = useState(null);

    // Debug logging
    useEffect(() => {
      console.log('ParticipantVideo render:', {
        isLocal,
        participantId: participant?.sid,
        participantIdentity: participant?.identity,
        hasParticipant: !!participant
      });
    }, [participant, isLocal]);

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
        
        console.log('Updating video track for', participant.identity);
        console.log('Participant track publications:', participant.trackPublications);
        
        // Get video track from publications
        if (participant.trackPublications) {
          for (const [trackSid, publication] of participant.trackPublications) {
            console.log('Checking publication:', trackSid, publication.kind, publication.isSubscribed);
            if (publication.kind === Track.Kind.Video && publication.isSubscribed && publication.track) {
              track = publication.track;
              console.log('Found subscribed video track:', trackSid);
              break;
            }
          }
        }
        
        // Alternative: try getTrack method
        if (!track && participant.getTrack && typeof participant.getTrack === 'function') {
          const trackPub = participant.getTrack(Track.Source.Camera);
          if (trackPub && trackPub.track) {
            track = trackPub.track;
            console.log('Found video track via getTrack:', trackPub.trackSid);
          }
        }
        
        console.log('Video track for', participant.identity, track ? 'found' : 'not found');
        
        if (track !== videoTrack) {
          // Clean up previous track
          if (videoTrack && videoRef.current) {
            console.log('Detaching previous video track for', participant.identity);
            videoTrack.detach(videoRef.current);
          }
          
          setVideoTrack(track);
          
          // Attach new track
          if (track && videoRef.current) {
            console.log('Attaching video track for', participant.identity);
            track.attach(videoRef.current);
            
            // Ensure video plays
            const videoEl = videoRef.current;
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.play().catch(e => console.log('Video play failed:', e));
          }
        }
      };

      // Audio track handling for remote participants
      const updateAudioTrack = () => {
        let track = null;
        
        console.log('Updating audio track for', participant.identity);
        console.log('Audio tracks:', Array.from(participant.audioTrackPublications.values()).map(pub => ({
          sid: pub.trackSid,
          subscribed: pub.isSubscribed,
          enabled: pub.isEnabled,
          muted: pub.isMuted,
          hasTrack: !!pub.track
        })));

        // Find first available audio track
        for (const publication of participant.audioTrackPublications.values()) {
          if (publication.isSubscribed && publication.track) {
            track = publication.track;
            break;
          }
        }

        // Detach previous track
        if (audioTrack && audioRef.current) {
          audioTrack.detach(audioRef.current);
        }
        
        setAudioTrack(track);
        
        // Attach new track
        if (track && audioRef.current) {
          console.log('Attaching audio track for', participant.identity);
          track.attach(audioRef.current);
          
          // Browser-compliant audio setup
          const audioEl = audioRef.current;
          audioEl.autoplay = true;
          audioEl.playsInline = true;
          audioEl.muted = false;
          audioEl.volume = 1.0;
          
          // Respect browser autoplay policies
          const playAudio = async () => {
            try {
              await audioEl.play();
              console.log('✅ Remote audio playing for', participant.identity);
            } catch (error) {
              // This is expected on first load without user interaction
              console.log('Audio autoplay blocked (normal):', error.message);
              
              // Add click listener to enable audio on user gesture
              const enableAudioOnClick = async () => {
                try {
                  await audioEl.play();
                  console.log('✅ Audio enabled after user interaction');
                  document.removeEventListener('click', enableAudioOnClick);
                } catch (e) {
                  console.log('Audio play still failed:', e);
                }
              };
              
              document.addEventListener('click', enableAudioOnClick, { once: true });
            }
          };
          
          // Delay to ensure track is fully attached
          setTimeout(playAudio, 100);
        }
      };

      // Initial track setup
      updateVideoTrack();
      updateAudioTrack();

      // Listen for track changes
      const handleTrackSubscribed = (track, publication, remoteParticipant) => {
        if (remoteParticipant === participant) {
          if (track.kind === Track.Kind.Video) {
            console.log('Video track subscribed for', participant.identity);
            updateVideoTrack();
          } else if (track.kind === Track.Kind.Audio) {
            console.log('Audio track subscribed for', participant.identity);
            updateAudioTrack();
          }
        }
      };

      const handleTrackUnsubscribed = (track, publication, remoteParticipant) => {
        if (remoteParticipant === participant) {
          if (track.kind === Track.Kind.Video) {
            console.log('Video track unsubscribed for', participant.identity);
            updateVideoTrack();
          } else if (track.kind === Track.Kind.Audio) {
            console.log('Audio track unsubscribed for', participant.identity);
            updateAudioTrack();
          }
        }
      };

      const handleTrackPublished = (publication, remoteParticipant) => {
        if (remoteParticipant === participant) {
          if (publication.kind === Track.Kind.Video) {
            console.log('Video track published for', participant.identity);
            updateVideoTrack();
          } else if (publication.kind === Track.Kind.Audio) {
            console.log('Audio track published for', participant.identity);
            updateAudioTrack();
          }
        }
      };

      // Add event listeners
      room?.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room?.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room?.on(RoomEvent.TrackPublished, handleTrackPublished);
      
      return () => {
        // Cleanup
        if (videoTrack && videoRef.current) {
          videoTrack.detach(videoRef.current);
        }
        if (audioTrack && audioRef.current) {
          audioTrack.detach(audioRef.current);
        }
        room?.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        room?.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
        room?.off(RoomEvent.TrackPublished, handleTrackPublished);
      };
    }, [participant, room, isLocal, localVideoTrack, videoTrack]);

    const hasVideo = isLocal ? localVideoTrack : videoTrack;

    return (
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden min-h-[200px]">
        {/* Hidden audio element for remote audio playback */}
        {!isLocal && (
          <audio
            ref={audioRef}
            autoPlay
            playsInline
            muted={false}
            volume={1.0}
            style={{ display: 'none' }}
            onLoadedMetadata={() => {
              console.log('Audio metadata loaded for', participant?.identity);
              if (audioRef.current) {
                audioRef.current.play().catch(e => console.log('Auto-play prevented:', e));
              }
            }}
          />
        )}
        
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
              <p className="text-xs opacity-50 mt-1">
                {participant?.identity || 'Unknown'}
              </p>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
          {isLocal ? `${participant?.identity || username} (You)` : participant?.identity}
          {hasVideo && <span className="ml-1 text-green-400">●</span>}
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

          {/* Enable Audio Button - especially useful for mobile */}
          <button
            onClick={enableAllAudio}
            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg"
            title="Enable all audio (fixes mobile audio issues)"
          >
            🔊
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-h-full">
          {/* Debug: Show what we're rendering */}
          <div className="hidden">
            Rendering: Local={localParticipant ? 'yes' : 'no'}, Remote={participants.size}
          </div>
          
          {/* Always show local video first */}
          <ParticipantVideo participant={localParticipant} isLocal={true} />
          
          {/* Remote participants */}
          {Array.from(participants.values()).map((participant, index) => {
            console.log(`Rendering remote participant ${index}:`, participant.identity, participant.sid);
            return (
              <ParticipantVideo key={participant.sid} participant={participant} />
            );
          })}
          
          {/* Debug grid item to show expected layout - only in development */}
          {false && (
            <div className="sm:hidden aspect-video bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
              <div className="text-white text-center text-xs">
                <div>Debug Slot</div>
                <div>Expected: {participants.size + 1} total</div>
                <div>Grid cols: 1 (mobile)</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile debugging - show participant count */}
        <div className="sm:hidden fixed top-20 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded text-sm z-10">
          <div>Total: {participants.size + 1}</div>
          <div>Remote: {participants.size}</div>
          <div>Local: {localParticipant?.identity || username}</div>
          <div className="text-xs opacity-75 mt-1">
            Grid: {participants.size + 1 === 1 ? '1x1' : participants.size + 1 === 2 ? '2x1' : '2x2'}
          </div>
          <div className="text-xs opacity-50">
            Room: {room?.name || 'none'}
          </div>
          <div className="text-xs opacity-50">
            {Array.from(participants.keys()).map(sid => 
              participants.get(sid)?.identity || 'unknown'
            ).join(', ')}
          </div>
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

          {/* Enable Audio button - shows when there are remote participants */}
          {participants.size > 0 && (
            <button
              onClick={enableAllAudio}
              className="p-3 rounded-full bg-green-600 hover:bg-green-500"
              title="Enable audio for all participants (tap if you can't hear anyone)"
            >
              <div className="w-5 h-5 text-white font-bold text-xs flex items-center justify-center">
                🔊
              </div>
            </button>
          )}

          {/* Chat toggle button */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-3 rounded-full ${
              isChatOpen ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
            title={isChatOpen ? 'Close chat' : 'Open chat'}
          >
            <MessageCircle className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Collapsible Chat - Only show when toggled */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:relative md:bg-transparent">
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl md:relative md:max-w-none md:w-80 md:rounded-lg md:right-4 md:bottom-4 md:h-96">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Chat</h3>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-64 md:h-48 overflow-y-auto p-4 space-y-2">
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
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Type a message..."
              />
              <button
                onClick={sendMessage}
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveKitBellApp;