const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');
const Log = require('../models/Log');

const BASE_URL = 'https://www.hdfilmizle.nl';

async function fetchWithFallback(url, options = {}) {
    let retries = options.retries || 2;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[Net] Fetching ${url} (Attempt ${attempt}/${retries})`);
            const response = await axios.get(url, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': BASE_URL,
                    ...options.headers
                }
            });

            const html = response.data;
            if (html.length < 500 || html.includes('Just a moment...') || (html.includes('Submit') && html.includes('Cloudflare'))) {
                throw new Error('Cloudflare challenge detected in HTML');
            }
            return html;
        } catch (error) {
            const isCloudflare = error.message.includes('Cloudflare challenge') || (error.response && [403, 503].includes(error.response.status));
            console.warn(`[Net] Axios failed on ${url}: ${error.message}`);
            
            if (isCloudflare) {
                console.warn(`[Bypass] Anti-bot detected on ${url}. Switching to Playwright Fallback...`);
                return await playwrightFallback(url);
            }
            
            if (attempt === retries) {
                console.error(`[Net] Max retries reached for ${url}`);
                return null;
            }
            await new Promise(r => setTimeout(r, 2000 * attempt));
        }
    }
    return null;
}

async function playwrightFallback(url) {
    let browser = null;
    try {
        browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
        
        let passed = false;
        for (let i = 0; i < 15; i++) {
            await page.waitForTimeout(1000);
            const html = await page.content();
            if (!html.includes('Just a moment...') && html.length > 1000) {
                passed = true;
                break;
            }
        }
        
        if (passed) {
            console.log(`[Bypass] Successfully bypassed Cloudflare for ${url}`);
            return await page.content();
        } else {
            console.error(`[Bypass] Timeout bypassing Cloudflare for ${url}`);
            return null;
        }
    } catch (e) {
        console.error(`[Bypass] Playwright error on ${url}: ${e.message}`);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

const VIDRAME_DECODER = (function() {
    const splitList = '|var|replace|function||return|this|rs|rr|Z||||_|EE|split||reverse|join|zA|String|fromCharCode|90|122|charCodeAt|13|26|||ee|btoa|dd|while|length|atob'.split('|');
    const p = '1 e={7:3(s){5 s.f(\'\').h().i(\'\')},8:3(s){5 s.2(/[a-j-9]/g,3(c){5 k.l((c<=\'9\'?m:n)>=(c=c.o(0)+p)?c:c-q)})},t:3(s){1 r=6.7(s);1 a=6.8(r);1 b=u(a);5 b.2(/\\+/g,\'-\').2(/\\//g,\'d\').2(/=+$/,\'\')},v:3(s){s=s.2(/-/g,\'+\').2(/d/g,\'/\');w(s.x%4!==0){s+=\'=\'}1 a=y(s);1 b=6.8(a);5 6.7(b)}};';
    const r = {};
    const e = (c) => c.toString(35);
    for (let c = 0; c < 35; c++) r[e(c)] = splitList[c] || e(c);
    const code = p.replace(/\b\w+\b/g, (t) => r[t] || t).replace('var EE', 'globalEE');
    let globalEE;
    try { eval(code); return globalEE; } catch (err) { return null; }
})();

async function getVideoInfo(iframeUrl) {
    if (!iframeUrl.includes('vidrame.pro') || !VIDRAME_DECODER) return { video: null, subtitles: [] };
    try {
        const html = await fetchWithFallback(iframeUrl, { headers: { 'Referer': BASE_URL } });
        if (!html) return { video: null, subtitles: [] };
        const videoMatch = html.match(/file:\s*EE\.dd\("(.*?)"\)/);
        const video = videoMatch ? VIDRAME_DECODER.dd(videoMatch[1]) : null;
        
        const subtitles = [];
        const tracksMatch = html.match(/"file":\s*"(.*?\.vtt)"/g);
        if (tracksMatch) {
            const trTrack = tracksMatch[1];
            const enTrack = tracksMatch[3];
            const processTrack = (trackMatch, label, isDefault) => {
                let url = trackMatch.match(/"file":\s*"(.*?\.vtt)"/)?.[1];
                if (url) {
                    url = url.replace(/\\/g, '');
                    if (url.startsWith('/')) url = `https://${new URL(iframeUrl).hostname}${url}`;
                    subtitles.push({ label, srclang: label === 'Turkish' ? 'tr' : 'en', src: url, default: isDefault });
                }
            };
            if (trTrack) processTrack(trTrack, 'Turkish', true);
            if (enTrack) processTrack(enTrack, 'English', false);
        }
        return { video, subtitles };
    } catch (e) {
        return { video: null, subtitles: [] };
    }
}

async function parseHiddenApi(html, pageUrl, videoType) {
    const $ = cheerio.load(html);
    let videoId = null;
    $('script').each((i, script) => {
        const content = $(script).html();
        if (content && content.includes('var videoId =')) {
            const matchId = content.match(/var videoId = '([^']+)'/);
            if (matchId && matchId[1]) videoId = matchId[1];
        }
    });

    if (videoId) {
        try {
            const baseUrl = new URL(pageUrl).origin;
            const apiUrl = `${baseUrl}/get-source?movie_id=${videoId}&type=${videoType}`;
            const apiResponseHtml = await fetchWithFallback(apiUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            
            if (apiResponseHtml) {
                const data = JSON.parse(apiResponseHtml);
                if (data && data.sources && data.sources.length > 0) {
                    let bestSource = data.sources[0].src;
                    const hdSource = data.sources.find(s => s.label === '1080p' || s.label === '720p');
                    if (hdSource) bestSource = hdSource.src;
                    const tracks = data.tracks || [];
                    return { source: bestSource, tracks: tracks.filter(t => t.kind === 'captions' || t.kind === 'subtitles') };
                }
            }
        } catch (e) {}
    }
    return { source: null, tracks: [] };
}

async function extractSources(html, movieUrl) {
    try {
        const $ = cheerio.load(html);
        const result = { sources: { dub: null, sub: null, original: null }, subtitles: [] };

        const trData = await parseHiddenApi(html, movieUrl, 'tr');
        const enData = await parseHiddenApi(html, movieUrl, 'en');
        if (trData.source) result.sources.dub = trData.source;
        if (enData.source) result.sources.sub = enData.source;
        
        const apiSubtitles = [...(trData.tracks || []), ...(enData.tracks || [])];
        apiSubtitles.forEach(sub => {
            let url = sub.file || sub.src;
            if (url) {
                url = url.replace(/\\/g, '');
                if (url.startsWith('/')) url = `https://${new URL(movieUrl).hostname}${url}`;
                let label = sub.label || sub.name || (url.includes('tur') ? 'Turkish' : 'English');
                result.subtitles.push({ label, srclang: label === 'Turkish' ? 'tr' : 'en', src: url, default: !!sub.default });
            }
        });

        if (!result.sources.dub && !result.sources.sub) {
            let partsData = null;
            $('script').each((i, script) => {
                const content = $(script).html();
                if (content && content.includes('let parts')) {
                    const match = content.match(/let parts\s*=\s*(\[.*?\]);?/s);
                    if (match) partsData = match[1];
                }
            });

            if (partsData) {
                try {
                    const parts = JSON.parse(partsData.trim());
                    for (const part of parts) {
                        const iframeMatch = part.data.match(/src=["\\]+(.*?)["\\]+/);
                        let iframeSrc = iframeMatch?.[1];
                        if (iframeSrc) {
                            iframeSrc = iframeSrc.replace(/\\/g, '');
                            if (iframeSrc.startsWith('/')) iframeSrc = 'https://www.hdfilmizle.nl' + iframeSrc;
                            const info = await getVideoInfo(iframeSrc);
                            let directUrl = info.video || iframeSrc;
                            
                            if (info.subtitles) {
                                info.subtitles.forEach(sub => {
                                    if (!result.subtitles.find(s => s.src === sub.src)) result.subtitles.push(sub);
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
                } catch (e) {}
            }
        }

        if (!result.sources.dub && !result.sources.sub) {
            let src = $('.vpx iframe').first().attr('data-src') || $('.vpx iframe').first().attr('src');
            if (src) {
                if (src.startsWith('/')) src = 'https://www.hdfilmizle.nl' + src;
                const info = await getVideoInfo(src);
                result.sources.dub = info.video || src;
                if (info.subtitles) result.subtitles.push(...info.subtitles);
            }
        }

        result.subtitles = Array.from(new Map(result.subtitles.map(item => [item.src, item])).values());
        return result;
    } catch (error) {
        return { sources: { dub: null, sub: null, original: null }, subtitles: [] };
    }
}

module.exports = { extractSources, fetchWithFallback, playwrightFallback };
