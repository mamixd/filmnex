const axios = require('axios');
const cheerio = require('cheerio');
const Movie = require('../models/Movie');
const Log = require('../models/Log');
const { searchMovie } = require('../services/tmdbService');
const { fetchWithFallback, extractSources } = require('./extractor');

/**
 * HD Film İzle sitesini otonom olarak tarar. 
 * Sonuçları TMDB Metadata ile eşleştirip multi-player sistemiyle MongoDB'ye gömer.
 */
const runScraper = async () => {
    const logs = [];
    try {
        console.log("Otonom Bot Başladı: Çoklu kaynak taraması yapılıyor...");
        
        // Rastgele 1-10 arası bir sayfa seçerek her seferinde farklı içerik gelmesini sağla
        const randomPage = Math.floor(Math.random() * 10) + 1;
        const sourceUrls = [
            'https://www.hdfilmizle.nl/',
            `https://www.hdfilmizle.nl/page/${randomPage}/`,
            `https://www.hdfilmizle.nl/en-cok-izlenen-filmler-hd-2/page/${randomPage}/`
        ];
        
        let targetLinks = new Set();

        for (const sourceUrl of sourceUrls) {
            const html = await fetchWithFallback(sourceUrl);
            if (!html) continue;
            const $ = cheerio.load(html);
            
            $('a').each((i, el) => {
                let href = $(el).attr('href');
                if(!href || href === '#' || href === '/') return;
                
                if (href.startsWith('/')) href = 'https://www.hdfilmizle.nl' + href;
                else if (!href.startsWith('http')) href = 'https://www.hdfilmizle.nl/' + href;
                
                if (href.startsWith('https://www.hdfilmizle.nl/')) {
                    try {
                        const urlObj = new URL(href);
                        const segments = urlObj.pathname.split('/').filter(p => p.length > 0);
                        if (segments.length === 1) {
                            const path = segments[0].toLowerCase();
                            const badPaths = ['film-robotu', 'iletisim', 'android', 'apk', 'hakkimizda', 'sitemap', 'dizi', 'kategori', 'page'];
                            let isBad = false;
                            for (let bp of badPaths) { if (path.includes(bp)) isBad = true; }
                            if (!isBad) targetLinks.add(href);
                        }
                    } catch(e) {}
                }
            });
        }

        // Toplanan linkleri karıştır (Shuffle) ve ilk 30 tanesini işle
        const links = Array.from(targetLinks)
            .sort(() => Math.random() - 0.5)
            .slice(0, 30); 
        let addedCount = 0;

        for (const link of links) {
            try {
                const movieHtml = await fetchWithFallback(link);
                if (!movieHtml) {
                    logs.push(`Hata (${link}): Film detay HTML'si çekilemedi, atlanıyor.`);
                    continue;
                }
                const $$ = cheerio.load(movieHtml);
                
                let rawTitle = $$('h1').first().text().trim() || $$('meta[property="og:title"]').attr('content') || '';
                
                if (rawTitle) {
                    rawTitle = rawTitle.replace(/izle/gi, '').replace(/hd/gi, '').replace(/1080p/gi, '');
                    if (rawTitle.includes('-')) {
                        rawTitle = rawTitle.split('-')[0].trim();
                    }
                }
                
                let sitePoster = $$('meta[property="og:image"]').attr('content') || $$('img.poster').first().attr('src') || $$('.poster img').first().attr('src');
                if (sitePoster && !sitePoster.startsWith('http')) sitePoster = 'https://www.hdfilmizle.life' + sitePoster;
                
                let siteDesc = $$('meta[property="og:description"]').attr('content') || $$('meta[name="description"]').attr('content');
                
                let siteRating = $$('.imdb-text, .imdb-score, .poster-imdb').first().text().trim() || '0.0';
                let siteYear = $$('.yer-text, .poster-year').first().text().trim() || '2024';
                
                // Bazı yıllarda "2024 Yapımı" gibi metinler gelebilir, sadece sayıları al
                let matchedYear = siteYear.match(/[0-9]{4}/);
                siteYear = matchedYear ? matchedYear[0] : '2024';
                
                let matchedRating = siteRating.match(/[0-9][.,][0-9]/);
                siteRating = matchedRating ? matchedRating[0].replace(',', '.') : '0.0';
                
                // Eğer filmin başlığında "(2025)" gibi vizyon yılı açıkça varsa, sitedeki hatalı yılı (örn: 2023) ez
                const titleYearMatch = rawTitle.match(/\(([0-9]{4})\)/);
                if (titleYearMatch && titleYearMatch[1]) {
                    siteYear = titleYearMatch[1];
                }
                
                // TMDB'ye kusursuz arama yapmak için filmin SADECE ilk temiz adını al (Örn: "The Running Man")
                let cleanSearchTitle = rawTitle.split('(')[0].trim();
                
                // Mükemmel Otonom Botumuzun (API Bypass'lı Extractor) Çalıştırılması
                const { sources, subtitles } = await extractSources(movieHtml, link);
                const sourceTr = sources.dub || sources.original;
                const sourceEn = sources.sub;

                if (!sourceTr && !sourceEn) {
                    continue; // Film kaynakları bulanamadı
                }
                
                const checkUrl = sourceTr || sourceEn;
                const existingUrl = await Movie.findOne({ $or: [ { "directSource": checkUrl }, { "directSourceAlt": checkUrl } ] });
                if (existingUrl) continue; 

                // TMDB ile kusursuz eşleşme sağla (Hassas Yıl Eklentisi)
                const tmdbData = await searchMovie(cleanSearchTitle, siteYear);
                
                // DB'de aynı TMDB ID'li veya aynı Başlık+Yıl kombinasyonlu film var mı?
                let movieDoc = null;
                if (tmdbData?.tmdbId) {
                   movieDoc = await Movie.findOne({ tmdbId: tmdbData.tmdbId });
                }
                
                // TMDB ile bulunamadıysa Başlık ve Yıl ile ara (Daha katı deduplikasyon)
                if (!movieDoc) {
                    movieDoc = await Movie.findOne({ 
                        title: { $regex: new RegExp('^' + (tmdbData?.title || rawTitle).trim() + '$', 'i') },
                        year: tmdbData?.year || siteYear
                    });
                }
                
                console.log(`[Bot] Film İşleniyor: ${rawTitle} (Orijinal Bot Algoritmasıyla Başarılı)`);

                if (movieDoc) {
                    movieDoc.directSource = movieDoc.directSource || sourceTr;
                    movieDoc.directSourceAlt = movieDoc.directSourceAlt || sourceEn;
                    movieDoc.directSourceOriginal = movieDoc.directSourceOriginal || sourceEn;
                    if (subtitles && subtitles.length > 0) {
                        movieDoc.subtitles = movieDoc.subtitles || [];
                        subtitles.forEach(sub => {
                            if (!movieDoc.subtitles.find(s => s.src === sub.src)) {
                                movieDoc.subtitles.push(sub);
                            }
                        });
                    }
                    await movieDoc.save();
                    logs.push(`Alternatif izleme kaynağı güncellendi: ${rawTitle}`);
                } else {
                    const moviePayload = {
                        title: tmdbData?.title || rawTitle || 'Bilinmeyen Film',
                        original_title: tmdbData?.original_title || '',
                        description: tmdbData?.description || siteDesc || 'Açıklama bulunamadı.',
                        poster: tmdbData?.poster || sitePoster || '',
                        backdrop: tmdbData?.backdrop || sitePoster || '',
                        rating: tmdbData?.rating || siteRating || '0.0',
                        year: tmdbData?.year || siteYear || new Date().getFullYear(),
                        genres: (tmdbData?.genres && tmdbData.genres.length > 0) ? tmdbData.genres : ['Film'],
                        lang: sourceTr ? 'Türkçe Dublaj' : 'Türkçe Altyazılı',
                        label: sourceTr ? 'Türkçe Dublaj' : 'Türkçe Altyazılı',
                        type: tmdbData?.type || 'movie',
                        sourceUrl: link,
                        directSource: sourceTr || null,
                        directSourceAlt: sourceEn || null,
                        directSourceOriginal: sourceEn || null,
                        subtitles: subtitles || [],
                        isBot: true,
                        players: []
                    };
                    if (tmdbData?.tmdbId) moviePayload.tmdbId = tmdbData.tmdbId;
                    
                    const newMovie = new Movie(moviePayload);
                    await newMovie.save();
                    addedCount++;
                    logs.push(`Sisteme ilk kez kaydedildi: ${newMovie.title}`);
                }
                
            } catch(e) {
                logs.push(`Hata (${link}): ${e.message}`);
            }
        }
        
        await Log.create({ type: 'success', module: 'Scraper', message: `Tarama bitti. ${addedCount} benzersiz film kaydedildi.`, details: logs });
        return { success: true, added: addedCount, logs };
        
    } catch (error) {
        await Log.create({ type: 'error', module: 'Scraper', message: error.message });
        console.error('Otonom Bot Hatası:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { runScraper };
