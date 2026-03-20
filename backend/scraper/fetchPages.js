import * as cheerio from 'cheerio';
import { axiosClient, logger } from './utils.js';

/**
 * Given a category URL, figures out how many pages exist.
 */
export async function discoverPagination(categoryUrl) {
    logger.info(`Discovering pagination for: ${categoryUrl}`);
    try {
        const { data } = await axiosClient.get(categoryUrl);
        const $ = cheerio.load(data);
        
        // Find pagination links
        const paginationLinks = $('ul.pagination li a').toArray();
        let maxPage = 1;

        for (const el of paginationLinks) {
            const pageNum = parseInt($(el).text().trim(), 10);
            if (!isNaN(pageNum) && pageNum > maxPage) {
                maxPage = pageNum;
            }
        }

        // Sometimes the last page is hidden behind a "Last / Son" span or missing links
        const lastPageLink = $('ul.pagination li:last-child a').attr('href');
        if (lastPageLink) {
            const match = lastPageLink.match(/page=(\d+)/);
            if (match && match[1]) {
                 const num = parseInt(match[1], 10);
                 if (num > maxPage) maxPage = num;
            }
        }

        logger.info(`Discovered ${maxPage} pages for ${categoryUrl}`);
        return maxPage;
    } catch (error) {
        logger.error(`Failed to discover pagination for ${categoryUrl}. Relying on fallback default. Error: ${error.message}`);
        return 1; // Fallback to at least scraping the first page
    }
}
