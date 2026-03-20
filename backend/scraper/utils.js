import axios from 'axios';
import axiosRetry from 'axios-retry';
import UserAgent from 'user-agents';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// --- Logging Setup ---
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'scraper/scraper.log' })
    ]
});

// --- Axios & Retry Setup ---
const createAxiosClient = () => {
    const client = axios.create({
        timeout: 15000, // 15 seconds timeout
    });

    // Exponential backoff for rate limits and server errors
    axiosRetry(client, {
        retries: 5,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) => {
            return axiosRetry.isNetworkOrIdempotentRequestError(error) || error?.response?.status === 429;
        },
        onRetry: (retryCount, error, requestConfig) => {
            logger.warn(`Retrying request (${retryCount}/5). Route: ${requestConfig.url}. Error: ${error.message}`);
        }
    });

    // Request Interceptor: Spoof headers
    client.interceptors.request.use((config) => {
        const userAgent = new UserAgent({ deviceCategory: 'desktop' });
        config.headers['User-Agent'] = userAgent.toString();
        config.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
        config.headers['Accept-Language'] = 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7';
        return config;
    });

    return client;
};

const axiosClient = createAxiosClient();

// --- State Management ---
const STATE_FILE = path.join(process.cwd(), 'scraper', 'state.json');

const loadState = () => {
    if (fs.existsSync(STATE_FILE)) {
        try {
            const raw = fs.readFileSync(STATE_FILE, 'utf8');
            // If file is empty or just whitespace/braces, parsing might return null or an empty object
            if (raw.trim() !== '') {
                const parsed = JSON.parse(raw);
                // Ensure arrays exist even if the parsed object is missing them
                if (parsed && typeof parsed === 'object') {
                    return {
                        processedUrls: Array.isArray(parsed.processedUrls) ? parsed.processedUrls : [],
                        items: Array.isArray(parsed.items) ? parsed.items : []
                    };
                }
            }
        } catch (e) {
            logger.error(`Failed to parse state.json: ${e.message}`);
        }
    }
    return { processedUrls: [], items: [] };
};

const saveState = (state) => {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
};

export { logger, axiosClient, loadState, saveState };
