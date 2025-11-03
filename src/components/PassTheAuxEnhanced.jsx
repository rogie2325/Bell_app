import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Search, Plus, X, Crown, Heart, ThumbsUp, Flame, Music,
  List, Clock, Users, ChevronUp, ChevronDown, Disc3, Radio,
  Share2, Download, MoreVertical, Trash2, History, LogIn, LogOut
} from 'lucide-react';
import { 
  redirectToSpotifyAuth, 
  isAuthenticated, 
  getStoredAccessToken,
  logout as spotifyLogout
} from '../utils/spotifyAuth';
import SpotifyLogo from '../assets/spotify-logo.svg';
import './PassTheAux.css';

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
  const [youtubePlayer, setYoutubePlayer] = useState(null);
  const [isYoutubeReady, setIsYoutubeReady] = useState(false);
  
  const audioRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  
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
  
  // Initialize YouTube IFrame Player API
  useEffect(() => {
    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = () => {
        console.log('✅ YouTube IFrame API Ready');
        setIsYoutubeReady(true);
      };
    } else if (window.YT && window.YT.Player) {
      console.log('✅ YouTube IFrame API already loaded');
      setIsYoutubeReady(true);
    }
  }, []);
  
  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    if (!spotifyAuthenticated) {
      console.log('⚠️ Spotify not authenticated, skipping Web Playback SDK setup');
      return;
    }
    
    const userToken = getStoredAccessToken();
    if (!userToken) {
      console.log('⚠️ No Spotify token found, skipping Web Playback SDK setup');
      return;
    }
    
    const initializePlayer = () => {
      console.log('🎵 Initializing Spotify Web Playback SDK...');
      
      const player = new window.Spotify.Player({
        name: 'Bell - Pass The Aux',
        getOAuthToken: cb => { cb(userToken); },
        volume: volume / 100
      });
      
      // Error handling
      player.addListener('initialization_error', ({ message }) => {
        console.error('❌ Spotify initialization error:', message);
      });
      
      player.addListener('authentication_error', ({ message }) => {
        console.error('❌ Spotify authentication error:', message);
        console.log('💡 Try reconnecting to Spotify');
        setIsSpotifyReady(false);
      });
      
      player.addListener('account_error', ({ message }) => {
        console.error('❌ Spotify account error:', message);
        console.log('⚠️ Spotify Premium required for full playback');
      });
      
      player.addListener('playback_error', ({ message }) => {
        console.error('❌ Spotify playback error:', message);
      });
      
      // Ready
      player.addListener('ready', ({ device_id }) => {
        console.log('✅ Spotify Web Player ready with Device ID:', device_id);
        setDeviceId(device_id);
        setIsSpotifyReady(true);
        
        // Transfer playback to this device immediately
        const transferPlayback = async () => {
          try {
            console.log('🔄 Transferring playback to this device...');
            const response = await fetch('https://api.spotify.com/v1/me/player', {
              method: 'PUT',
              body: JSON.stringify({
                device_ids: [device_id],
                play: false
              }),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
              }
            });
            
            if (response.ok || response.status === 204) {
              console.log('✅ Playback transferred successfully');
            } else {
              console.warn('⚠️ Playback transfer response:', response.status);
            }
          } catch (error) {
            console.error('❌ Failed to transfer playback:', error);
          }
        };
        
        transferPlayback();
      });
      
      // Not Ready
      player.addListener('not_ready', ({ device_id }) => {
        console.log('❌ Device ID has gone offline:', device_id);
        setIsSpotifyReady(false);
      });
      
      // Player state changed
      player.addListener('player_state_changed', (state) => {
        if (!state) {
          console.log('ℹ️ No state from Spotify player');
          return;
        }
        
        console.log('🎵 Spotify player state:', {
          position: state.position,
          duration: state.duration,
          paused: state.paused,
          track: state.track_window?.current_track?.name
        });
        
        setCurrentTime(state.position);
        setDuration(state.duration);
        setIsPlaying(!state.paused);
        
        // Auto-play next when song ends
        if (state.position === 0 && state.paused && state.duration > 0) {
          console.log('⏭️ Song ended, playing next...');
          playNext();
        }
      });
      
      // Connect to the player
      console.log('🔌 Connecting to Spotify...');
      player.connect().then(success => {
        if (success) {
          console.log('✅ The Web Playback SDK successfully connected to Spotify!');
        } else {
          console.error('❌ Failed to connect to Spotify');
        }
      }).catch(error => {
        console.error('❌ Error connecting to Spotify:', error);
      });
      
      setSpotifyPlayer(player);
    };
    
    // Check if SDK is already loaded
    if (window.Spotify) {
      console.log('🎵 Spotify SDK already loaded, initializing player...');
      initializePlayer();
    } else {
      console.log('⏳ Waiting for Spotify SDK to load...');
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
    }
    
    // Cleanup
    return () => {
      if (spotifyPlayer) {
        console.log('🔌 Disconnecting Spotify player...');
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
        previewUrl: null, // YouTube doesn't provide audio-only URLs
        albumArt: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        platform: 'youtube',
        uri: `youtube:${item.id.videoId}`,
        youtubeId: item.id.videoId // Store the video ID for the iframe player
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
        console.log('🎵 Attempting to play Spotify track:', nextSong.name);
        console.log('  - Device ID:', deviceId);
        console.log('  - URI:', nextSong.uri);
        
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          body: JSON.stringify({ uris: [nextSong.uri] }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Spotify API error:', response.status, errorText);
          throw new Error(`Spotify API error: ${response.status}`);
        }
        
        setIsPlaying(true);
        console.log('✅ Playing full Spotify track via Web Playback SDK');
      } catch (error) {
        console.error('❌ Failed to play via Web Playback SDK:', error);
        console.log('⚠️ Falling back to preview (if available)');
        // Fall back to preview URL if Web Playback fails
        if (nextSong.previewUrl && nextSong.previewUrl !== 'null' && nextSong.previewUrl !== null) {
          setIsPlaying(true); // Will use audioRef fallback
        } else {
          console.log('⏭️ No preview available, skipping to next song');
          setTimeout(() => playNext(), 1000);
          return;
        }
      }
    } else {
      setIsPlaying(true); // Will use audioRef for YouTube or Spotify previews
    }
    
    // Initialize YouTube player if it's a YouTube video
    if (nextSong.platform === 'youtube' && isYoutubeReady && nextSong.youtubeId) {
      console.log('📺 Playing YouTube video:', nextSong.name);
      console.log('  - Video ID:', nextSong.youtubeId);
      // YouTube player will be initialized in the useEffect below
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

  // Handle closing Pass The Aux
  const handleClose = () => {
    // Pause music
    setIsPlaying(false);
    
    // Stop Spotify playback if using Web Playback SDK
    if (spotifyPlayer) {
      spotifyPlayer.pause();
    }
    
    // Stop YouTube playback if using YouTube player
    if (youtubePlayer) {
      youtubePlayer.stopVideo();
      youtubePlayer.destroy();
      setYoutubePlayer(null);
    }
    
    // Pause audio element
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Notify parent that music stopped
    if (onMusicStateChange) {
      onMusicStateChange(false);
    }
    
    onClose();
  };

  // End session for everyone
  const handleEndSession = () => {
    if (confirm('End Pass The Aux session for everyone?')) {
      // Stop music
      setIsPlaying(false);
      if (spotifyPlayer) spotifyPlayer.pause();
      if (youtubePlayer) {
        youtubePlayer.stopVideo();
        youtubePlayer.destroy();
        setYoutubePlayer(null);
      }
      if (audioRef.current) audioRef.current.pause();
      
      // Clear everything
      setQueue([]);
      setCurrentSong(null);
      setPlayHistory([]);
      
      // Broadcast end session
      broadcastMessage({
        type: 'END_SESSION'
      });
      
      // Notify parent
      if (onMusicStateChange) {
        onMusicStateChange(false);
      }
      
      onClose();
    }
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
          
          // Play the song for this user too
          if (message.song.platform === 'spotify' && spotifyAuthenticated && isSpotifyReady && deviceId) {
            // Play via Spotify Web Playback SDK
            const userToken = getStoredAccessToken();
            console.log('🎵 Remote playback sync - playing:', message.song.name);
            console.log('  - Device ID:', deviceId);
            console.log('  - URI:', message.song.uri);
            
            fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
              method: 'PUT',
              body: JSON.stringify({ uris: [message.song.uri] }),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
              },
            }).then(response => {
              if (!response.ok) {
                console.error('❌ Remote playback failed:', response.status);
                return response.text().then(text => {
                  console.error('Error details:', text);
                });
              }
              console.log('✅ Remote playback synced successfully');
            }).catch(err => {
              console.error('❌ Failed to sync Spotify playback:', err);
            });
          }
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
          
        case 'END_SESSION':
          // Clear everything when session ends
          setQueue([]);
          setCurrentSong(null);
          setIsPlaying(false);
          setPlayHistory([]);
          if (spotifyPlayer) spotifyPlayer.pause();
          if (youtubePlayer) {
            youtubePlayer.stopVideo();
            youtubePlayer.destroy();
            setYoutubePlayer(null);
          }
          if (audioRef.current) audioRef.current.pause();
          if (onMusicStateChange) onMusicStateChange(false);
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
      // Skip audio element setup if using Spotify Web Playback SDK
      if (currentSong.platform === 'spotify' && spotifyAuthenticated && isSpotifyReady && deviceId) {
        console.log('🎵 Using Spotify Web Playback SDK, skipping audio element');
        // Clear any existing audio source to prevent errors
        audioRef.current.pause();
        audioRef.current.src = '';
        return;
      }
      
      // Skip audio element if it's a YouTube video
      if (currentSong.platform === 'youtube') {
        console.log('📺 Using YouTube IFrame Player, skipping audio element');
        audioRef.current.pause();
        audioRef.current.src = '';
        return;
      }
      
      const audioUrl = currentSong.previewUrl;
      
      // Check if preview URL is available (only for non-Premium playback)
      if (!audioUrl || audioUrl === 'null' || audioUrl === null) {
        console.warn('⚠️ No preview available for:', currentSong.name);
        console.log('⏭️ Skipping to next song...');
        setTimeout(() => playNext(), 1000);
        return;
      }
      
      console.log('🎵 Setting audio source:', audioUrl);
      audioRef.current.src = audioUrl;
      
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('❌ Playback failed:', error);
          console.log('⏭️ Trying next song...');
          setTimeout(() => playNext(), 1000);
        });
      }
    }
  }, [currentSong, isPlaying]);
  
  // Initialize YouTube player when song changes
  useEffect(() => {
    if (currentSong && currentSong.platform === 'youtube' && isYoutubeReady && currentSong.youtubeId) {
      console.log('🎬 Initializing YouTube player for:', currentSong.name);
      
      // Destroy existing player if any
      if (youtubePlayer) {
        console.log('🗑️ Destroying previous YouTube player');
        youtubePlayer.destroy();
      }
      
      // Create new player
      const player = new window.YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: currentSong.youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0
        },
        events: {
          onReady: (event) => {
            console.log('✅ YouTube player ready');
            if (isPlaying) {
              event.target.playVideo();
            }
            setYoutubePlayer(event.target);
          },
          onStateChange: (event) => {
            console.log('📺 YouTube player state:', event.data);
            // 0 = ended, 1 = playing, 2 = paused
            if (event.data === window.YT.PlayerState.ENDED) {
              console.log('⏭️ YouTube video ended, playing next...');
              playNext();
            } else if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            }
          },
          onError: (event) => {
            console.error('❌ YouTube player error:', event.data);
            console.log('⏭️ Skipping to next song...');
            setTimeout(() => playNext(), 1000);
          }
        }
      });
      
      setYoutubePlayer(player);
    }
  }, [currentSong, isYoutubeReady]);
  
  // Control YouTube player based on isPlaying state
  useEffect(() => {
    if (youtubePlayer && currentSong && currentSong.platform === 'youtube') {
      if (isPlaying) {
        console.log('▶️ Playing YouTube video');
        youtubePlayer.playVideo();
      } else {
        console.log('⏸️ Pausing YouTube video');
        youtubePlayer.pauseVideo();
      }
    }
  }, [isPlaying, youtubePlayer]);
  
  // Update volume for all players
  useEffect(() => {
    const volumeValue = volume / 100;
    
    // Update audio element volume
    if (audioRef.current) {
      audioRef.current.volume = volumeValue;
      console.log('🔊 Audio element volume set to:', volumeValue);
    }
    
    // Update Spotify player volume
    if (spotifyPlayer && currentSong && currentSong.platform === 'spotify') {
      spotifyPlayer.setVolume(volumeValue).then(() => {
        console.log('🔊 Spotify player volume set to:', volumeValue);
      }).catch(err => {
        console.warn('⚠️ Failed to set Spotify volume:', err);
      });
    }
    
    // Update YouTube player volume
    if (youtubePlayer && currentSong && currentSong.platform === 'youtube') {
      youtubePlayer.setVolume(volume); // YouTube uses 0-100 scale
      console.log('🔊 YouTube player volume set to:', volume);
    }
  }, [volume, spotifyPlayer, youtubePlayer, currentSong]);
  
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
    <div className="pass-the-aux-enhanced bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden max-w-4xl w-full" style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    }}>
      {/* Header with Glassmorphism */}
      <div className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 backdrop-blur-xl p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 shadow-lg">
            <Disc3 className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              Pass The Aux
              <span className="text-xs bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/30">Enhanced</span>
              {spotifyAuthenticated && isSpotifyReady && (
                <span className="text-xs bg-green-500/80 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-400/50 shadow-lg shadow-green-500/50">
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
          <button
            onClick={handleEndSession}
            className="text-white/80 hover:text-white transition-colors px-3 py-1.5 hover:bg-red-500/20 rounded-lg text-sm font-medium border border-red-500/30"
          >
            End Session
          </button>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      {/* Now Playing */}
      {currentSong && (
        <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/60 backdrop-blur-xl p-8 border-b border-white/10 relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-start gap-6">
              {/* Album Art with Animation */}
              <div className="relative group">
                <img
                  src={currentSong.albumArt}
                  alt={currentSong.album}
                  className={`w-32 h-32 rounded-2xl shadow-2xl shadow-purple-500/50 ${isPlaying ? 'animate-pulse' : ''}`}
                />
                {isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  {currentSong.platform === 'spotify' ? '🎵 Spotify' : '▶️ YouTube'}
                </div>
              </div>
              
              {/* Song Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-3xl mb-2 truncate">{currentSong.name}</h3>
                    <p className="text-white/90 text-lg mb-1 truncate">{currentSong.artist}</p>
                    <p className="text-white/60 text-sm truncate">{currentSong.album}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white/90 border border-white/30">
                        Added by {currentSong.addedBy}
                      </span>
                      {spotifyAuthenticated && isSpotifyReady && currentSong.platform === 'spotify' && (
                        <span className="bg-green-500/80 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white font-semibold border border-green-400/50 flex items-center gap-1">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                          Full Track
                        </span>
                      )}
                      {currentSong.platform === 'youtube' && isYoutubeReady && (
                        <span className="bg-red-500/80 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white font-semibold border border-red-400/50 flex items-center gap-1">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                          YouTube
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Reactions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {['❤️', '🔥', '👍', '😍'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => reactToSong(emoji)}
                        className="text-3xl hover:scale-125 active:scale-95 transition-transform hover:drop-shadow-2xl"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Active Reactions */}
                {Object.keys(reactions).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(reactions).map(([user, emoji]) => (
                      <div
                        key={user}
                        className="bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md rounded-full px-4 py-2 text-sm text-white flex items-center gap-2 animate-bounce border border-white/30 shadow-lg"
                      >
                        <span className="text-xl">{emoji}</span>
                        <span className="font-medium">{user}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Progress Bar */}
                <div className="mt-6 space-y-3">
                  <div className="relative">
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/20">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 transition-all duration-300 shadow-lg shadow-purple-500/50"
                        style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-white/70 text-sm font-medium">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="mt-6 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {/* Previous */}}
                className="text-white/70 hover:text-white transition-all hover:scale-110 p-2 hover:bg-white/10 rounded-full"
              >
                <SkipBack size={28} />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-4 rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg shadow-purple-500/50"
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
              </button>
              <button
                onClick={skipSong}
                className="text-white/70 hover:text-white transition-all hover:scale-110 p-2 hover:bg-white/10 rounded-full"
              >
                <SkipForward size={28} />
              </button>
            </div>
            
            {/* Volume */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <VolumeX size={18} className="text-white/70" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-28 h-2 bg-white/20 rounded-full accent-pink-400 cursor-pointer"
              />
              <Volume2 size={18} className="text-white/70" />
              <span className="text-white/70 text-xs font-medium min-w-[2.5rem] text-right">{volume}%</span>
            </div>
            
            {/* Skip Vote */}
            <button
              onClick={voteSkip}
              className="bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md hover:from-white/30 hover:to-white/20 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 border border-white/30 shadow-lg hover:scale-105 active:scale-95"
            >
              <ThumbsUp size={18} />
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
      <div className="p-4 h-[calc(100vh-400px)] min-h-[500px] max-h-[600px] overflow-y-auto">
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
                {!spotifyAuthenticated ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Save current room info before redirecting
                      if (roomName) {
                        sessionStorage.setItem('spotify_return_room', roomName);
                      }
                      redirectToSpotifyAuth();
                    }}
                    className="text-xs opacity-75 hover:opacity-100 transition-opacity flex items-center gap-1"
                  >
                    <img src={SpotifyLogo} alt="Spotify" className="w-4 h-4" />
                    <span>Connect to Spotify</span>
                  </button>
                ) : (
                  <span className="text-xs opacity-75">Full songs! ⭐</span>
                )}
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
      />
      
      {/* Hidden YouTube Player */}
      <div id="youtube-player" style={{ display: 'none' }}></div>
    </div>
  );
};

export default PassTheAuxEnhanced;
