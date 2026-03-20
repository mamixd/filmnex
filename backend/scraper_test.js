const axios = require('axios');
const cheerio = require('cheerio');

async function testScraper() {
    try {
        console.log("Fetching home page: https://www.hdfilmizle.life/");
        const sourceUrl = 'https://www.hdfilmizle.life/';
        const res = await axios.get(sourceUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(res.data);
        
        let targetLinks = new Set();
        $('a').each((i, el) => {
            let href = $(el).attr('href');
            if (!href || href === '#' || href === '/') return;
            
            if (href.startsWith('/')) href = 'https://www.hdfilmizle.life' + href;
            else if (!href.startsWith('http')) href = 'https://www.hdfilmizle.life/' + href;
            
            if (href.startsWith(sourceUrl)) {
                try {
                    const urlObj = new URL(href);
                    const segments = urlObj.pathname.split('/').filter(p => p.length > 0);
                    if (segments.length === 1) {
                        const path = segments[0].toLowerCase();
                        const badPaths = ['film-robotu', 'iletisim', 'android', 'apk', 'hakkimizda', 'sitemap', 'dizi', 'kategori'];
                        let isBad = false;
                        for (let bp of badPaths) { if (path.includes(bp)) isBad = true; }
                        if (!isBad) targetLinks.add(href);
                    }
                } catch(e) {}
            }
        });
        
        const links = Array.from(targetLinks);
        console.log(`\nFound ${links.length} potential movie links. Testing the first 3...`);
        console.log(links.slice(0, 3));
        
        for (const link of links.slice(0, 3)) {
            console.log("\n--- Fetching:", link, "---");
            try {
                const movieRes = await axios.get(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                const $$ = cheerio.load(movieRes.data);
                
                const title = $$('h1').text().trim() || $$('title').text().split('-')[0].trim();
                const image = $$('meta[property="og:image"]').attr('content') || $$('img.lazy').first().attr('src') || '';
                
                let description = '';
                $$('p').each((i, el) => {
                   const text = $$(el).text().trim();
                   if(text.length > 60 && !description) description = text; 
                });
                
                let video_url = '';
                $$('iframe').each((i, el) => {
                    const src = $$(el).attr('data-src') || $$(el).attr('src');
                    if(src && !video_url && (src.includes('vidrame') || src.includes('http') || src.includes('//')) && !src.includes('facebook') && !src.includes('twitter') && !src.includes('${')) {
                        video_url = src.startsWith('//') ? 'https:' + src : src;
                    }
                });
                
                console.log({ title, video_url: video_url ? '>> Iframe Okey: ' + video_url.substring(0,25) + '...' : 'Bulunamadi' });
            } catch(e) {}
        }
    } catch(err) {
        console.error("Fatal Error:", err.message);
    }
}
testScraper();
