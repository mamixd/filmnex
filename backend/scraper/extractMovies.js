import * as cheerio from 'cheerio';

/**
 * Extracts raw movie items from a given page HTML
 */
export function parseMovieGrid(html, baseUrl) {
    const $ = cheerio.load(html);
    const items = $('div.movie').toArray();
    const results = [];

    for (const el of items) {
        const posterA = $(el).find('div.poster a');
        const rawTitle = posterA.text().trim() || $(el).find('img').attr('alt');
        const rawImage = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
        const link = posterA.attr('href');

        if (rawTitle && rawImage && link) {
             const absoluteUrl = new URL(link, baseUrl).href;
             results.push({
                 rawTitle,
                 rawImage: new URL(rawImage, baseUrl).href,
                 url: absoluteUrl
             });
        }
    }

    return results;
}
