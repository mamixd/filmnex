import { logger } from './utils.js';
import { getCollectionParts } from './tmdb.js';
import { searchOnSource } from './hdFilmizle.js';

/**
 * Detects if a movie belongs to a collection and processes all missing parts.
 * 
 * @param {Object} tmdbData - Metadata of the current movie
 * @param {Object} state - Scraper state (processedUrls, items)
 * @param {Function} limit - p-limit instance for concurrency control
 * @param {Function} processMovieFn - Function to process a single movie
 */
export async function detectAndProcessSeries(tmdbData, state, limit, processMovieFn) {
    if (!tmdbData.collectionId) return;

    logger.info(`🎬 Series detected: "${tmdbData.title}" belongs to collection ID ${tmdbData.collectionId}`);

    try {
        const parts = await getCollectionParts(tmdbData.collectionId);
        logger.info(`📁 Found ${parts.length} movies in collection "${tmdbData.title}"`);

        const missingParts = parts.filter(part => {
            const isProcessed = state.items.some(item => item.id === part.tmdbId) || 
                               state.processedUrls.includes(part.tmdbId);
            return !isProcessed;
        });

        if (missingParts.length === 0) {
            logger.info(`✅ All movies in collection "${tmdbData.title}" are already processed.`);
            return;
        }

        logger.info(`🆕 Adding ${missingParts.length} missing movies from the collection...`);

        const promises = missingParts.map(part => limit(async () => {
            logger.info(`🔍 Looking for collection part: "${part.title}" (${part.year})`);
            
            // 1. Try to find on source site
            const sourceUrl = await searchOnSource(part.title);

            if (sourceUrl) {
                logger.info(`🔗 Found source for "${part.title}": ${sourceUrl}`);
                await processMovieFn({ 
                    title: part.title, 
                    url: sourceUrl, 
                    year: part.year,
                    image: part.poster
                }, state, true); // true = isInternalCall to avoid recursive series detection if needed
            } else {
                logger.warn(`⚠️ Could not find source for "${part.title}" on provider. Adding as metadata-only.`);
                
                // Add as metadata-only entry
                const metadataOnly = {
                    id: part.tmdbId,
                    title: part.title,
                    originalTitle: part.originalTitle,
                    year: part.year,
                    image: part.poster,
                    description: "Bu film henüz kaynağımızda bulunmamaktadır. Yakında eklenecektir.",
                    label: "Yakında",
                    isBot: true,
                    type: 'movie',
                    status: 'metadata_only'
                };

                state.items.push(metadataOnly);
                state.processedUrls.push(part.tmdbId);
            }
        }));

        await Promise.all(promises);

    } catch (e) {
        logger.error(`Error processing series for collection ${tmdbData.collectionId}: ${e.message}`);
    }
}
