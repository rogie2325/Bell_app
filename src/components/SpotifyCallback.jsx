import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken, storeTokens } from '../utils/spotifyAuth';

const SpotifyCallback = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      
      if (code) {
        try {
          const data = await getAccessToken(code);
          
          if (data.access_token) {
            storeTokens(data.access_token, data.refresh_token, data.expires_in);
            console.log('✅ Spotify authentication successful!');
            
            // Check if user was in a room before authenticating
            const returnRoom = sessionStorage.getItem('spotify_return_room');
            if (returnRoom) {
              sessionStorage.removeItem('spotify_return_room');
              console.log('🔄 Returning to room:', returnRoom);
              // Redirect back to the room they were in
              navigate('/', { state: { autoJoinRoom: returnRoom } });
            } else {
              // Redirect to home
              navigate('/');
            }
          } else {
            console.error('❌ Failed to get access token');
            navigate('/');
          }
        } catch (error) {
          console.error('❌ Error during authentication:', error);
          navigate('/');
        }
      } else {
        navigate('/');
      }
    };
    
    handleCallback();
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white/20 border-t-pink-400 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-white text-xl font-semibold">Connecting to Spotify...</h2>
        <p className="text-white/60 mt-2">Please wait while we complete the authentication</p>
      </div>
    </div>
  );
};

export default SpotifyCallback;
