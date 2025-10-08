import React, { useState, useRef, useEffect } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
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
    
    const audioRef = useRef(null);
    const fileInputRef = useRef(null);

    // Listen for music sharing events from other users via LiveKit
    useEffect(() => {
        if (!room) {
            console.error('❌ PassTheAux: Room is not available!');
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

                // Request sync from existing users
                if (message.type === 'REQUEST_SYNC') {
                    console.log('📡 Sync requested by:', participant?.identity);
                    // If I have a current song, share it with the new user
                    if (currentSong) {
                        console.log('📤 Sending current song to new participant');
                        broadcastMusicData(currentSong);
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
        // Don't close the entire component, just the modal
    };

    // Broadcast music data to all participants
    const broadcastMusicData = (songData) => {
        if (!room) {
            console.warn('Room not available for broadcasting');
            return;
        }

        // Send Firebase URL directly (no chunking needed!)
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
        
        if (!file || !file.type.startsWith('audio/')) {
            console.log('Invalid file type:', file?.type);
            alert('Please select an audio file (MP3, WAV, M4A, etc.)');
            return;
        }

        console.log('✅ Room is connected, uploading to Firebase...');
        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Create a unique filename
            const timestamp = Date.now();
            const filename = `music/${timestamp}_${file.name}`;
            const storageRef = ref(storage, filename);

            // Upload file to Firebase Storage with progress tracking
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    // Track upload progress
                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    setUploadProgress(progress);
                    console.log('Upload progress:', progress + '%');
                },
                (error) => {
                    // Handle upload error
                    console.error('❌ Firebase upload error:', error);
                    alert('Failed to upload file: ' + error.message);
                    setIsUploading(false);
                    setUploadProgress(0);
                },
                async () => {
                    // Upload complete - get download URL
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log('✅ File uploaded! Download URL:', downloadURL);

                    const newSong = {
                        url: downloadURL,
                        type: 'audio',
                        name: file.name,
                        addedBy: 'You'
                    };

                    const newPlaylist = [...playlist, newSong];
                    setPlaylist(newPlaylist);

                    if (!currentSong) {
                        console.log('Setting current song:', newSong.name);
                        setCurrentSong(newSong);
                        setAuxHolder('You');

                        // Broadcast the Firebase URL (tiny message, no chunking needed!)
                        broadcastMusicData(newSong);
                    }

                    setIsUploading(false);
                    setUploadProgress(0);
                    handleCloseModal();
                }
            );
        } catch (error) {
            console.error('❌ Upload error:', error);
            alert('Failed to upload file: ' + error.message);
            setIsUploading(false);
            setUploadProgress(0);
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

            {/* Aux Status Header with integrated controls */}
            <div className="aux-status">
                <span className="crown-icon">👑</span>
                <span className="aux-text">
                    {currentSong ? (
                        <>
                            <span className="now-playing-label">Now Playing:</span>
                            <span className="song-name-inline">{currentSong.name}</span>
                            <span className="dj-label"> • DJ: {auxHolder || 'Unknown'}</span>
                        </>
                    ) : (
                        auxHolder ? `${auxHolder} has the aux` : 'Nobody has the aux right now...'
                    )}
                </span>
                
                {/* Show controls for everyone when music is playing */}
                {currentSong && (
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
                            <div className="option-card" onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                            }}>
                                <span className="option-icon">📤</span>
                                <div>
                                    <h3>Upload Audio File</h3>
                                    <p>MP3, WAV, M4A files from your device</p>
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*,audio/mpeg,audio/mp3,audio/wav,audio/m4a"
                                capture="false"
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
