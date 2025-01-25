/* eslint-disable node/no-unpublished-require */
const { WOMClient } = require('@wise-old-man/utils');
const logger = require('../../utils/logger');

// Rate limit settings for WOM API
const RATE_LIMIT_ACTIVE = 100; // 100 requests per 60 seconds for active API keys
const RATE_LIMIT_INACTIVE = 20; // 20 requests per 60 seconds for inactive API keys
let requestCount = 0;
let lastRequestTime = Date.now();

/**
 * A client for interacting with the Wise Old Man (WOM) API.
 * Manages rate-limited requests, handles retries, and provides access to the WOM API endpoints.
 */
class WOMApiClient {
    /**
     * Initializes the WOM API client with an API key and user agent.
     * Sets rate limits based on the presence of an API key and validates the WOM group ID.
     *
     * @throws {Error} Throws an error if the `WOM_GROUP_ID` is invalid.
     */
    constructor() {
        this.client = new WOMClient({
            apiKey: process.env.WOM_API_KEY || '',
            userAgent: process.env.WOM_USER || 'Varietyz Bot'
        });
        this.rateLimit = process.env.WOM_API_KEY
            ? RATE_LIMIT_ACTIVE
            : RATE_LIMIT_INACTIVE;

        // Validate WOM_GROUP_ID
        this.groupId = Number(process.env.WOM_GROUP_ID);
        if (isNaN(this.groupId) || this.groupId <= 0) {
            throw new Error(
                `Invalid WOM_GROUP_ID: ${process.env.WOM_GROUP_ID}. It must be a positive integer.`
            );
        }

        // Reset request counters every 60 seconds
        setInterval(() => {
            requestCount = 0;
            lastRequestTime = Date.now();
        }, 60000);
    }

    /**
     * Ensures that the WOM API rate limit is not exceeded.
     * Throws an error if the request limit is reached within the current 60-second window.
     *
     * @throws {Error} If the rate limit is exceeded.
     * @returns {Promise<void>} Resolves if the rate limit has not been exceeded.
     */
    async handleWOMRateLimit() {
        const currentTime = Date.now();
        const timeElapsed = currentTime - lastRequestTime;

        if (timeElapsed < 60000) {
            if (requestCount >= this.rateLimit) {
                const limit = process.env.WOM_API_KEY ? '100/60s' : '20/60s';
                logger.warn(`WOM rate limit exceeded. Current limit: ${limit}`);
                throw new Error(
                    'WOM rate limit exceeded. Waiting before retrying...'
                );
            }
        } else {
            // Reset count after 60 seconds
            requestCount = 0;
            lastRequestTime = currentTime;
        }

        requestCount++;
    }

    /**
     * Retries a failed API request with exponential backoff.
     *
     * @param {string} endpoint - The WOM API endpoint (e.g., 'players', 'groups').
     * @param {string} methodName - The method name to call on the endpoint.
     * @param {string|Object} params - The parameters to pass to the API method.
     * @param {number} [retries=5] - The number of retry attempts before throwing an error.
     * @returns {Promise<any>} The result of the API call, or `null` if a non-critical error occurs.
     * @throws {Error} Throws an error if all retries fail and the error is critical.
     */
    async retryRequest(endpoint, methodName, params, retries = 15) {
        const nonCriticalErrors = [
            'has been updated recently',
            'Invalid username',
            'Failed to load hiscores'
        ];

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await this.handleWOMRateLimit();
                const result = await this.client[endpoint][methodName](params);
                return result; // Successfully fetched data
            } catch (error) {
                const isNonCritical = nonCriticalErrors.some((pattern) =>
                    error.message.includes(pattern)
                );

                if (isNonCritical) {
                    if (
                        error.message.includes(
                            'Invalid username',
                            'Failed to load hiscores'
                        )
                    ) {
                        logger.warn(
                            `[WOMApiClient] Non-existing, Unranked or Banned player found: ${params}`
                        );
                    } else {
                        logger.warn(
                            `[WOMApiClient] ${params} has been updated recently. Skipping.`
                        );
                    }
                    return null;
                }

                if (attempt === retries) {
                    logger.error(
                        `Failed to call ${endpoint}.${methodName} after ${retries} retries: ${error.message}`
                    );
                    throw error;
                }

                logger.warn(
                    `Retrying ${endpoint}.${methodName} in ${Math.pow(2, attempt)}ms`
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, Math.pow(2, attempt) * 100)
                ); // Exponential backoff
            }
        }
    }

    /**
     * Makes a request to the WOM API with rate limiting and retries.
     *
     * @param {string} endpoint - The WOM API endpoint (e.g., 'players', 'groups').
     * @param {string} methodName - The method name to call on the endpoint.
     * @param {string|Object} [params={}] - The parameters to pass to the API method.
     * @returns {Promise<any>} The result of the API call.
     * @throws {Error} Throws an error if the request fails after all retries.
     */
    async request(endpoint, methodName, params = {}) {
        await this.handleWOMRateLimit();

        try {
            const result = await this.retryRequest(
                endpoint,
                methodName,
                params
            );
            return result;
        } catch (error) {
            logger.error(
                `[WOMApiClient] Error calling ${endpoint}.${methodName}: ${error.message}`
            );
            throw error;
        }
    }
}

module.exports = new WOMApiClient();
