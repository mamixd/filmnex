import * as cheerio from 'cheerio';
import { axiosClient, logger } from './utils.js';

const BASE_URL = 'https://www.hdfilmizle.life';

// Vidrame Decoding Logic (Reverse-engineered from player source)
const VIDRAME_DECODER = (function() {
    const splitList = '|var|replace|function||return|this|rs|rr|Z||||_|EE|split||reverse|join|zA|String|fromCharCode|90|122|charCodeAt|13|26|||ee|btoa|dd|while|length|atob'.split('|');
    const p = '1 e={7:3(s){5 s.f(\'\').h().i(\'\')},8:3(s){5 s.2(/[a-j-9]/g,3(c){5 k.l((c<=\'9\'?m:n)>=(c=c.o(0)+p)?c:c-q)})},t:3(s){1 r=6.7(s);1 a=6.8(r);1 b=u(a);5 b.2(/\\+/g,\'-\').2(/\\//g,\'d\').2(/=+$/,\'\')},v:3(s){s=s.2(/-/g,\'+\').2(/d/g,\'/\');w(s.x%4!==0){s+=\'=\'}1 a=y(s);1 b=6.8(a);5 6.7(b)}};';
    const r = {};
    const e = (c) => c.toString(35);
    for (let c = 0; c < 35; c++) r[e(c)] = splitList[c] || e(c);
    const code = p.replace(/\b\w+\b/g, (t) => r[t] || t).replace('var EE', 'globalEE');
    
    let globalEE;
    try {
        // Node 16+ has atob/btoa globally
        eval(code);
        return globalEE;
    } catch (err) {
        return null; // Fallback handled later
    }
})();

async function getVideoInfo(iframeUrl) {
    if (!iframeUrl.includes('vidrame.pro') || !VIDRAME_DECODER) return { video: null, subtitles: [] };
    try {
        const { data: playerHtml } = await axiosClient.get(iframeUrl, {
            headers: { 'Referer': BASE_URL }
        });
        
        const videoMatch = playerHtml.match(/file:\s*EE\.dd\("(.*?)"\)/);
        const video = videoMatch ? VIDRAME_DECODER.dd(videoMatch[1]) : null;
        
        const subtitles = [];
        // Extract .vtt tracks from JWPlayer config or trAltyazi variables
        const tracksMatch = playerHtml.match(/"file":\s*"(.*?\.vtt)"/g);
        if (tracksMatch) {
            // User specified: 2nd track (index 1) is Turkish, 4th track (index 3) is English
            const trTrack = tracksMatch[1];
            const enTrack = tracksMatch[3];

            const processTrack = (trackMatch, label, isDefault) => {
                let url = trackMatch.match(/"file":\s*"(.*?\.vtt)"/)?.[1];
                if (url) {
                    url = url.replace(/\\/g, '');
                    if (url.startsWith('/')) {
                        url = `https://${new URL(iframeUrl).hostname}${url}`;
                    }
                    subtitles.push({
                        label,
                        srclang: label === 'Turkish' ? 'tr' : 'en',
                        src: url,
                        default: isDefault
                    });
                }
            };

            if (trTrack) processTrack(trTrack, 'Turkish', true);
            if (enTrack) processTrack(enTrack, 'English', false);
        }
        
        return { video, subtitles };
    } catch (e) {
        logger.error(`Error fetching video info from ${iframeUrl}: ${e.message}`);
    }
    return { video: null, subtitles: [] };
}

/**
 * Scrapes the movie grid from a given page number.
 */
export async function fetchMovies(page = 1) {
    const url = page === 1 ? `${BASE_URL}/` : `${BASE_URL}/page/${page}/`;
    try {
        logger.info(`Fetching movie grid from: ${url}`);
        const { data: html } = await axiosClient.get(url);
        const $ = cheerio.load(html);
        const movies = [];

        $('.poster').each((i, el) => {
            const $el = $(el);
            const relativeUrl = $el.attr('href');
            const title = $el.attr('title') || $el.find('.title').text().trim();
            const year = $el.find('.poster-year').text().trim();
            const rating = $el.find('.poster-imdb').text().replace(',', '.').trim() || 'N/A';
            const genre = $el.find('.poster-genres').text().trim();
            let image = $el.find('img').attr('data-src') || $el.find('img').attr('src');

            if (image && !image.startsWith('http')) {
                image = BASE_URL + image;
            }

            if (relativeUrl) {
                movies.push({
                    title,
                    url: relativeUrl.startsWith('http') ? relativeUrl : BASE_URL + relativeUrl,
                    year,
                    rating,
                    genre,
                    image,
                    type: 'movie'
                });
            }
        });

        return movies;
    } catch (error) {
        logger.error(`Error fetching page ${page}: ${error.message}`);
        return [];
    }
}

/**
 * Extracts video sources (Dub, Sub, Original) from a movie page.
 */
export async function extractSources(movieUrl) {
    try {
        const { data: html } = await axiosClient.get(movieUrl);
        const $ = cheerio.load(html);
        
        const scripts = $('script').toArray();
        let partsData = null;

        for (const script of scripts) {
            const content = $(script).html();
            if (content && content.includes('let parts')) {
                const match = content.match(/let parts\s*=\s*(\[.*?\]);?/s);
                if (match) {
                    partsData = match[1];
                    break;
                }
            }
        }
        
        const result = {
            sources: {
                dub: null,
                sub: null,
                original: null
            },
            subtitles: []
        };

        if (partsData) {
            try {
                const parts = JSON.parse(partsData.trim());
                
                for (const part of parts) {
                    const iframeMatch = part.data.match(/src=["\\]+(.*?)["\\]+/);
                    let iframeSrc = iframeMatch?.[1];
                    
                    if (iframeSrc) {
                        iframeSrc = iframeSrc.replace(/\\/g, '');
                        const info = await getVideoInfo(iframeSrc);
                        const directUrl = info.video || iframeSrc;
                        
                        // Collect subtitles if any
                        if (info.subtitles && info.subtitles.length > 0) {
                            info.subtitles.forEach(sub => {
                                if (!result.subtitles.find(s => s.src === sub.src)) {
                                    result.subtitles.push(sub);
                                }
                            });
                        }
                        
                        if (part.lang === 'tr' || part.name?.toLowerCase().includes('dublaj')) {
                            result.sources.dub = directUrl;
                        } else if (part.lang === 'en' || part.name?.toLowerCase().includes('altyaz')) {
                            result.sources.sub = directUrl;
                        } else if (part.lang === 'dual') {
                            result.sources.dub = directUrl;
                            result.sources.sub = directUrl;
                            result.sources.original = directUrl;
                        } else {
                            if (!result.sources.original) result.sources.original = directUrl;
                        }
                    }
                }
            } catch (e) {
                logger.error(`Error parsing parts for ${movieUrl}: ${e.message}`);
            }
        }

        if (!result.sources.dub && !result.sources.sub) {
            const iframe = $('.vpx iframe').first();
            const src = iframe.attr('data-src') || iframe.attr('src');
            if (src) {
                const info = await getVideoInfo(src);
                result.sources.dub = info.video || src;
                if (info.subtitles) result.subtitles.push(...info.subtitles);
            }
        }

        return result;
    } catch (error) {
        logger.error(`Error extracting sources for ${movieUrl}: ${error.message}`);
        return { sources: { dub: null, sub: null, original: null }, subtitles: [] };
    }
}

/**
 * Searches for a movie on the source site by title
 */
export async function searchOnSource(title) {
    try {
        const searchUrl = `${BASE_URL}/search/`;
        logger.info(`Searching source for: ${title} (POST: ${searchUrl})`);
        
        // The subagent found it uses a POST request with query=TERM
        const response = await axiosClient.post(searchUrl, `query=${encodeURIComponent(title)}`, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest', // often required for AJAX
                'Referer': BASE_URL
            }
        });

        // The response is a JSON array
        const results = response.data;
        
        if (!Array.isArray(results) || results.length === 0) {
            logger.warn(`No search results for "${title}"`);
            return null;
        }

        // Search through results for the best match
        // Result object usually has: name, slug, year, etc.
        const match = results.find(r => 
            r.name.toLowerCase().includes(title.toLowerCase()) || 
            title.toLowerCase().includes(r.name.toLowerCase())
        );

        if (match && match.slug) {
            // Usually the URL is BASE_URL + movie + slug
            // But let's check if the slugs are fully qualified or just the end part
            const movieUrl = match.slug.startsWith('http') ? match.slug : `${BASE_URL}/film/${match.slug}/`;
            logger.info(`Found match: ${match.name} -> ${movieUrl}`);
            return movieUrl;
        }

        return null;
    } catch (e) {
        logger.error(`Search failed for "${title}": ${e.message}`);
        return null;
    }
}

