/* eslint-disable node/no-missing-require */
const PQueue = require('p-queue').default;
const WOMClient = require('@wise-old-man/utils').WOMClient;
const logger = require('../../modules/utils/essentials/logger');
require('dotenv').config();

const RATE_LIMIT_ACTIVE = 100;
const RATE_LIMIT_INACTIVE = 20;
let requestCount = 0;
let lastRequestTime = Date.now();

// Create a global queue with a concurrency of 1 (sequential execution)
const requestQueue = new PQueue({ concurrency: 1 });

/**
 * WOMApiClient wraps the WOMClient to include rate limiting and retry logic.
 */
class WOMApiClient {
    /**
     *
     */
    constructor() {
        this.client = new WOMClient({
            apiKey: process.env.WOM_API_KEY || '',
            userAgent: process.env.WOM_USER || 'Varietyz Bot',
        });
        this.rateLimit = process.env.WOM_API_KEY ? RATE_LIMIT_ACTIVE : RATE_LIMIT_INACTIVE;
        this.groupId = Number(process.env.WOM_GROUP_ID);
        if (isNaN(this.groupId) || this.groupId <= 0) {
            throw new Error(`🚫 Invalid WOM_GROUP_ID: ${process.env.WOM_GROUP_ID}. It must be a positive integer.`);
        }
        // Store the interval ID for later cleanup.
        this.resetInterval = setInterval(() => {
            requestCount = 0;
            lastRequestTime = Date.now();
        }, 60000);
    }

    /**
     *
     */
    async handleWOMRateLimit() {
        const currentTime = Date.now();
        const timeElapsed = currentTime - lastRequestTime;
        if (timeElapsed < 60000) {
            if (requestCount >= this.rateLimit) {
                const limit = process.env.WOM_API_KEY ? '90/60s' : '20/60s';
                logger.warn(`⚡ WOM rate limit exceeded. Current limit: ${limit}`);
                throw new Error('⚡ WOM rate limit exceeded. Waiting before retrying...');
            }
        } else {
            requestCount = 0;
            lastRequestTime = currentTime;
        }
        requestCount++;
    }

    /**
     *
     * @param endpoint
     * @param methodName
     * @param params
     * @param retries
     */
    async retryRequest(endpoint, methodName, params, retries = 15) {
        const nonCriticalErrors = ['has been updated recently', 'Invalid username', 'Failed to load hiscores', 'Competition not found'];
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await this.handleWOMRateLimit();
                const result = await this.client[endpoint][methodName](params);
                return result;
            } catch (error) {
                const isNonCritical = nonCriticalErrors.some((msg) => error.message.includes(msg));
                if (isNonCritical) {
                    logger.warn(`✅**WoM** Non-critical error encountered: ${error.message}. Skipping.`);
                    return null;
                }
                if (attempt === retries) {
                    logger.error(`🚫 Failed ${endpoint}.${methodName} after ${retries} retries: ${error.message}`);
                    throw error;
                }
                const delayTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                logger.warn(`⚡ Retrying ${endpoint}.${methodName} in ${delayTime}ms`);
                await new Promise((resolve) => setTimeout(resolve, delayTime));
            }
        }
    }

    /**
     *
     * @param endpoint
     * @param methodName
     * @param params
     */
    async _makeRequest(endpoint, methodName, params) {
        return this.retryRequest(endpoint, methodName, params);
    }

    /**
     *
     * @param endpoint
     * @param methodName
     * @param params
     */
    async request(endpoint, methodName, params = {}) {
        return requestQueue.add(() => this._makeRequest(endpoint, methodName, params));
    }

    /**
     * Clean up resources used by the WOMApiClient.
     * This method clears the interval and optionally cancels any pending queue tasks.
     */
    async close() {
        logger.info('Closing WOMApiClient...');
        if (this.resetInterval) {
            clearInterval(this.resetInterval);
            logger.info('Reset interval cleared.');
        }
        // Optionally, you could cancel pending requests if needed.
        requestQueue.clear();
        logger.info('Request queue cleared.');
    }
}

module.exports = new WOMApiClient();
