import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Play, Pause, Volume2, VolumeX, Maximize, Search, 
  Youtube, Clock, Users, Share2, Plus, LogOut, Monitor, ChevronDown
} from 'lucide-react';

const WatchParty = ({ room, participants, onClose, onVideoStateChange }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [hostName, setHostName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasJoined, setHasJoined] = useState(false); // Track if user has joined
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [shareMode, setShareMode] = useState('youtube'); // 'youtube' or 'screen'
  
  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const isLocalUpdateRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const screenVideoRef = useRef(null);
  
  // Extract YouTube video ID from URL
  const extractVideoId = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };
  
  // Search YouTube videos using YouTube Data API v3
  const searchYouTube = async (query, showResults = true) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
      
      if (!API_KEY) {
        console.error('YouTube API key not found. Add VITE_YOUTUBE_API_KEY to your .env file');
        // Fallback to mock results if no API key
        const mockResults = [
          {
            id: 'dQw4w9WgXcQ',
            title: `${query} - Add API key for real results`,
            thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`,
            channelTitle: 'Get YouTube API key from console.cloud.google.com'
          },
        ];
        setSearchResults(mockResults);
        if (showResults) setShowSuggestions(true);
        setIsSearching(false);
        return;
      }
      
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=8&key=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('YouTube API request failed');
      }
      
      const data = await response.json();
      
      const results = data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description
      }));
      
      setSearchResults(results);
      if (showResults) setShowSuggestions(true);
      
    } catch (error) {
      console.error('YouTube search failed:', error);
      setSearchResults([]);
      alert('Search failed. Please check your API key or try again.');
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle search input change with debouncing
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Show suggestions if user is typing
    if (value.trim().length > 2) {
      setShowSuggestions(true);
      // Debounce search - wait 500ms after user stops typing
      searchTimeoutRef.current = setTimeout(() => {
        searchYouTube(value, true);
      }, 500);
    } else {
      setShowSuggestions(false);
      setSearchResults([]);
    }
  };
  
  // Handle search submission
  const handleSearch = (e) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      searchYouTube(searchQuery, true);
      setShowSuggestions(true);
    }
  };
  
  // Select video from search results
  const selectVideo = (video) => {
    setInputUrl(video.url);
    handleStartWatchParty(video.url);
    setSearchResults([]);
    setSearchQuery('');
    setShowSuggestions(false);
  };
  
  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    
    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
      // Clean up screen share on unmount
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [screenStream]);
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSuggestions && !e.target.closest('.search-container')) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);
  
  // Initialize YouTube player
  useEffect(() => {
    if (!videoUrl) return;
    
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return;
    
    const onYouTubeIframeAPIReady = () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
      
      playerRef.current = new window.YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            console.log('🎬 YouTube player ready');
            setDuration(event.target.getDuration());
            
            // Start time update interval
            const interval = setInterval(() => {
              if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                const time = playerRef.current.getCurrentTime();
                setCurrentTime(time);
              }
            }, 100);
            
            return () => clearInterval(interval);
          },
          onStateChange: (event) => {
            // YT.PlayerState.PLAYING = 1, PAUSED = 2
            const playing = event.data === window.YT.PlayerState.PLAYING;
            setIsPlaying(playing);
            
            // Notify parent component about video state
            if (onVideoStateChange) {
              onVideoStateChange(playing);
            }
          },
        },
      });
    };
    
    if (window.YT && window.YT.Player) {
      onYouTubeIframeAPIReady();
    } else {
      window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
    }
  }, [videoUrl, onVideoStateChange]);
  
  // Listen for sync messages
  useEffect(() => {
    if (!room) return;
    
    const handleData = (payload, participant) => {
      const decoder = new TextDecoder();
      const message = decoder.decode(payload);
      
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'WATCH_PARTY_INVITE') {
          // Don't process invite if already joined or is host
          console.log('🎬 Watch party invitation received from', participant?.identity);
        } else if (data.type === 'SCREEN_SHARE_START') {
          console.log('🖥️ Screen share started by', participant?.identity);
          setShareMode('screen');
          setHostName(data.hostName || participant?.identity);
          if (!hasJoined && !isHost) {
            // Auto-show join prompt for screen share too
          }
        } else if (data.type === 'SCREEN_SHARE_STOP') {
          console.log('🖥️ Screen share stopped by', participant?.identity);
          setShareMode('youtube');
        } else if (data.type === 'WATCH_PARTY_START') {
          // Only process if user has joined
          if (!hasJoined && !isHost) {
            console.log('⏸️ Not processing start - user has not joined yet');
            return;
          }
          console.log('🎬 Watch party started by', participant?.identity);
          setVideoUrl(data.videoUrl);
          setHostName(data.hostName || participant?.identity);
          if (isHost) {
            setIsHost(false); // If receiving from someone else, you're not the host
          }
        } else if (data.type === 'WATCH_PARTY_PLAY') {
          if (!hasJoined && !isHost) return;
          console.log('▶️ Play command from', participant?.identity);
          if (playerRef.current && !isLocalUpdateRef.current) {
            playerRef.current.playVideo();
          }
        } else if (data.type === 'WATCH_PARTY_PAUSE') {
          if (!hasJoined && !isHost) return;
          console.log('⏸️ Pause command from', participant?.identity);
          if (playerRef.current && !isLocalUpdateRef.current) {
            playerRef.current.pauseVideo();
          }
        } else if (data.type === 'WATCH_PARTY_SEEK') {
          if (!hasJoined && !isHost) return;
          console.log('⏩ Seek to', data.time, 'from', participant?.identity);
          if (playerRef.current && !isLocalUpdateRef.current) {
            playerRef.current.seekTo(data.time, true);
          }
        } else if (data.type === 'WATCH_PARTY_END') {
          console.log('🛑 Watch party ended by', participant?.identity);
          // Don't auto-close for others, let them leave independently
        }
      } catch (error) {
        console.error('❌ Error parsing watch party message:', error);
      }
    };
    
    room.on('dataReceived', handleData);
    
    return () => {
      room.off('dataReceived', handleData);
    };
  }, [room, hasJoined, isHost]);
  
  // Broadcast control message
  const broadcastControl = (type, data = {}) => {
    if (!room) return;
    
    isLocalUpdateRef.current = true;
    
    const encoder = new TextEncoder();
    const message = JSON.stringify({
      type,
      ...data,
    });
    const payload = encoder.encode(message);
    
    room.localParticipant.publishData(payload, { reliable: true });
    
    setTimeout(() => {
      isLocalUpdateRef.current = false;
    }, 100);
  };
  
  // Start watch party
  const handleStartWatchParty = (urlToUse = null) => {
    const url = urlToUse || inputUrl;
    if (!url) return;
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      alert('Invalid YouTube URL. Please enter a valid YouTube link.');
      return;
    }
    
    setVideoUrl(url);
    setIsHost(true);
    setHasJoined(true); // Host automatically joins
    
    // Send invitation to all participants
    broadcastControl('WATCH_PARTY_INVITE', {
      videoUrl: url,
      hostName: room?.localParticipant?.identity || 'Someone',
    });
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };
  
  // Join watch party (for non-hosts)
  const handleJoinWatchParty = () => {
    setHasJoined(true);
    
    // Notify host that you've joined
    broadcastControl('WATCH_PARTY_JOIN', {
      participantName: room?.localParticipant?.identity || 'Someone',
    });
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };
  
  // Start screen sharing
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor', // Can be 'monitor', 'window', or 'browser'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      setScreenStream(stream);
      setIsScreenSharing(true);
      setShareMode('screen');
      setIsHost(true);
      setHasJoined(true);
      
      // Attach to video element
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
      
      // Notify when screen sharing stops
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
      
      // Broadcast screen share started
      broadcastControl('SCREEN_SHARE_START', {
        hostName: room?.localParticipant?.identity || 'Someone',
      });
      
      // Notify parent
      if (onVideoStateChange) {
        onVideoStateChange(true);
      }
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      console.log('🖥️ Screen sharing started');
    } catch (error) {
      console.error('❌ Screen share failed:', error);
      if (error.name === 'NotAllowedError') {
        alert('Screen sharing permission denied. Please allow screen sharing and try again.');
      } else {
        alert('Failed to start screen sharing: ' + error.message);
      }
    }
  };
  
  // Stop screen sharing
  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);
    setShareMode('youtube');
    
    // Broadcast screen share stopped
    if (isHost) {
      broadcastControl('SCREEN_SHARE_STOP');
    }
    
    console.log('🖥️ Screen sharing stopped');
  };
  
  // Toggle play/pause
  const togglePlayPause = () => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
      broadcastControl('WATCH_PARTY_PAUSE');
    } else {
      playerRef.current.playVideo();
      broadcastControl('WATCH_PARTY_PLAY');
    }
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };
  
  // Seek video
  const handleSeek = (e) => {
    if (!playerRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * duration;
    
    playerRef.current.seekTo(time, true);
    broadcastControl('WATCH_PARTY_SEEK', { time });
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (!playerRef.current) return;
    
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume * 100);
    } else {
      playerRef.current.mute();
    }
    setIsMuted(!isMuted);
  };
  
  // Change volume
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume * 100);
      if (newVolume > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.() ||
      playerContainerRef.current.webkitRequestFullscreen?.() ||
      playerContainerRef.current.msRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() ||
      document.webkitExitFullscreen?.() ||
      document.msExitFullscreen?.();
    }
  };
  
  // Close watch party (individual user can leave)
  const handleClose = () => {
    // Only broadcast END if you're the host
    if (isHost) {
      broadcastControl('WATCH_PARTY_END');
    }
    
    if (onVideoStateChange) {
      onVideoStateChange(false);
    }
    
    onClose();
  };
  
  // Leave watch party (non-host)
  const handleLeaveWatchParty = () => {
    if (onVideoStateChange) {
      onVideoStateChange(false);
    }
    
    onClose();
  };
  
  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="bg-black/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden max-w-4xl w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            {shareMode === 'screen' ? (
              <Monitor className="w-6 h-6 text-white" />
            ) : (
              <Youtube className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">
              {shareMode === 'screen' ? 'Screen Share' : 'Watch Party'}
            </h2>
            <p className="text-white/80 text-sm flex items-center gap-2">
              <Users size={14} />
              {participants.length + 1} watching
              {hostName && <span className="text-white/60">• Host: {hostName}</span>}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-white/80 hover:text-white transition-colors p-2"
        >
          <X size={24} />
        </button>
      </div>
      
      {/* Video Player or Setup */}
      {!videoUrl ? (
        /* Setup/Search Interface - Only shown to host or users who haven't received invite */
        <div className="p-8 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Youtube className="w-10 h-10 text-red-400" />
            </div>
            
            <h3 className="text-white text-2xl font-bold mb-2">Start a Watch Party</h3>
            <p className="text-white/60 mb-6">
              Search for videos, paste a URL, or share your screen!
            </p>
            
            {/* Source Selection Dropdown */}
            <div className="relative mb-6">
              <button
                onClick={() => setShowSourceMenu(!showSourceMenu)}
                className="w-full bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-4 py-3 text-white font-medium flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  {shareMode === 'screen' ? (
                    <>
                      <Monitor size={20} />
                      <span>Share Screen</span>
                    </>
                  ) : (
                    <>
                      <Youtube size={20} />
                      <span>YouTube Video</span>
                    </>
                  )}
                </div>
                <ChevronDown size={20} className={`transition-transform ${showSourceMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showSourceMenu && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setShareMode('youtube');
                      setShowSourceMenu(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 ${
                      shareMode === 'youtube' ? 'bg-white/5' : ''
                    }`}
                  >
                    <Youtube size={20} className="text-red-400" />
                    <div>
                      <div className="text-white font-medium">YouTube Video</div>
                      <div className="text-white/60 text-sm">Search or paste a YouTube URL</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShareMode('screen');
                      setShowSourceMenu(false);
                      startScreenShare();
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 ${
                      shareMode === 'screen' ? 'bg-white/5' : ''
                    }`}
                  >
                    <Monitor size={20} className="text-blue-400" />
                    <div>
                      <div className="text-white font-medium">Share Screen</div>
                      <div className="text-white/60 text-sm">Share your entire screen, window, or tab</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
            
            {shareMode === 'youtube' && (
            <>
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative search-container">
                <form onSubmit={handleSearch}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 z-10" />
                  <input
                    type="text"
                    placeholder="Search YouTube videos..."
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowSuggestions(true);
                    }}
                    className="w-full pl-10 pr-24 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <button
                    type="submit"
                    disabled={!searchQuery.trim() || isSearching}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </form>
                
                {/* Live Search Suggestions Dropdown */}
                {showSuggestions && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50 animate-slide-up">
                    <div className="p-2 space-y-1">
                      {searchResults.map((video) => (
                        <button
                          key={video.id}
                          onClick={() => selectVideo(video)}
                          className="w-full bg-white/5 hover:bg-white/10 rounded-lg p-2 flex items-center gap-3 transition-all text-left group"
                        >
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-20 h-12 object-cover rounded flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium line-clamp-1 group-hover:text-red-400 transition-colors">
                              {video.title}
                            </p>
                            {video.channelTitle && (
                              <p className="text-white/60 text-xs truncate">{video.channelTitle}</p>
                            )}
                          </div>
                          <Play className="w-4 h-4 text-white/40 group-hover:text-red-400 transition-colors flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Loading indicator */}
              {isSearching && (
                <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-red-400 rounded-full animate-spin"></div>
                  <span>Finding videos...</span>
                </div>
              )}
              
              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/10"></div>
                <button
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-white/40 text-sm hover:text-white/60 transition-colors"
                >
                  {showUrlInput ? 'Hide URL input' : 'Or paste a URL'}
                </button>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>
              
              {/* URL Input (collapsible) */}
              {showUrlInput && (
                <div className="space-y-3 animate-slide-up">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Paste YouTube URL here..."
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full pl-4 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-400"
                      onKeyPress={(e) => e.key === 'Enter' && handleStartWatchParty()}
                    />
                  </div>
                  
                  <button
                    onClick={() => handleStartWatchParty()}
                    disabled={!inputUrl}
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Play size={20} />
                    Start Watch Party
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-white/40 text-sm mb-3">✨ Features</p>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-white/60 text-xs mb-1">Synchronized</div>
                  <div className="text-white text-sm font-medium">Everyone watches together</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-white/60 text-xs mb-1">Shared Controls</div>
                  <div className="text-white text-sm font-medium">Host controls playback</div>
                </div>
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      ) : (
        /* Video Player Interface */
        <div className="space-y-3 p-4">
          {/* Show join prompt if user hasn't joined yet and is not host */}
          {!hasJoined && !isHost && (
            <div className="bg-gradient-to-r from-red-600/90 to-pink-600/90 backdrop-blur-sm rounded-xl p-6 text-center mb-4">
              <Youtube className="w-12 h-12 text-white mx-auto mb-3" />
              <h3 className="text-white text-xl font-bold mb-2">
                {hostName} started a Watch Party!
              </h3>
              <p className="text-white/90 mb-4">
                Join to watch together with synchronized playback
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleJoinWatchParty}
                  className="bg-white text-red-600 font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition-all flex items-center gap-2"
                >
                  <Play size={20} />
                  Join Watch Party
                </button>
                <button
                  onClick={handleLeaveWatchParty}
                  className="bg-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
                >
                  No Thanks
                </button>
              </div>
            </div>
          )}
          
          {/* Video Player - Only show if user has joined or is host */}
          {(hasJoined || isHost) && (
            <>
              {/* Video Player */}
              <div 
                ref={playerContainerRef}
                className="relative bg-black rounded-xl overflow-hidden aspect-video"
              >
                {shareMode === 'screen' && isScreenSharing ? (
                  /* Screen Share Display */
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                ) : shareMode === 'screen' ? (
                  /* Waiting for screen share */
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <div className="text-center text-white">
                      <Monitor className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                      <p className="text-lg font-semibold">{hostName} is sharing their screen</p>
                      <p className="text-sm text-white/60 mt-2">Waiting for screen share...</p>
                    </div>
                  </div>
                ) : (
                  /* YouTube Player */
                  <>
                    <div id="youtube-player" className="w-full h-full"></div>
            
            {/* Custom Controls Overlay - Only for YouTube */}
            {shareMode === 'youtube' && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 space-y-3">
              {/* Progress Bar */}
              <div 
                className="w-full h-2 bg-white/20 rounded-full cursor-pointer relative group"
                onClick={handleSeek}
              >
                <div 
                  className="h-full bg-red-500 rounded-full relative"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlayPause}
                    className="text-white hover:text-red-400 transition-colors"
                  >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                  </button>
                  
                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="text-white hover:text-red-400 transition-colors"
                    >
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-white/20 rounded-full accent-red-500 cursor-pointer"
                    />
                  </div>
                  
                  {/* Time */}
                  <div className="text-white text-sm font-medium">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-white hover:text-red-400 transition-colors"
                  >
                    <Maximize size={20} />
                  </button>
                </div>
              </div>
            </div>
            )}
            </>
                )}
          </div>
          
          {/* Info */}
          <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className="bg-red-500/20 p-2 rounded-lg">
              <Clock className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-white/60 text-xs">Synchronized Playback</p>
              <p className="text-white text-sm font-medium">
                {isHost ? "You're controlling the video" : `${hostName} is controlling the video`}
              </p>
            </div>
            {/* Leave button for non-hosts */}
            {!isHost && (
              <button
                onClick={handleLeaveWatchParty}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                title="Leave Watch Party"
              >
                <LogOut size={16} />
                Leave
              </button>
            )}
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
};

export default WatchParty;
