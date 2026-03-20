import { axiosClient, logger } from './utils.js';

const TMDB_API_KEY = 'aa772c74751e0ed9d9368a5e5423c448';

/**
 * Searches TMDB and fetches full Turkish metadata
 */
export async function getTmdbMetadata(rawTitle) {
    try {
        // Clean title
        const cleaningRegex = /(izle|full hd|dublaj|altyazılı|filmi|1080p|720p|hdf|film|izle|altyazili|türkçe|dublaj|tek parça|hd|altyazılı)/gi;
        let query = rawTitle.split(/[-:()]/)[0].replace(cleaningRegex, '').trim();

        // 1. Search (Turkish first)
        let response = await axiosClient.get(`https://api.themoviedb.org/3/search/multi`, {
            params: { api_key: TMDB_API_KEY, query, language: 'tr-TR' }
        });
        
        let results = response.data.results.filter(r => r.media_type !== 'person');

        // 2. Fallback to English search if no TR results
        if (results.length === 0) {
            response = await axiosClient.get(`https://api.themoviedb.org/3/search/multi`, {
                params: { api_key: TMDB_API_KEY, query }
            });
            results = response.data.results.filter(r => r.media_type !== 'person');
        }

        if (results.length === 0) return null;

        const bestMatch = results[0];
        const tmdbId = bestMatch.id;
        const typeStr = bestMatch.media_type === 'tv' ? 'tv' : 'movie';

        // 3. Get Full Details
        const detailsResponse = await axiosClient.get(`https://api.themoviedb.org/3/${typeStr}/${tmdbId}`, {
            params: { api_key: TMDB_API_KEY, language: 'tr-TR' }
        });
        
        const data = detailsResponse.data;

        return {
            tmdbId: `tmdb-${tmdbId}`,
            title: data.title || data.name || rawTitle,
            originalTitle: data.original_title || data.original_name,
            description: data.overview || null,
            year: (data.release_date || data.first_air_date || '').split('-')[0] || 'Bilinmiyor',
            rating: data.vote_average ? data.vote_average.toFixed(1) : '?',
            genres: data.genres ? data.genres.map(g => g.name).join(', ') : 'Film',
            poster: data.poster_path ? `https://image.tmdb.org/t/p/original${data.poster_path}` : null,
            backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
            type: typeStr,
            collectionId: data.belongs_to_collection ? data.belongs_to_collection.id : null
        };
    } catch (e) {
        logger.error(`TMDB lookup failed for "${rawTitle}": ${e.message}`);
        return null;
    }
}

/**
 * Fetches all movies in a collection/series
 */
export async function getCollectionParts(collectionId) {
    try {
        const response = await axiosClient.get(`https://api.themoviedb.org/3/collection/${collectionId}`, {
            params: { api_key: TMDB_API_KEY, language: 'tr-TR' }
        });

        return response.data.parts.map(part => ({
            tmdbId: `tmdb-${part.id}`,
            title: part.title,
            originalTitle: part.original_title,
            year: (part.release_date || '').split('-')[0] || 'Bilinmiyor',
            poster: part.poster_path ? `https://image.tmdb.org/t/p/original${part.poster_path}` : null,
            type: 'movie'
        }));
    } catch (e) {
        logger.error(`Failed to fetch collection ${collectionId}: ${e.message}`);
        return [];
    }
}
