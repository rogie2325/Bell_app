const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyD8JhdVLxGw4b1kp-lDHrTHxNxb1U7KYqk';

export async function searchNetflix(query) {
  try {
    // Just use YouTube API to search for movie/show trailers
    const searchQuery = `${query} official trailer`;
    console.log('🔍 Searching YouTube for movie trailers:', searchQuery);
    
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=20&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.warn('No results found');
      return [];
    }
    
    // Map YouTube results to look like movie results
    const results = data.items.map(item => {
      const snippet = item.snippet;
      const videoId = item.id.videoId;
      
      // Extract year from title if possible
      const yearMatch = snippet.title.match(/\((\d{4})\)/) || snippet.title.match(/(\d{4})/);
      const year = yearMatch ? yearMatch[1] : new Date().getFullYear();
      
      return {
        id: videoId,
        title: snippet.title.replace(/official trailer/gi, '').replace(/\(\d{4}\)/g, '').trim(),
        description: snippet.description || 'Watch the trailer together!',
        image: snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url,
        year: year,
        rating: null,
        genres: ['Trailer'],
        type: 'movie',
        imdbId: null,
        platforms: ['YouTube'],
        streamingInfo: {},
        trailerUrl: `https://www.youtube.com/watch?v=${videoId}`,
        channelTitle: snippet.channelTitle
      };
    });
    
    console.log('✅ Found', results.length, 'movie trailers');
    return results;
  } catch (error) {
    console.error('❌ Error searching for trailers:', error);
    return [];
  }
}

export const getNetflixTitles = async () => {
  if (!RAPIDAPI_KEY) {
    throw new Error('Netflix API not configured. Add VITE_RAPIDAPI_KEY to .env');
  }

  try {
    console.log('📋 Fetching Netflix titles list...');
    
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/v1/netflix/titles`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Netflix API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Netflix titles fetched:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Failed to get Netflix titles:', error);
    throw error;
  }
};

export const getNetflixGenres = () => {
  return [
    'Action',
    'Adventure',
    'Animation',
    'Comedy',
    'Crime',
    'Documentary',
    'Drama',
    'Family',
    'Fantasy',
    'Horror',
    'Mystery',
    'Romance',
    'Sci-Fi',
    'Thriller',
    'Western'
  ];
};
