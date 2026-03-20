import pLimit from 'p-limit';
import path from 'path';
import fs from 'fs';
import { logger, loadState, saveState } from './utils.js';
import { getTmdbMetadata } from './tmdb.js';
import { fetchMovies, extractSources } from './hdFilmizle.js';
import { detectAndProcessSeries } from './series.js';

const OUTPUT_FILE = path.join(process.cwd(), 'src', 'data', 'botData.json');

// Concurrency limit - 20 parallel requests (lowered slightly for stability with new site)
const CONCURRENCY_LIMIT = 20; 
const limit = pLimit(CONCURRENCY_LIMIT);

async function processMovie(movieBase, state, isInternalCall = false) {
    if (!movieBase || !movieBase.url) {
        logger.warn(`Skipping movie with missing URL: ${movieBase?.title || 'unknown'}`);
        return;
    }
    if (state.processedUrls && state.processedUrls.includes(movieBase.url)) {
        return; // Skip already processed (Resume feature)
    }

    logger.info(`Processing: ${movieBase.title}`);
    
    try {
        // 1. Extract Sources (Dub, Sub, Original)
        const sourcesResult = await extractSources(movieBase.url);
        const { sources, subtitles } = sourcesResult;

        // Only add if at least one source works
        if (!sources.dub && !sources.sub && !sources.original) {
            logger.warn(`No working source found for ${movieBase.title}, skipping.`);
            state.processedUrls.push(movieBase.url);
            return;
        }
        
        // 2. Get TMDB Metadata
        const tmdbData = await getTmdbMetadata(movieBase.title);

        const movieObject = {
            id: tmdbData?.tmdbId || `hd-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            title: tmdbData?.title || movieBase.title,
            originalTitle: tmdbData?.originalTitle,
            rating: movieBase.rating || tmdbData?.rating || '?',
            year: movieBase.year || tmdbData?.year || '?',
            genre: tmdbData?.genres || movieBase.genre || 'Film',
            label: sources.dub ? 'Türkçe Dublaj' : 'Türkçe Altyazılı',
            image: tmdbData?.poster || movieBase.image,
            backdrop: tmdbData?.backdrop || movieBase.image,
            description: tmdbData?.description || "HDFilmizle kaynağından otomatik olarak çekildi.",
            sourceUrl: movieBase.url,
            directSource: sources.dub || null,
            directSourceAlt: sources.sub || null,
            directSourceOriginal: sources.original || null,
            subtitles: subtitles || [],
            isBot: true,
            type: tmdbData?.type || 'movie'
        };

        // Update State
        state.items.push(movieObject);
        state.processedUrls.push(movieBase.url);

        // 3. New Feature: Movie Series Detection & Auto-Collection
        if (!isInternalCall && tmdbData?.collectionId) {
            await detectAndProcessSeries(tmdbData, state, limit, processMovie);
        }

    } catch (e) {
        logger.error(`Error processing ${movieBase.title}: ${e.message}`);
    }
}

async function startScraper() {
    logger.info("Initializing HDFilmizle Migration Scraper (Triple Source Support)...");
    const state = loadState();
    
    // Scrape first 5 pages for a quick start
    const MAX_PAGES = 998; 

    for (let page = 1; page <= MAX_PAGES; page++) {
        logger.info(`Fetching Page ${page}/${MAX_PAGES}...`);

        try {
            const baseMovies = await fetchMovies(page);

            if (baseMovies.length === 0) {
                logger.warn(`No movies found on page ${page}. Ending.`);
                break;
            }

            logger.info(`Found ${baseMovies.length} movies on page ${page}. Enqueueing...`);

            // Process all movies on this page concurrently
            const promises = baseMovies.map(movieBase => limit(() => processMovie(movieBase, state)));
            await Promise.all(promises);

            // Save State & Output periodically
            saveState(state);
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(state.items, null, 2));

        } catch (pageError) {
            logger.error(`Failed to scrape page ${page}: ${pageError.message}`);
        }
    }

    logger.info("\n=== SCRAPING COMPLETE ===");
    logger.info(`Total Movies Exported: ${state.items.length}`);
}

startScraper();

