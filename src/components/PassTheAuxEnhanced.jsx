import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Search, Plus, X, Crown, Heart, ThumbsUp, Flame, Music,
  List, Clock, Users, ChevronUp, ChevronDown, Disc3, Radio,
  Share2, Download, MoreVertical, Trash2, History, LogIn, LogOut
} from 'lucide-react';
import './PassTheAux.css';
import { 
  redirectToSpotifyAuth, 
  isAuthenticated, 
  getStoredAccessToken, 
  logout as spotifyLogout 
} from '../utils/spotifyAuth';

const PassTheAuxEnhanced = ({ roomName, participants, onClose, room, onMusicStateChange }) => {
  // State Management
  const [queue, setQueue] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [djRotation, setDjRotation] = useState([]);
  const [currentDJ, setCurrentDJ] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playHistory, setPlayHistory] = useState([]);
  const [skipVotes, setSkipVotes] = useState({});
  const [reactions, setReactions] = useState({});
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'search', 'history'
  const [showSettings, setShowSettings] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [songsPerDJ, setSongsPerDJ] = useState(3);
  const [djSongCount, setDjSongCount] = useState(0);
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [searchPlatform, setSearchPlatform] = useState('youtube'); // Default to YouTube - full songs!
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [spotifyPlayer, setSpotifyPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isSpotifyReady, setIsSpotifyReady] = useState(false);
  const [spotifyAuthenticated, setSpotifyAuthenticated] = useState(false);
  
  const audioRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  
  // Get Spotify Access Token
  useEffect(() => {
    const getSpotifyToken = async () => {
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        console.warn('Spotify credentials not found');
        return;
      }
      
      try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
          },
          body: 'grant_type=client_credentials'
        });
        
        const data = await response.json();
        setSpotifyToken(data.access_token);
        console.log('✅ Spotify token obtained');
      } catch (error) {
        console.error('Failed to get Spotify token:', error);
      }
    };
    
    getSpotifyToken();
  }, []);
  
  // Check if user is authenticated with Spotify (for Web Playback)
  useEffect(() => {
    setSpotifyAuthenticated(isAuthenticated());
  }, []);
  
  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    if (!spotifyAuthenticated) return;
    
    const userToken = getStoredAccessToken();
    if (!userToken) return;
    
    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Bell - Pass The Aux',
        getOAuthToken: cb => { cb(userToken); },
        volume: volume / 100
      });
      
      // Ready
      player.addListener('ready', ({ device_id }) => {
        console.log('✅ Spotify Web Player ready with Device ID:', device_id);
        setDeviceId(device_id);
        setIsSpotifyReady(true);
      });
      
      // Not Ready
      player.addListener('not_ready', ({ device_id }) => {
        console.log('❌ Device ID has gone offline', device_id);
        setIsSpotifyReady(false);
      });
      
      // Player state changed
      player.addListener('player_state_changed', (state) => {
        if (!state) return;
        
        setCurrentTime(state.position);
        setDuration(state.duration);
        setIsPlaying(!state.paused);
        
        // Auto-play next when song ends
        if (state.position === 0 && state.paused && state.duration > 0) {
          playNext();
        }
      });
      
      // Connect to the player
      player.connect().then(success => {
        if (success) {
          console.log('✅ The Web Playback SDK successfully connected to Spotify!');
        }
      });
      
      setSpotifyPlayer(player);
    };
    
    // Cleanup
    return () => {
      if (spotifyPlayer) {
        spotifyPlayer.disconnect();
      }
    };
  }, [spotifyAuthenticated]);
  
  // Search Spotify
  const searchSpotify = async (query) => {
    if (!spotifyToken) {
      console.error('❌ Spotify token not available - check VITE_SPOTIFY_CLIENT_SECRET in .env');
      throw new Error('Spotify not configured. Please add your Client Secret to .env file.');
    }
    
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${spotifyToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.tracks || !data.tracks.items) {
        return [];
      }
      
      // Map and include songs (Spotify provides 30-second previews)
      return data.tracks.items.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        duration: track.duration_ms,
        previewUrl: track.preview_url, // Note: May be null for some songs
        albumArt: track.album.images[0]?.url || 'https://via.placeholder.com/150',
        platform: 'spotify',
        uri: track.uri,
        hasPreview: !!track.preview_url
      }));
    } catch (error) {
      console.error('Spotify search failed:', error);
      throw error;
    }
  };
  
  // Search YouTube Music
  const searchYouTube = async (query) => {
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.error('❌ YouTube API key not found in .env');
      throw new Error('YouTube API not configured');
    }
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' music')}&type=video&videoCategoryId=10&maxResults=10&key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.items) {
        return [];
      }
      
      return data.items.map(item => ({
        id: item.id.videoId,
        name: item.snippet.title,
        artist: item.snippet.channelTitle,
        album: 'YouTube',
        duration: 0, // YouTube API v3 doesn't provide duration in search, would need additional call
        previewUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        albumArt: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        platform: 'youtube',
        uri: `youtube:${item.id.videoId}`
      }));
    } catch (error) {
      console.error('YouTube search failed:', error);
      throw error;
    }
  };
  
  // Unified search function
  const performSearch = async (query) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      let results = [];
      
      if (searchPlatform === 'spotify') {
        results = await searchSpotify(query);
      } else if (searchPlatform === 'youtube') {
        results = await searchYouTube(query);
      }
      
      console.log(`✅ Found ${results.length} results for "${query}" on ${searchPlatform}`);
      setSearchResults(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setShowSuggestions(false);
      
      // Show error to user
      alert(`${searchPlatform === 'spotify' ? 'Spotify' : 'YouTube'} search failed: ${error.message}\n\nTip: ${searchPlatform === 'spotify' ? 'Add your Spotify Client Secret to .env file' : 'Check your YouTube API key'}`);
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
      setIsSearching(true);
      
      // Debounce search - wait 500ms after user stops typing
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 500);
    } else {
      setShowSuggestions(false);
      setSearchResults([]);
      setIsSearching(false);
    }
  };
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSuggestions && !e.target.closest('.search-container-music')) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);
  
  // Add song to queue
  const addToQueue = (song, addedBy = null) => {
    const queueItem = {
      ...song,
      id: `${song.id}-${Date.now()}`,
      addedBy: addedBy || room?.localParticipant?.identity || 'Unknown',
      addedAt: Date.now(),
      votes: 0,
      voters: []
    };
    
    setQueue(prev => [...prev, queueItem]);
    
    // Broadcast to all participants
    broadcastMessage({
      type: 'QUEUE_ADD',
      song: queueItem
    });
    
    // Auto-play if nothing is playing
    if (!currentSong && !isPlaying) {
      playNext();
    }
  };
  
  // Vote to skip current song
  const voteSkip = () => {
    const username = room?.localParticipant?.identity || 'Unknown';
    
    setSkipVotes(prev => ({
      ...prev,
      [username]: true
    }));
    
    broadcastMessage({
      type: 'SKIP_VOTE',
      username
    });
    
    // Auto-skip if majority votes (more than 50%)
    const totalVotes = Object.keys(skipVotes).length + 1;
    const totalUsers = participants.length + 1;
    
    if (totalVotes > totalUsers / 2) {
      skipSong();
    }
  };
  
  // Skip to next song
  const skipSong = () => {
    if (currentSong) {
      setPlayHistory(prev => [currentSong, ...prev].slice(0, 20));
    }
    
    playNext();
    setSkipVotes({});
    
    broadcastMessage({
      type: 'SKIP_SONG'
    });
  };
  
  // Play next song in queue
  const playNext = async () => {
    if (queue.length === 0) {
      setCurrentSong(null);
      setIsPlaying(false);
      return;
    }
    
    // Get highest voted song or first in queue
    const sortedQueue = [...queue].sort((a, b) => b.votes - a.votes);
    const nextSong = sortedQueue[0];
    
    setCurrentSong(nextSong);
    setQueue(prev => prev.filter(s => s.id !== nextSong.id));
    setDjSongCount(prev => prev + 1);
    
    // Check if we need to rotate DJ
    if (autoRotate && djSongCount >= songsPerDJ) {
      rotateDJ();
      setDjSongCount(0);
    }
    
    // Play using Spotify Web Playback SDK if available and it's a Spotify song
    if (nextSong.platform === 'spotify' && spotifyAuthenticated && isSpotifyReady && deviceId) {
      try {
        const userToken = getStoredAccessToken();
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          body: JSON.stringify({ uris: [nextSong.uri] }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
        });
        setIsPlaying(true);
        console.log('✅ Playing full Spotify track via Web Playback SDK');
      } catch (error) {
        console.error('❌ Failed to play via Web Playback SDK, falling back to preview:', error);
        setIsPlaying(true); // Will use audioRef fallback
      }
    } else {
      setIsPlaying(true); // Will use audioRef for YouTube or Spotify previews
    }
    
    broadcastMessage({
      type: 'PLAY_SONG',
      song: nextSong
    });
  };
  
  // Vote for a song in queue
  const voteSong = (songId) => {
    const username = room?.localParticipant?.identity || 'Unknown';
    
    setQueue(prev => prev.map(song => {
      if (song.id === songId) {
        const hasVoted = song.voters.includes(username);
        return {
          ...song,
          votes: hasVoted ? song.votes - 1 : song.votes + 1,
          voters: hasVoted 
            ? song.voters.filter(v => v !== username)
            : [...song.voters, username]
        };
      }
      return song;
    }));
    
    broadcastMessage({
      type: 'VOTE_SONG',
      songId,
      username
    });
  };
  
  // React to current song
  const reactToSong = (emoji) => {
    const username = room?.localParticipant?.identity || 'Unknown';
    
    setReactions(prev => ({
      ...prev,
      [username]: emoji
    }));
    
    broadcastMessage({
      type: 'REACTION',
      username,
      emoji
    });
    
    // Clear reaction after 3 seconds
    setTimeout(() => {
      setReactions(prev => {
        const newReactions = { ...prev };
        delete newReactions[username];
        return newReactions;
      });
    }, 3000);
  };
  
  // Rotate DJ
  const rotateDJ = () => {
    if (djRotation.length === 0) return;
    
    const currentIndex = djRotation.findIndex(dj => dj === currentDJ);
    const nextIndex = (currentIndex + 1) % djRotation.length;
    const nextDJ = djRotation[nextIndex];
    
    setCurrentDJ(nextDJ);
    
    broadcastMessage({
      type: 'DJ_ROTATE',
      dj: nextDJ
    });
  };
  
  // Broadcast message to all participants
  const broadcastMessage = (message) => {
    if (!room) return;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({
      ...message,
      from: room.localParticipant?.identity || 'Unknown',
      timestamp: Date.now()
    }));
    
    room.localParticipant.publishData(data, { reliable: true });
  };
  
  // Listen for messages from other participants
  useEffect(() => {
    if (!room) return;
    
    const handleData = (payload, participant) => {
      const decoder = new TextDecoder();
      const message = JSON.parse(decoder.decode(payload));
      
      switch (message.type) {
        case 'QUEUE_ADD':
          setQueue(prev => [...prev, message.song]);
          if (!currentSong && !isPlaying) playNext();
          break;
          
        case 'SKIP_VOTE':
          setSkipVotes(prev => ({ ...prev, [message.username]: true }));
          break;
          
        case 'SKIP_SONG':
          skipSong();
          break;
          
        case 'PLAY_SONG':
          setCurrentSong(message.song);
          setIsPlaying(true);
          break;
          
        case 'VOTE_SONG':
          voteSong(message.songId);
          break;
          
        case 'REACTION':
          setReactions(prev => ({ ...prev, [message.username]: message.emoji }));
          setTimeout(() => {
            setReactions(prev => {
              const newReactions = { ...prev };
              delete newReactions[message.username];
              return newReactions;
            });
          }, 3000);
          break;
          
        case 'DJ_ROTATE':
          setCurrentDJ(message.dj);
          break;
      }
    };
    
    room.on('dataReceived', handleData);
    
    return () => {
      room.off('dataReceived', handleData);
    };
  }, [room]);
  
  // Initialize DJ rotation with all participants
  useEffect(() => {
    const allUsers = [
      room?.localParticipant?.identity || 'You',
      ...participants.map(p => p.identity)
    ];
    
    setDjRotation(allUsers);
    if (!currentDJ && allUsers.length > 0) {
      setCurrentDJ(allUsers[0]);
    }
  }, [participants, room]);
  
  // Update audio element
  useEffect(() => {
    if (audioRef.current && currentSong) {
      const audioUrl = currentSong.previewUrl;
      
      // Check if preview URL is available
      if (!audioUrl || audioUrl === 'null' || audioUrl === null) {
        console.warn('⚠️ No preview available for:', currentSong.name);
        alert(`Preview not available for "${currentSong.name}"\n\nSpotify only provides 30-second previews for some songs.\n\nSkipping to next...`);
        setTimeout(() => playNext(), 2000);
        return;
      }
      
      audioRef.current.src = audioUrl;
      
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Playback failed:', error);
          alert(`Couldn't play "${currentSong.name}"\n\nTrying next song...`);
          setTimeout(() => playNext(), 2000);
        });
      }
    }
  }, [currentSong, isPlaying]);
  
  // Notify parent of music state
  useEffect(() => {
    if (onMusicStateChange) {
      onMusicStateChange(isPlaying);
    }
  }, [isPlaying, onMusicStateChange]);
  
  // Format time
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="pass-the-aux-enhanced bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden max-w-4xl w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg animate-pulse">
            <Disc3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              Pass The Aux
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Enhanced</span>
              {spotifyAuthenticated && isSpotifyReady && (
                <span className="text-xs bg-green-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  Premium
                </span>
              )}
            </h2>
            <p className="text-white/80 text-sm flex items-center gap-2">
              <Crown size={14} className="text-yellow-300" />
              DJ: {currentDJ || 'None'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!spotifyAuthenticated ? (
            <button
              onClick={redirectToSpotifyAuth}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium"
              title="Login with Spotify Premium for full song playback"
            >
              <LogIn size={16} />
              <span>Connect Spotify Premium</span>
            </button>
          ) : (
            <button
              onClick={() => {
                spotifyLogout();
                setSpotifyAuthenticated(false);
                window.location.reload();
              }}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm"
              title="Logout from Spotify"
            >
              <LogOut size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2"
          >
            <X size={24} />
          </button>
        </div>
      </div>
      
      {/* Now Playing */}
      {currentSong && (
        <div className="bg-gradient-to-r from-purple-800/50 to-pink-800/50 p-6">
          <div className="flex items-center gap-4">
            <img
              src={currentSong.albumArt}
              alt={currentSong.album}
              className="w-20 h-20 rounded-lg shadow-lg"
            />
            <div className="flex-1">
              <h3 className="text-white font-bold text-xl">{currentSong.name}</h3>
              <p className="text-white/80">{currentSong.artist}</p>
              <p className="text-white/60 text-sm">{currentSong.album}</p>
            </div>
            
            {/* Reactions */}
            <div className="flex gap-2">
              {['❤️', '🔥', '👍', '😍'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => reactToSong(emoji)}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          
          {/* Active Reactions */}
          {Object.keys(reactions).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(reactions).map(([user, emoji]) => (
                <div
                  key={user}
                  className="bg-white/10 rounded-full px-3 py-1 text-sm text-white flex items-center gap-1 animate-bounce"
                >
                  <span>{emoji}</span>
                  <span>{user}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-white/60 text-xs">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {/* Previous */}}
                className="text-white/60 hover:text-white transition-colors"
              >
                <SkipBack size={24} />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-white text-purple-600 p-3 rounded-full hover:scale-110 transition-transform"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button
                onClick={skipSong}
                className="text-white/60 hover:text-white transition-colors"
              >
                <SkipForward size={24} />
              </button>
            </div>
            
            {/* Volume */}
            <div className="flex items-center gap-2">
              <VolumeX size={20} className="text-white/60" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-24 h-1 bg-white/20 rounded-full accent-pink-400"
              />
              <Volume2 size={20} className="text-white/60" />
            </div>
            
            {/* Skip Vote */}
            <button
              onClick={voteSkip}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              <ThumbsUp size={16} />
              Skip ({Object.keys(skipVotes).length}/{participants.length + 1})
            </button>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {[
          { id: 'queue', label: 'Queue', icon: List },
          { id: 'search', label: 'Search', icon: Search },
          { id: 'history', label: 'History', icon: History }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'text-white bg-white/10 border-b-2 border-pink-400'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <div className="space-y-2">
            {queue.length === 0 ? (
              <div className="text-center py-12">
                <Music className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No songs in queue</p>
                <p className="text-white/40 text-sm mt-2">Search and add songs to get started!</p>
              </div>
            ) : (
              queue.sort((a, b) => b.votes - a.votes).map((song, index) => (
                <div
                  key={song.id}
                  className="bg-white/5 hover:bg-white/10 rounded-lg p-3 flex items-center gap-3 transition-all"
                >
                  <div className="text-white/60 font-bold w-6">{index + 1}</div>
                  <img
                    src={song.albumArt}
                    alt={song.album}
                    className="w-12 h-12 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{song.name}</p>
                    <p className="text-white/60 text-sm truncate">{song.artist}</p>
                    <p className="text-white/40 text-xs">Added by {song.addedBy}</p>
                  </div>
                  <button
                    onClick={() => voteSong(song.id)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-all ${
                      song.voters.includes(room?.localParticipant?.identity)
                        ? 'bg-pink-500 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    <ChevronUp size={16} />
                    {song.votes}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            {/* Platform Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSearchPlatform('spotify');
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSuggestions(false);
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  searchPlatform === 'spotify'
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Music size={16} />
                  <span>Spotify</span>
                </div>
                <span className="text-xs opacity-75">
                  {spotifyAuthenticated && isSpotifyReady ? 'Full songs! ⭐' : '30s previews'}
                </span>
              </button>
              <button
                onClick={() => {
                  setSearchPlatform('youtube');
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSuggestions(false);
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-lg font-medium transition-all relative ${
                  searchPlatform === 'youtube'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Radio size={16} />
                  <span>YouTube</span>
                </div>
                <span className="text-xs opacity-75">Full songs! ⭐</span>
              </button>
            </div>
            
            {/* Search Input with Live Suggestions */}
            <div className="relative search-container-music">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 z-10" />
              <input
                type="text"
                placeholder={`Search ${searchPlatform === 'spotify' ? 'Spotify' : 'YouTube Music'}...`}
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSuggestions(true);
                }}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              
              {/* Live Search Suggestions Dropdown */}
              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gradient-to-br from-purple-900/98 to-pink-900/98 backdrop-blur-xl border-2 border-pink-400/50 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50">
                  <div className="p-2 space-y-2">
                    {searchResults.map(song => (
                      <button
                        key={song.id}
                        onClick={() => {
                          addToQueue(song);
                          setShowSuggestions(false);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="w-full bg-white/10 hover:bg-gradient-to-r hover:from-purple-500/30 hover:to-pink-500/30 rounded-lg p-3 flex items-center gap-3 transition-all text-left group border border-white/10 hover:border-pink-400/50"
                      >
                        <img
                          src={song.albumArt}
                          alt={song.album}
                          className="w-14 h-14 rounded-lg flex-shrink-0 shadow-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-base font-semibold truncate group-hover:text-pink-300 transition-colors">
                            {song.name}
                          </p>
                          <p className="text-white/70 text-sm truncate">{song.artist}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              song.platform === 'spotify' 
                                ? 'bg-green-500/30 text-green-200 border border-green-400/30'
                                : 'bg-red-500/30 text-red-200 border border-red-400/30'
                            }`}>
                              {song.platform === 'spotify' ? '🎵 Spotify' : '📺 YouTube'}
                            </span>
                            {song.duration > 0 && (
                              <span className="text-xs text-white/50 font-medium">{formatTime(song.duration)}</span>
                            )}
                            {song.platform === 'spotify' && !song.hasPreview && (
                              <span className="text-xs text-yellow-400/80">⚠️ No preview</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 bg-pink-500 group-hover:bg-pink-400 rounded-lg p-2 transition-all">
                          <Plus size={20} className="text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Loading indicator */}
            {isSearching && (
              <div className="flex items-center justify-center gap-2 text-white/60 text-sm py-4">
                <div className="w-4 h-4 border-2 border-white/20 border-t-pink-400 rounded-full animate-spin"></div>
                <span>Searching {searchPlatform === 'spotify' ? 'Spotify' : 'YouTube'}...</span>
              </div>
            )}
            
            {/* Empty state */}
            {!isSearching && searchResults.length === 0 && searchQuery.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 text-lg font-medium">Search for songs on {searchPlatform === 'spotify' ? 'Spotify' : 'YouTube'}</p>
                <p className="text-white/40 text-sm mt-2">Type to see live suggestions</p>
                <div className="mt-6 space-y-3 max-w-md mx-auto">
                  {searchPlatform === 'spotify' ? (
                    spotifyAuthenticated && isSpotifyReady ? (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <p className="text-green-200 text-sm font-medium">
                          ✅ Full Spotify songs with Premium!
                        </p>
                        <p className="text-green-200/70 text-xs mt-1">
                          You're connected and can play complete tracks
                        </p>
                      </div>
                    ) : (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                        <p className="text-yellow-200 text-sm font-medium">
                          ℹ️ Spotify provides 30-second previews
                        </p>
                        <p className="text-yellow-200/70 text-xs mt-1">
                          Click "Connect Spotify Premium" for full songs
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-blue-200 text-sm font-medium">
                        💡 YouTube provides full songs
                      </p>
                      <p className="text-blue-200/70 text-xs mt-1">
                        Best for uninterrupted listening
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            {playHistory.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No play history yet</p>
              </div>
            ) : (
              playHistory.map((song, index) => (
                <div
                  key={index}
                  className="bg-white/5 rounded-lg p-3 flex items-center gap-3"
                >
                  <img
                    src={song.albumArt}
                    alt={song.album}
                    className="w-12 h-12 rounded opacity-60"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 font-medium truncate">{song.name}</p>
                    <p className="text-white/60 text-sm truncate">{song.artist}</p>
                  </div>
                  <button
                    onClick={() => addToQueue(song)}
                    className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime * 1000)}
        onLoadedMetadata={(e) => setDuration(e.target.duration * 1000)}
        onEnded={playNext}
        volume={volume / 100}
      />
    </div>
  );
};

export default PassTheAuxEnhanced;
