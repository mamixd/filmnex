const axios = require('axios');

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

const searchMovie = async (title, year = null) => {
    try {
        let cleanTitle = title.replace(/izle|hd|türkçe|dublaj|altyazılı|1080p|720p|tek parça|full|fragman/gi, '').trim();
        
        let url = `${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(cleanTitle)}&language=tr-TR`;
        
        let results = [];
        
        // 1. Aşama: Yıla göre katı arama yap (farklı yıllardaki devam filmlerini elemek için)
        if (year) {
            const resWithYear = await axios.get(`${url}&year=${year}`);
            if (resWithYear.data.results && resWithYear.data.results.length > 0) {
                results = resWithYear.data.results;
            }
        }
        
        // 2. Aşama: Eğer yılla aradığında bulamadıysa (veya yıl yoksa) normal geniş arama yap
        if (results.length === 0) {
            const resNoYear = await axios.get(url);
            results = resNoYear.data.results || [];
        }
        
        if (results.length > 0) {
            let movie = results[0];
            
            // HASSAS EŞLEŞTİRME (VURUCU GÜÇ): İlk gelene razı olma, BİREBİR aynı adı taşıyanı bul
            const exactMatch = results.find(m => 
                (m.title && m.title.toLowerCase() === cleanTitle.toLowerCase()) || 
                (m.original_title && m.original_title.toLowerCase() === cleanTitle.toLowerCase())
            );
            
            // Eğer ismin tıpatıp aynısı varsa Onu Seç! Yoksa listenin Popüler/En İyi (ilk) sonucuna razı ol.
            if (exactMatch) {
                movie = exactMatch;
            }

            const detailsRes = await axios.get(`${TMDB_BASE_URL}/movie/${movie.id}?api_key=${API_KEY}&language=tr-TR`);
            const details = detailsRes.data;
            
            return {
                tmdbId: details.id.toString(),
                title: details.title,
                original_title: details.original_title,
                description: details.overview,
                releaseDate: details.release_date || null,
                poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
                backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : null,
                rating: details.vote_average ? details.vote_average.toFixed(1).toString() : '0.0',
                year: (details.release_date && details.release_date.length > 3) ? parseInt(details.release_date.split('-')[0]) : new Date().getFullYear(),
                genres: details.genres ? details.genres.map(g => g.name) : []
            };
        }
        return null;
    } catch (error) {
        console.error(`TMDB Arama Hatası (${title}):`, error.message);
        return null;
    }
};

const getMovieById = async (tmdbId) => {
    try {
        const detailsRes = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&language=tr-TR`);
        const details = detailsRes.data;
        
        return {
            tmdbId: details.id.toString(),
            title: details.title,
            original_title: details.original_title,
            description: details.overview,
            releaseDate: details.release_date || null,
            poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
            backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : null,
            rating: details.vote_average ? details.vote_average.toFixed(1).toString() : '0.0',
            year: (details.release_date && details.release_date.length > 3) ? parseInt(details.release_date.split('-')[0]) : new Date().getFullYear(),
            genres: details.genres ? details.genres.map(g => g.name) : []
        };
    } catch (error) {
        console.error(`TMDB ID Get Hatası (${tmdbId}):`, error.message);
        return null;
    }
};

module.exports = { searchMovie, getMovieById };
