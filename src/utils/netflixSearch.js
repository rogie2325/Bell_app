const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'netflix-movies-and-tv-shows-api-by-apirobots.p.rapidapi.com';

export const searchNetflix = async (query, page = 1) => {
  if (!RAPIDAPI_KEY) {
    console.error('⚠️ Netflix API not configured. Add VITE_RAPIDAPI_KEY to .env');
    throw new Error('Netflix API not configured');
  }

  if (!query || query.trim() === '') {
    return [];
  }

  try {
    console.log(`🔍 Searching Netflix for: "${query}" (page ${page})`);
    
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/v1/netflix?name=${encodeURIComponent(query)}&page=${page}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Netflix API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Netflix API response:`, data);
    
    // Map Netflix results to our format
    const results = data.results?.map(item => ({
      id: item.id || `netflix-${Date.now()}-${Math.random()}`,
      title: item.title || item.name || 'Unknown Title',
      type: item.type || 'movie', // 'movie' or 'series'
      year: item.year || item.release_year || 'N/A',
      rating: item.rating || item.imdb_rating || 'N/A',
      description: item.description || item.synopsis || 'No description available',
      image: item.image_url || item.poster || item.thumbnail || 'https://via.placeholder.com/300x450?text=No+Image',
      genres: item.genres || [],
      cast: item.cast || [],
      director: item.director || 'Unknown',
      runtime: item.runtime || item.duration || 0,
      seasons: item.seasons || item.number_of_seasons,
      trailerUrl: item.trailer_url || item.trailer,
      netflixUrl: item.netflix_url || item.url,
      platform: 'netflix'
    })) || [];
    
    console.log(`📺 Found ${results.length} Netflix titles`);
    return results;
    
  } catch (error) {
    console.error('❌ Netflix search failed:', error);
    throw error;
  }
};

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
