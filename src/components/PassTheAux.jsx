import React, { useState, useRef, useEffect } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { Play, Pause, Square, Upload, X, Crown, Heart, ThumbsUp, Flame, Smile, Disc3 } from 'lucide-react';
import './PassTheAux.css';

const PassTheAux = ({ roomName, participants, onClose, room, onMusicStateChange }) => {
    const [showMusicModal, setShowMusicModal] = useState(true);
    const [musicUrl, setMusicUrl] = useState('');
    const [currentSong, setCurrentSong] = useState(null);
    const [auxHolder, setAuxHolder] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(70);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playlist, setPlaylist] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isReceiving, setIsReceiving] = useState(false);
    const [receiveProgress, setReceiveProgress] = useState(0);
    const [showBanner, setShowBanner] = useState(true);
    const [reactions, setReactions] = useState([]); // For emoji reactions
    const [userReaction, setUserReaction] = useState(null); // Current user's reaction
    
    const audioRef = useRef(null);
    const fileInputRef = useRef(null);
    const receivedChunksRef = useRef({});

    // Debug: Log room availability on mount and updates
    useEffect(() => {
        console.log('🔍 PassTheAux Component Debug:');
        console.log('  - Room prop:', room ? 'Available' : 'NOT AVAILABLE');
        console.log('  - Room state:', room?.state);
        console.log('  - Room name:', room?.name);
        console.log('  - Local participant:', room?.localParticipant?.identity);
        
        // Auto-test connection in background when room is ready
        if (room && room.state === 'connected' && room.localParticipant) {
            setTimeout(() => {
                console.log('🔄 Running automatic connection test...');
                testBroadcast();
            }, 2000); // Wait 2 seconds after mounting to ensure everything is ready
        }
    }, [room]);

    // Listen for music sharing events from other users via LiveKit
    useEffect(() => {
        if (!room) {
            console.error('❌ PassTheAux: Room is not available!');
            console.error('This means the room prop was not passed correctly or connection failed');

            return;
        }

        console.log('✅ PassTheAux: Room connected, setting up data listener');
        console.log('✅ Room state:', room.state);
        console.log('✅ Room participants:', room.remoteParticipants?.size || 0);

        const handleDataReceived = (payload, participant) => {
            try {
                console.log('🎵 DATA RECEIVED EVENT FIRED!');
                const decoder = new TextDecoder();
                const message = JSON.parse(decoder.decode(payload));
                
                console.log('======================');
                console.log('RECEIVED DATA FROM:', participant?.identity || 'Unknown');
                console.log('MESSAGE TYPE:', message.type);
                console.log('======================');

                if (message.type === 'PING') {
                    console.log('🏓 PONG! Received test ping from:', message.from);
                }

                if (message.type === 'TEST_PING') {
                    console.log('🧪 TEST BROADCAST RECEIVED!');
                    console.log('  - From:', message.from);
                    console.log('  - Timestamp:', new Date(message.timestamp).toLocaleTimeString());
                    alert(`✅ Test broadcast received from ${message.from}!`);
                }

                // Handle chunked music data
                if (message.type === 'MUSIC_CHUNK') {
                    const { transferId, chunkIndex, totalChunks, data, metadata } = message;
                    
                    console.log('CHUNK INFO:');
                    console.log('  - Chunk:', chunkIndex + 1, '/', totalChunks);
                    console.log('  - Transfer ID:', transferId);
                    console.log('  - Song:', metadata?.name);
                    
                    if (!receivedChunksRef.current[transferId]) {
                        receivedChunksRef.current[transferId] = {
                            chunks: new Array(totalChunks),
                            metadata: metadata,
                            receivedCount: 0
                        };
                        console.log('STARTED NEW TRANSFER:', transferId);
                        setIsReceiving(true);
                    }
                    
                    receivedChunksRef.current[transferId].chunks[chunkIndex] = data;
                    receivedChunksRef.current[transferId].receivedCount++;
                    
                    const progress = Math.round((receivedChunksRef.current[transferId].receivedCount / totalChunks) * 100);
                    setReceiveProgress(progress);
                    console.log('PROGRESS:', progress + '%');
                    
                    // Check if all chunks received
                    if (receivedChunksRef.current[transferId].receivedCount === totalChunks) {
                        console.log('ALL CHUNKS RECEIVED! Assembling...');
                        
                        // Assemble all chunks
                        const fullDataUrl = receivedChunksRef.current[transferId].chunks.join('');
                        
                        const newSong = {
                            url: fullDataUrl,
                            type: 'audio',
                            name: metadata.name,
                            addedBy: participant?.identity || 'Someone'
                        };
                        
                        console.log('✅ SONG ASSEMBLED:', newSong.name);
                        setCurrentSong(newSong);
                        setAuxHolder(participant?.identity || 'Someone');
                        setPlaylist(prev => [...prev, newSong]);
                        setShowBanner(true); // Show banner when song is received
                        
                        // Clean up
                        delete receivedChunksRef.current[transferId];
                        setIsReceiving(false);
                        setReceiveProgress(0);
                        console.log('CLEANED UP TRANSFER DATA');
                        console.log('======================');
                    }
                }

                // Request sync from existing users
                if (message.type === 'REQUEST_SYNC') {
                    console.log('📡 Sync requested by:', participant?.identity);
                    // If I have a current song, broadcast it to the new participant
                    if (currentSong) {
                        console.log('📤 Sending current song to new participant:', currentSong.name);
                        // Wait a bit to ensure the new participant is ready
                        setTimeout(() => {
                            if (currentSong.url.length > 60000) {
                                broadcastMusicDataChunked(currentSong);
                            } else {
                                broadcastMusicData(currentSong);
                            }
                        }, 500);
                    }
                }

                if (message.type === 'MUSIC_SHARE') {
                    console.log('✅ MUSIC SHARE RECEIVED');
                    const newSong = {
                        url: message.url,
                        type: message.musicType,
                        name: message.name,
                        youtubeId: message.youtubeId,
                        addedBy: participant?.identity || 'Someone'
                    };
                    
                    console.log('SONG:', newSong.name);
                    console.log('URL:', newSong.url);
                    setCurrentSong(newSong);
                    setAuxHolder(participant?.identity || 'Someone');
                    setPlaylist(prev => [...prev, newSong]);
                }

                if (message.type === 'PLAYBACK_CONTROL') {
                    console.log('PLAYBACK CONTROL:', message.action);
                    if (message.action === 'play') {
                        setIsPlaying(true);
                        if (audioRef.current) audioRef.current.play();
                    } else if (message.action === 'pause') {
                        setIsPlaying(false);
                        if (audioRef.current) audioRef.current.pause();
                    } else if (message.action === 'stop') {
                        setCurrentSong(null);
                        setAuxHolder(null);
                        setIsPlaying(false);
                    }
                }

                if (message.type === 'SONG_REACTION') {
                    console.log('REACTION RECEIVED:', message.emoji, 'from', message.from);
                    const reactionId = Date.now() + Math.random();
                    setReactions(prev => [...prev, { 
                        id: reactionId, 
                        emoji: message.emoji, 
                        x: Math.random() * 80 + 10,
                        from: message.from
                    }]);
                    
                    // Remove reaction after animation
                    setTimeout(() => {
                        setReactions(prev => prev.filter(r => r.id !== reactionId));
                    }, 3000);
                }
            } catch (error) {
                console.error('ERROR HANDLING RECEIVED DATA:', error);
            }
        };

        room.on('dataReceived', handleDataReceived);
        console.log('✅ dataReceived listener attached to room');

        // Request sync from existing users when joining
        setTimeout(() => {
            const syncRequest = JSON.stringify({ type: 'REQUEST_SYNC' });
            const encoder = new TextEncoder();
            const data = encoder.encode(syncRequest);
            room.localParticipant.publishData(data, { reliable: true });
            console.log('📡 Requested sync from existing participants');
        }, 1000);

        return () => {
            room.off('dataReceived', handleDataReceived);
            console.log('🔌 dataReceived listener removed');
        };
    }, [room]);

    // Broadcast current song when participants join
    useEffect(() => {
        if (!room || !currentSong) return;

        const handleParticipantConnected = (participant) => {
            console.log('👋 New participant joined:', participant.identity);
            console.log('📤 Broadcasting current song to new participant');
            
            // Wait a bit for their data channel to be ready
            setTimeout(async () => {
                // Use chunking for large files
                if (currentSong.url && currentSong.url.length > 60000) {
                    console.log('📦 Sending chunked song to new participant');
                    await broadcastMusicDataChunked(currentSong);
                } else {
                    const message = JSON.stringify({
                        type: 'MUSIC_SHARE',
                        url: currentSong.url,
                        musicType: currentSong.type,
                        name: currentSong.name,
                        youtubeId: currentSong.youtubeId
                    });

                    const encoder = new TextEncoder();
                    const data = encoder.encode(message);
                    room.localParticipant.publishData(data, { reliable: true });
                    console.log('✅ Sent current song to new participant');
                }
                
                // Send current playback state
                if (isPlaying) {
                    setTimeout(() => {
                        broadcastPlaybackControl('play');
                    }, 500);
                }
            }, 1500);
        };

        room.on('participantConnected', handleParticipantConnected);

        return () => {
            room.off('participantConnected', handleParticipantConnected);
        };
    }, [room, currentSong, isPlaying]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume / 100;
        }
    }, [volume]);

    useEffect(() => {
        if (audioRef.current && currentSong && currentSong.type === 'audio') {
            audioRef.current.load();
            // Don't auto-play - wait for explicit play signal
            console.log('🎵 Audio loaded:', currentSong.name);
        }
    }, [currentSong]);

    // Notify parent component when music state changes
    useEffect(() => {
        if (onMusicStateChange) {
            onMusicStateChange(!!(currentSong && isPlaying));
        }
    }, [currentSong, isPlaying]); // Removed onMusicStateChange from dependencies

    useEffect(() => {
        if (audioRef.current) {
            const audio = audioRef.current;
            
            const updateTime = () => {
                if (audio && !isNaN(audio.currentTime)) {
                    setCurrentTime(audio.currentTime);
                }
            };
            
            const updateDuration = () => {
                if (audio && !isNaN(audio.duration)) {
                    setDuration(audio.duration);
                }
            };
            
            const handleEnded = () => {
                setIsPlaying(false);
                playNextSong();
            };

            audio.addEventListener('timeupdate', updateTime);
            audio.addEventListener('loadedmetadata', updateDuration);
            audio.addEventListener('durationchange', updateDuration);
            audio.addEventListener('ended', handleEnded);
            
            // Update duration immediately if already loaded
            if (audio.duration && !isNaN(audio.duration)) {
                setDuration(audio.duration);
            }

            return () => {
                if (audio) {
                    audio.removeEventListener('timeupdate', updateTime);
                    audio.removeEventListener('loadedmetadata', updateDuration);
                    audio.removeEventListener('durationchange', updateDuration);
                    audio.removeEventListener('ended', handleEnded);
                }
            };
        }
    }, [currentSong]); // Re-attach listeners when song changes

    const handleCloseModal = () => {
        setShowMusicModal(false);
        // Don't close the entire component, just the modal
    };

    // Broadcast music data to all participants
    const broadcastMusicData = (songData) => {
        if (!room) {
            console.warn('Room not available for broadcasting');
            return;
        }

        // For large audio files, use chunking
        if (songData.type === 'audio' && songData.url.length > 60000) {
            return broadcastMusicDataChunked(songData);
        }

        // Send small data (YouTube URLs) directly
        const message = JSON.stringify({
            type: 'MUSIC_SHARE',
            url: songData.url,
            musicType: songData.type,
            name: songData.name,
            youtubeId: songData.youtubeId
        });

        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        room.localParticipant.publishData(data, { reliable: true });
        console.log('✅ Broadcasted music URL:', songData.name);
    };

    // Broadcast large audio files in chunks (max 60KB per chunk)
    const broadcastMusicDataChunked = async (songData) => {
        if (!room) {
            console.error('❌ CANNOT BROADCAST: Room is not available!');
            alert('Room connection lost. Please try rejoining.');
            return;
        }

        if (!room.localParticipant) {
            console.error('❌ CANNOT BROADCAST: Local participant not available!');
            alert('Connection issue detected. Please refresh and rejoin.');
            return;
        }

        console.log('✅ Room check passed');
        console.log('  - Room state:', room.state);
        console.log('  - Local participant:', room.localParticipant.identity);
        console.log('  - Room name:', room.name);

        const CHUNK_SIZE = 60000; // 60KB chunks (safe limit)
        const dataUrl = songData.url;
        const transferId = `transfer_${Date.now()}_${Math.random()}`;
        
        // Calculate chunks
        const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);
        
        console.log('======================');
        console.log('SENDING MUSIC FILE');
        console.log('Song:', songData.name);
        console.log('Total size:', dataUrl.length, 'bytes');
        console.log('Chunks:', totalChunks);
        console.log('Transfer ID:', transferId);
        console.log('======================');
        
        setIsUploading(true);
        
        // Send chunks
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, dataUrl.length);
            const chunk = dataUrl.substring(start, end);
            
            const message = JSON.stringify({
                type: 'MUSIC_CHUNK',
                transferId: transferId,
                chunkIndex: i,
                totalChunks: totalChunks,
                data: chunk,
                metadata: {
                    name: songData.name,
                    type: songData.type,
                    addedBy: 'You'
                }
            });

            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            
            try {
                if (!room.localParticipant) {
                    throw new Error('Local participant lost during chunk sending');
                }
                
                await room.localParticipant.publishData(data, { reliable: true });
                const progress = Math.round(((i + 1) / totalChunks) * 100);
                setUploadProgress(progress);
                console.log('SENT CHUNK', i + 1, '/', totalChunks, '(' + progress + '%) - Chunk size:', chunk.length, 'bytes');
                
                // Small delay between chunks to avoid overwhelming the connection
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                console.error('❌ ERROR SENDING CHUNK', i, ':', error);
                console.error('Error details:', {
                    message: error.message,
                    roomState: room?.state,
                    hasLocalParticipant: !!room?.localParticipant
                });
                alert(`Failed to send chunk ${i + 1}/${totalChunks}. Error: ${error.message}`);
                setIsUploading(false);
                setUploadProgress(0);
                return; // Stop sending if there's an error
            }
        }
        
        setIsUploading(false);
        setUploadProgress(0);
        console.log('======================');
        console.log('ALL CHUNKS SENT!');
        console.log('======================');
        
        // Don't auto-play - wait for manual play button press
        console.log('🎵 All chunks delivered - ready to play (manual start)');
    };

    // Broadcast playback control
    const broadcastPlaybackControl = (action) => {
        if (!room) {
            console.error('❌ Cannot broadcast playback control - no room');
            return;
        }

        if (!room.localParticipant) {
            console.error('❌ Cannot broadcast playback control - no local participant');
            return;
        }

        const message = JSON.stringify({
            type: 'PLAYBACK_CONTROL',
            action: action // 'play', 'pause', 'stop'
        });

        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        try {
            room.localParticipant.publishData(data, { reliable: true });
            console.log('✅ Broadcasted playback control:', action);
        } catch (error) {
            console.error('❌ Failed to broadcast playback control:', error);
        }
    };

    // Test function to verify data channel works (runs silently in background)
    const testBroadcast = () => {
        console.log('🧪 AUTO-TEST: Starting connection diagnostic...');
        console.log('  - Room exists:', !!room);
        console.log('  - Room state:', room?.state);
        console.log('  - Local participant exists:', !!room?.localParticipant);
        console.log('  - Local participant identity:', room?.localParticipant?.identity);
        console.log('  - Can publish data:', room?.localParticipant?.canPublishData);
        console.log('  - Permissions:', room?.localParticipant?.permissions);
        
        if (!room || !room.localParticipant) {
            console.error('❌ AUTO-TEST FAILED: Room or local participant not available');
            return;
        }

        try {
            const testMessage = JSON.stringify({
                type: 'TEST_PING',
                from: room.localParticipant.identity,
                timestamp: Date.now()
            });
            
            console.log('📤 Test message:', testMessage);
            
            const encoder = new TextEncoder();
            const data = encoder.encode(testMessage);
            
            console.log('📊 Encoded data size:', data.byteLength, 'bytes');
            console.log('🚀 Calling publishData...');
            
            room.localParticipant.publishData(data, { reliable: true });
            
            console.log('✅ TEST BROADCAST SENT SUCCESSFULLY (no errors thrown)');
            alert('Test broadcast sent! Check other users to see if they received it.\n\nCheck console for details.');
        } catch (error) {
            console.error('❌ TEST BROADCAST FAILED:', error);
            alert(`Test broadcast failed: ${error.message}`);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        console.log('📁 File selected:', file?.name, file?.type);
        console.log('📱 Device type:', /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop');
        
        if (!room) {
            console.error('❌ Room not connected! Cannot upload file.');
            alert('Please wait for the room connection before uploading.');
            return;
        }

        // Check room state
        console.log('🔍 Room state check:');
        console.log('  - Room.state:', room.state);
        console.log('  - Room.name:', room.name);
        console.log('  - Local participant:', room.localParticipant?.identity);
        console.log('  - Local participant SID:', room.localParticipant?.sid);
        console.log('  - Can publish data:', room.localParticipant?.canPublishData);
        console.log('  - Remote participants:', room.remoteParticipants?.size);
        
        if (room.state !== 'connected') {
            console.error('❌ Room is not in connected state! Current state:', room.state);
            alert('Room is not fully connected. Please wait a moment and try again.');
            return;
        }

        if (!room.localParticipant) {
            console.error('❌ Local participant not available!');
            alert('Connection not ready. Please refresh and try again.');
            return;
        }
        
        if (!file || !file.type.startsWith('audio/')) {
            console.log('Invalid file type:', file?.type);
            alert('Please select an audio file (MP3, WAV, M4A, etc.)');
            return;
        }

        console.log('✅ Room is connected, converting file to base64...');
        setIsUploading(true);
        setUploadProgress(0);

        // Convert file to base64 data URL
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            const dataUrl = event.target.result;
            
            const newSong = {
                url: dataUrl, // Base64 data URL
                type: 'audio',
                name: file.name,
                addedBy: 'You'
            };
            
            console.log('✅ File converted to base64');
            console.log('📊 File size:', dataUrl.length, 'bytes');
            
            const newPlaylist = [...playlist, newSong];
            setPlaylist(newPlaylist);
            
            console.log('Setting current song:', newSong.name);
            setCurrentSong(newSong);
            setAuxHolder('You');
            setShowBanner(true); // Show banner for uploader
            
            // On mobile, wait a moment to ensure connection is stable
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            if (isMobile) {
                console.log('📱 Mobile device detected - waiting 1 second before broadcast');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Broadcast using chunking (for large files)
            console.log('🚀 Starting broadcast...');
            await broadcastMusicDataChunked(newSong);
            
            setIsUploading(false);
            setUploadProgress(0);
            handleCloseModal();
        };
        
        reader.onerror = (error) => {
            console.error('❌ File read error:', error);
            alert('Failed to read file');
            setIsUploading(false);
            setUploadProgress(0);
        };
        
        reader.readAsDataURL(file);
    };

    const handleURLSubmit = (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        
        console.log('URL submitted:', musicUrl);
        
        if (musicUrl) {
            const youtubeId = extractYouTubeId(musicUrl);
            console.log('YouTube ID:', youtubeId);
            
            if (youtubeId) {
                const newSong = {
                    url: musicUrl,
                    youtubeId: youtubeId,
                    type: 'youtube',
                    name: 'YouTube Video',
                    addedBy: 'You'
                };
                
                console.log('New YouTube song:', newSong);
                
                const newPlaylist = [...playlist, newSong];
                setPlaylist(newPlaylist);
                
                if (!currentSong) {
                    console.log('Setting current song:', newSong);
                    setCurrentSong(newSong);
                    setAuxHolder('You');
                    
                    // Broadcast to all participants
                    broadcastMusicData(newSong);
                }
                
                setMusicUrl('');
                handleCloseModal();
            } else {
                alert('Invalid YouTube URL. Please paste a valid YouTube link.');
            }
        }
    };

    const extractYouTubeId = (url) => {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    };

    const togglePlayPause = () => {
        if (audioRef.current && currentSong && currentSong.type === 'audio') {
            if (isPlaying) {
                audioRef.current.pause();
                broadcastPlaybackControl('pause');
            } else {
                audioRef.current.play();
                broadcastPlaybackControl('play');
            }
            setIsPlaying(!isPlaying);
        }
    };

    const playNextSong = () => {
        const currentIndex = playlist.findIndex(song => song === currentSong);
        if (currentIndex < playlist.length - 1) {
            setCurrentSong(playlist[currentIndex + 1]);
            setIsPlaying(true);
        }
    };

    const playPreviousSong = () => {
        const currentIndex = playlist.findIndex(song => song === currentSong);
        if (currentIndex > 0) {
            setCurrentSong(playlist[currentIndex - 1]);
            setIsPlaying(true);
        }
    };

    const formatTime = (time) => {
        if (!time || isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e) => {
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    const takeAuxControl = () => {
        setAuxHolder('You');
        handleCloseModal();
    };

    // Reaction system
    const sendReaction = (emoji) => {
        if (!room) return;

        // Set user's reaction
        setUserReaction(emoji);

        // Broadcast reaction to other users
        const message = JSON.stringify({
            type: 'SONG_REACTION',
            emoji: emoji,
            from: room.localParticipant.identity
        });

        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        room.localParticipant.publishData(data, { reliable: true });

        // Add to reactions list with animation
        const reactionId = Date.now();
        setReactions(prev => [...prev, { id: reactionId, emoji, x: Math.random() * 80 + 10 }]);

        // Remove reaction after animation
        setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== reactionId));
        }, 3000);

        // Clear user reaction after 2 seconds
        setTimeout(() => setUserReaction(null), 2000);
    };

    // Debug logging
    console.log('PassTheAux State:', {
        currentSong,
        playlist,
        auxHolder,
        isPlaying,
        showMusicModal
    });

    return (
        <div className="pass-the-aux">
            {/* Upload Progress Indicator */}
            {isUploading && (
                <div className="upload-progress-overlay">
                    <div className="upload-progress-card">
                        <div className="upload-spinner">🎵</div>
                        <div className="upload-text">Sharing music...</div>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <div className="upload-percentage">{uploadProgress}%</div>
                    </div>
                </div>
            )}

            {/* Spotify/Apple Music Style Player */}
            {showBanner && currentSong && (
                <div className="music-player-container">
                    {/* Close Button - Top Right */}
                    <button 
                        className="player-close-btn"
                        onClick={() => {
                            if (onClose) onClose();
                        }}
                        title="Close Music Player"
                    >
                        <X size={20} />
                    </button>

                    {/* Floating Reactions */}
                    <div className="reactions-container">
                        {reactions.map(reaction => (
                            <div 
                                key={reaction.id} 
                                className="floating-reaction"
                                style={{ left: `${reaction.x}%` }}
                            >
                                {reaction.emoji}
                            </div>
                        ))}
                    </div>

                    {/* DJ Scratch Disc Visual */}
                    <div className="dj-scratch-container">
                        <div className={`vinyl-disc ${isPlaying ? 'spinning' : ''}`}>
                            <Disc3 size={80} className="vinyl-icon" />
                            <div className="vinyl-center">
                                <Crown size={24} className="crown-vinyl" />
                            </div>
                        </div>
                        <div className="dj-label-badge">
                            <span className="dj-text">DJ {auxHolder || 'Unknown'}</span>
                        </div>
                    </div>

                    {/* Song Info */}
                    <div className="player-song-info">
                        <div className="song-title-main">{currentSong.name}</div>
                        <div className="song-subtitle">Mixed by {auxHolder || 'Unknown'}</div>
                    </div>

                    {/* Progress Bar */}
                    {currentSong.type === 'audio' && (
                        <div className="player-progress">
                            <span className="time-text">{formatTime(currentTime)}</span>
                            <input
                                type="range"
                                min="0"
                                max={duration || 100}
                                value={currentTime}
                                onChange={handleSeek}
                                className="progress-slider"
                            />
                            <span className="time-text">{formatTime(duration)}</span>
                        </div>
                    )}

                    {/* Control Buttons */}
                    <div className="player-controls">
                        {currentSong.type === 'audio' && (
                            <button 
                                onClick={togglePlayPause} 
                                className="control-btn primary-btn"
                                title={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                setCurrentSong(null);
                                setAuxHolder(null);
                                setPlaylist([]);
                                setIsPlaying(false);
                                broadcastPlaybackControl('stop');
                            }} 
                            className="control-btn secondary-btn"
                            title="Stop and clear"
                        >
                            <Square size={18} fill="currentColor" />
                        </button>
                    </div>

                    {/* Reaction Buttons */}
                    <div className="reaction-buttons">
                        <button 
                            onClick={() => sendReaction('❤️')} 
                            className={`reaction-btn ${userReaction === '❤️' ? 'active' : ''}`}
                            title="Love it"
                        >
                            ❤️
                        </button>
                        <button 
                            onClick={() => sendReaction('🔥')} 
                            className={`reaction-btn ${userReaction === '🔥' ? 'active' : ''}`}
                            title="Fire"
                        >
                            🔥
                        </button>
                        <button 
                            onClick={() => sendReaction('👍')} 
                            className={`reaction-btn ${userReaction === '👍' ? 'active' : ''}`}
                            title="Like"
                        >
                            👍
                        </button>
                        <button 
                            onClick={() => sendReaction('😂')} 
                            className={`reaction-btn ${userReaction === '😂' ? 'active' : ''}`}
                            title="Funny"
                        >
                            😂
                        </button>
                    </div>
                </div>
            )}

            {/* No Music - Take Control */}
            {showBanner && !currentSong && (
                <div className="no-music-card">
                    <div className="no-music-content">
                        <Disc3 size={48} className="no-music-icon" />
                        <div className="no-music-text">Nobody has the aux right now...</div>
                        <button 
                            className="take-control-btn-modern"
                            onClick={() => setShowMusicModal(true)}
                        >
                            <Upload size={18} />
                            Take Control
                        </button>
                    </div>
                </div>
            )}

            {/* Minimized Indicator - Show when banner is hidden but music is playing */}
            {!showBanner && currentSong && (
                <button 
                    className="minimized-music-indicator"
                    onClick={() => setShowBanner(true)}
                >
                    <Crown size={18} />
                    <span>{isPlaying ? '♫' : '❚❚'}</span>
                </button>
            )}

            {/* Hidden audio element */}
            {currentSong && currentSong.type === 'audio' && (
                <audio
                    ref={audioRef}
                    src={currentSong.url}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    style={{ display: 'none' }}
                />
            )}

            {/* YouTube Player - Expanded view when YouTube is playing */}
            {currentSong && currentSong.type === 'youtube' && currentSong.youtubeId && (
                <div className="youtube-player-container">
                    <iframe
                        width="100%"
                        height="200"
                        src={`https://www.youtube.com/embed/${currentSong.youtubeId}?autoplay=1`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            )}

            {/* Music Modal */}
            {showMusicModal && (
                <div className="music-modal-overlay" onClick={handleCloseModal}>
                    <div className="music-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-btn" onClick={handleCloseModal}>✕</button>
                        
                        <div className="modal-header">
                            <span className="modal-icon">🎵</span>
                            <h2>Pass The Aux</h2>
                            <p className="modal-subtitle">Take control and share your music!</p>
                        </div>

                        <div className="music-options">
                            {/* Upload Audio - The only working option */}
                            <label htmlFor="audio-file-input" className="option-card-large" style={{ cursor: 'pointer' }}>
                                <div className="option-card-icon">📤</div>
                                <div className="option-card-content">
                                    <h3>Upload Your Music</h3>
                                    <p>Share MP3, WAV, or M4A files from your device</p>
                                    <div className="upload-cta">
                                        <Upload size={20} />
                                        <span>Choose Audio File</span>
                                    </div>
                                </div>
                            </label>
                            <input
                                id="audio-file-input"
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                        </div>

                        <div className="modal-footer">
                            <p className="modal-hint">💡 Tip: All participants will hear your music in sync!</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PassTheAux;
