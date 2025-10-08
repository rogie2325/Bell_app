import React, { useState, useRef, useEffect } from 'react';
import './PassTheAux.css';

const PassTheAux = ({ roomName, participants, onClose, room }) => {
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
    
    const audioRef = useRef(null);
    const fileInputRef = useRef(null);
    const receivedChunksRef = useRef({});

    // Listen for music sharing events from other users via LiveKit
    useEffect(() => {
        if (!room) {
            console.error('❌ PassTheAux: Room is not available!');
            return;
        }

        console.log('✅ PassTheAux: Room connected, setting up data listener');
        console.log('✅ Room state:', room.state);
        console.log('✅ Room participants:', room.participants.size);

        const handleDataReceived = (payload, participant) => {
            try {
                console.log('🎵 DATA RECEIVED EVENT FIRED!');
                const decoder = new TextDecoder();
                const message = JSON.parse(decoder.decode(payload));
                
                console.log('======================');
                console.log('RECEIVED DATA FROM:', participant?.identity || 'Unknown');
                console.log('MESSAGE TYPE:', message.type);
                console.log('======================');

                // Handle chunked data
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
                    console.log('PROGRESS:', progress + '%', `(${receivedChunksRef.current[transferId].receivedCount}/${totalChunks} chunks)`);
                    
                    // Check if all chunks received
                    if (receivedChunksRef.current[transferId].receivedCount === totalChunks) {
                        console.log('======================');
                        console.log('ALL CHUNKS RECEIVED!');
                        console.log('ASSEMBLING SONG...');
                        
                        const completeData = receivedChunksRef.current[transferId].chunks.join('');
                        const songMetadata = receivedChunksRef.current[transferId].metadata;
                        
                        console.log('COMPLETE DATA LENGTH:', completeData.length);
                        
                        const newSong = {
                            url: completeData,
                            type: songMetadata.type,
                            name: songMetadata.name,
                            youtubeId: songMetadata.youtubeId,
                            addedBy: participant?.identity || 'Someone'
                        };
                        
                        console.log('SONG READY:', newSong.name);
                        console.log('SETTING CURRENT SONG...');
                        
                        setCurrentSong(newSong);
                        setAuxHolder(participant?.identity || 'Someone');
                        setPlaylist(prev => [...prev, newSong]);
                        
                        // Clean up
                        delete receivedChunksRef.current[transferId];
                        setIsReceiving(false);
                        setReceiveProgress(0);
                        console.log('CLEANED UP TRANSFER DATA');
                        console.log('======================');
                    }
                }

                if (message.type === 'PING') {
                    console.log('🏓 PONG! Received test ping from:', message.from);
                }

                if (message.type === 'MUSIC_SHARE') {
                    console.log('DIRECT MUSIC SHARE (YouTube/Small file)');
                    const newSong = {
                        url: message.url,
                        type: message.musicType,
                        name: message.name,
                        youtubeId: message.youtubeId,
                        addedBy: participant?.identity || 'Someone'
                    };
                    
                    console.log('SONG:', newSong.name);
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
            } catch (error) {
                console.error('ERROR HANDLING RECEIVED DATA:', error);
            }
        };

        room.on('dataReceived', handleDataReceived);
        console.log('✅ dataReceived listener attached to room');

        // Test: Send a ping immediately to verify data channel works
        setTimeout(() => {
            const testMessage = JSON.stringify({ type: 'PING', from: 'PassTheAux' });
            const encoder = new TextEncoder();
            const data = encoder.encode(testMessage);
            room.localParticipant.publishData(data, { reliable: true });
            console.log('📡 Sent test PING message');
        }, 1000);

        return () => {
            room.off('dataReceived', handleDataReceived);
            console.log('🔌 dataReceived listener removed');
        };
    }, [room]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume / 100;
        }
    }, [volume]);

    useEffect(() => {
        if (audioRef.current && currentSong && currentSong.type === 'audio') {
            audioRef.current.load();
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(error => {
                console.log('Auto-play prevented:', error);
                setIsPlaying(false);
            });
        }
    }, [currentSong]);

    useEffect(() => {
        if (audioRef.current) {
            const updateTime = () => setCurrentTime(audioRef.current.currentTime);
            const updateDuration = () => setDuration(audioRef.current.duration);
            const handleEnded = () => {
                setIsPlaying(false);
                playNextSong();
            };

            audioRef.current.addEventListener('timeupdate', updateTime);
            audioRef.current.addEventListener('loadedmetadata', updateDuration);
            audioRef.current.addEventListener('ended', handleEnded);

            return () => {
                if (audioRef.current) {
                    audioRef.current.removeEventListener('timeupdate', updateTime);
                    audioRef.current.removeEventListener('loadedmetadata', updateDuration);
                    audioRef.current.removeEventListener('ended', handleEnded);
                }
            };
        }
    }, []);

    const handleCloseModal = () => {
        setShowMusicModal(false);
        if (onClose) onClose();
    };

    // Broadcast large data in chunks (max 60KB per chunk to be safe)
    const broadcastMusicDataChunked = async (songData) => {
        if (!room) {
            console.error('❌ CANNOT BROADCAST: Room is not available!');
            alert('Connection error: Room not connected. Please rejoin the room.');
            return;
        }

        console.log('✅ Room is connected, starting broadcast...');

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
                    youtubeId: songData.youtubeId
                }
            });

            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            
            try {
                await room.localParticipant.publishData(data, { reliable: true });
                const progress = Math.round(((i + 1) / totalChunks) * 100);
                setUploadProgress(progress);
                console.log('SENT CHUNK', i + 1, '/', totalChunks, '(' + progress + '%) - Chunk size:', chunk.length, 'bytes');
                
                // Small delay between chunks to avoid overwhelming the connection
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                console.error('ERROR SENDING CHUNK', i, ':', error);
            }
        }
        
        setIsUploading(false);
        setUploadProgress(0);
        console.log('======================');
        console.log('ALL CHUNKS SENT!');
        console.log('======================');
    };

    // Broadcast music data to all participants (for small data like YouTube URLs)
    const broadcastMusicData = (songData) => {
        if (!room) {
            console.warn('Room not available for broadcasting');
            return;
        }

        // If it's audio data (large), use chunking
        if (songData.type === 'audio' && songData.url.length > 60000) {
            return broadcastMusicDataChunked(songData);
        }

        // For small data (YouTube URLs), send directly
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
        console.log('Broadcasted music data:', songData);
    };

    // Broadcast playback control
    const broadcastPlaybackControl = (action) => {
        if (!room) return;

        const message = JSON.stringify({
            type: 'PLAYBACK_CONTROL',
            action: action // 'play', 'pause', 'stop'
        });

        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        room.localParticipant.publishData(data, { reliable: true });
        console.log('Broadcasted playback control:', action);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        console.log('📁 File selected:', file?.name, file?.type);
        
        if (!room) {
            console.error('❌ Room not connected! Cannot upload file.');
            alert('Please wait for the room connection before uploading.');
            return;
        }
        
        console.log('✅ Room is connected:', room);
        
        if (file && file.type.startsWith('audio/')) {
            // Convert file to base64 data URL for sharing
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                
                const newSong = {
                    url: dataUrl, // Base64 data URL can be shared
                    type: 'audio',
                    name: file.name,
                    addedBy: 'You'
                };
                
                console.log('New song created with data URL');
                
                const newPlaylist = [...playlist, newSong];
                setPlaylist(newPlaylist);
                
                if (!currentSong) {
                    console.log('Setting current song:', newSong.name);
                    setCurrentSong(newSong);
                    setAuxHolder('You');
                    
                    // Broadcast to all participants
                    broadcastMusicData(newSong);
                }
                
                handleCloseModal();
            };
            
            reader.readAsDataURL(file);
        } else {
            console.log('Invalid file type:', file?.type);
            alert('Please select an audio file (MP3, WAV, M4A, etc.)');
        }
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

            {/* Receiving Progress Indicator */}
            {isReceiving && (
                <div className="upload-progress-overlay">
                    <div className="upload-progress-card">
                        <div className="upload-spinner">🎵</div>
                        <div className="upload-text">Receiving music...</div>
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${receiveProgress}%` }}></div>
                        </div>
                        <div className="upload-percentage">{receiveProgress}%</div>
                    </div>
                </div>
            )}

            {/* Aux Status Header with integrated controls */}
            <div className="aux-status">
                <span className="crown-icon">👑</span>
                <span className="aux-text">
                    {currentSong ? (
                        <>
                            <span className="now-playing-label">Now Playing:</span>
                            <span className="song-name-inline">{currentSong.name}</span>
                        </>
                    ) : (
                        auxHolder ? `${auxHolder} has the aux` : 'Nobody has the aux right now...'
                    )}
                </span>
                
                {/* Admin Controls - Only show if user uploaded the song */}
                {currentSong && currentSong.addedBy === 'You' && (
                    <div className="admin-controls">
                        {currentSong.type === 'audio' && (
                            <button 
                                onClick={togglePlayPause} 
                                className="control-btn-mini"
                                title={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? '⏸️' : '▶️'}
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
                            className="control-btn-mini quit-btn"
                            title="Stop and clear"
                        >
                            ⏹️
                        </button>
                    </div>
                )}
            </div>

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
                            <h2>🎵 NEW: Who Has Aux? 🎵</h2>
                            <p className="modal-subtitle">Take control of the party!</p>
                        </div>

                        <div className="music-options">
                            <div className="option-card" onClick={() => fileInputRef.current?.click()}>
                                <span className="option-icon">📤</span>
                                <div>
                                    <h3>Upload Audio File</h3>
                                    <p>MP3, WAV, M4A files from your device</p>
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />

                            <div className="option-card">
                                <span className="option-icon">🎵</span>
                                <div>
                                    <h3>Share Music:</h3>
                                    <p>Upload your songs and become the DJ</p>
                                </div>
                            </div>

                            <div className="option-card">
                                <span className="option-icon">📺</span>
                                <div>
                                    <h3>YouTube Videos:</h3>
                                    <p>Watch together with friends</p>
                                    <input
                                        type="text"
                                        placeholder="Paste YouTube URL..."
                                        value={musicUrl}
                                        onChange={(e) => setMusicUrl(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleURLSubmit(e);
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="url-input-inline"
                                    />
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleURLSubmit(e);
                                        }} 
                                        className="add-url-btn"
                                    >
                                        Add Video
                                    </button>
                                </div>
                            </div>

                            <div className="option-card">
                                <span className="option-icon">🖥️</span>
                                <div>
                                    <h3>Screen Share:</h3>
                                    <p>Show your screen to everyone</p>
                                </div>
                            </div>

                            <div className="option-card highlight">
                                <span className="option-icon">👑</span>
                                <div>
                                    <h3>Aux Status:</h3>
                                    <p>Everyone can see who's in control!</p>
                                </div>
                            </div>
                        </div>

                        <div className="supported-platforms">
                            <p>Supported platforms:</p>
                            <div className="platforms">
                                <span>📺 YouTube</span>
                                <span>🔊 SoundCloud</span>
                                <span>🎧 Spotify</span>
                                <span>🌐 Direct URLs</span>
                            </div>
                        </div>

                        <div className="pro-tip">
                            <span>💡</span>
                            <div>
                                <strong>Pro Tip:</strong>
                                <p>For streaming services like Spotify or Apple Music, use "Share System Audio"</p>
                            </div>
                        </div>

                        <button className="start-btn" onClick={takeAuxControl}>
                            🎉 Let's Get Started!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PassTheAux;
