import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { axiosClient, logger } from './utils.js';

/**
 * Efficiently extracts both Türkçe Dublaj (tr) and Altyazılı (en) sources.
 * This saves an extra network request per movie by fetching the page only once.
 */
export async function extractAllSources(pageUrl) {
    try {
        // Fetch the page once
        const { data: html } = await axiosClient.get(pageUrl);
        
        // Extract from HTML and primary API
        const trData = await parseDirectFromHtml(html, pageUrl, 'tr');
        const enData = await parseDirectFromHtml(html, pageUrl, 'en');
        
        // Merge subtitles from both source types and the HTML tags
        const htmlSubtitles = await extractSubtitles(html);
        const allSubtitles = [
            ...htmlSubtitles,
            ...(trData.tracks || []),
            ...(enData.tracks || [])
        ];

        // Unique by src to avoid duplicates
        const uniqueSubtitles = Array.from(new Map(allSubtitles.map(item => [item.src, item])).values());

        return { 
            sourceTr: trData.source, 
            sourceEn: enData.source, 
            subtitles: uniqueSubtitles 
        };
    } catch (error) {
        if (error.response && [403, 503].includes(error.response.status)) {
            logger.warn(`Anti-bot encountered on ${pageUrl}. Falling back to Puppeteer...`);
            return await puppeteerFallbackMulti(pageUrl);
        }
        logger.error(`Failed to fetch sources for ${pageUrl}: ${error.message}`);
        return { sourceTr: null, sourceEn: null, subtitles: [] };
    }
}

async function parseDirectFromHtml(html, pageUrl, videoType) {
    const $ = cheerio.load(html);
    const scriptTags = $('script').toArray();
    let videoId = null;

    for (let i = 0; i < scriptTags.length; i++) {
        const scriptContent = $(scriptTags[i]).html();
        if (scriptContent && scriptContent.includes('var videoId =')) {
            const matchId = scriptContent.match(/var videoId = '([^']+)'/);
            if (matchId && matchId[1]) {
                videoId = matchId[1];
            }
            break;
        }
    }

    if (videoId) {
        try {
            const baseUrl = new URL(pageUrl).origin;
            const apiUrl = `${baseUrl}/get-source?movie_id=${videoId}&type=${videoType}`;
            const axios = (await import('axios')).default;
            const { data } = await axios.get(apiUrl, {
                timeout: 10000,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': pageUrl,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (data && data.sources && data.sources.length > 0) {
                let bestSource = data.sources[0].src;
                const hdSource = data.sources.find(s => s.label === '1080p');
                if (hdSource) bestSource = hdSource.src;
                
                // Also get tracks if available in this response
                const tracks = data.tracks || [];
                return { source: bestSource, tracks: tracks.filter(t => t.kind === 'captions' || t.kind === 'subtitles' || t.kind === 'thumbnails') };
            }
        } catch (e) {
            if (e.response && e.response.status === 500) {
                return { source: null, tracks: [] };
            }
            logger.error(`Failed to fetch /get-source API for ${videoId}: ${e.message}`);
        }
    }
    return { source: null, tracks: [] };
}

/**
 * Parses subtitle tracks from the get-source API response or HTML.
 */
async function extractSubtitles(html) {
    const $ = cheerio.load(html);
    const tracks = [];
    
    // Check for tracks in the HTML script tags (sometimes embedded in player config)
    const scriptContent = $('script').map((i, el) => $(el).html()).get().join(' ');
    const trackMatch = scriptContent.match(/tracks:\s*(\[[^\]]+\])/);
    
    if (trackMatch) {
        try {
            const parsedTracks = JSON.parse(trackMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":'));
            return parsedTracks.filter(t => t.kind === 'captions' || t.kind === 'subtitles');
        } catch (e) {}
    }
    
    return tracks;
}

async function puppeteerFallbackMulti(url) {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        logger.info(`Navigating to ${url} via Puppeteer...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for Cloudflare JS challenge
        await new Promise(r => setTimeout(r, 5000));

        const html = await page.content();
        
        // Extract both from the Puppeteer content
        const trData = await parseDirectFromHtml(html, url, 'tr');
        const enData = await parseDirectFromHtml(html, url, 'en');
        const htmlSubtitles = await extractSubtitles(html);
        
        const allSubtitles = [
            ...htmlSubtitles,
            ...(trData.tracks || []),
            ...(enData.tracks || [])
        ];
        
        const uniqueSubtitles = Array.from(new Map(allSubtitles.map(item => [item.src, item])).values());
        
        if (trData.source || enData.source) {
            logger.info(`Puppeteer successfully bypassed anti-bot and extracted source(s) & subtitles.`);
        } else {
             logger.warn(`Puppeteer bypassed anti-bot but found no video IDs.`);
        }
        
        return { sourceTr: trData.source, sourceEn: enData.source, subtitles: uniqueSubtitles };

    } catch (err) {
        logger.error(`Puppeteer multi-fallback failed for ${url}: ${err.message}`);
        return { sourceTr: null, sourceEn: null, subtitles: [] };
    } finally {
        if (browser) await browser.close();
    }
}
