/* eslint-disable node/no-unpublished-require */
require('dotenv').config();
const { WOMClient } = require('@wise-old-man/utils');
const logger = require('../../modules/utils/logger');

/**
 * @fileoverview 🌍 **Wise Old Man API Client**
 *
 * This module provides an interface for interacting with the **Wise Old Man (WOM) API**.
 * - Implements **rate limiting** to manage API requests efficiently.
 * - Handles **automatic retries** using **exponential backoff** for resilience.
 * - Provides easy access to **WOM API endpoints** for retrieving RuneScape player and competition data.
 *
 * 🔹 **Core Features:**
 * - 🚀 **Rate-Limited API Requests** (100/min for active API keys, 20/min for inactive keys).
 * - 🔄 **Automatic Retries** with **Exponential Backoff** on failures.
 * - ⚡ **Efficient Data Fetching** for `players`, `groups`, and `competitions`.
 *
 * 📌 **Usage Example:**
 * ```javascript
 * const WOMApiClient = require('./apiClient');
 * const playerData = await WOMApiClient.request('players', 'getPlayer', 'Zezima');
 * console.log(playerData);
 * ```
 *
 * @module WOMApiClient
 */

const RATE_LIMIT_ACTIVE = 100; // 100 requests per 60 seconds for active API keys
const RATE_LIMIT_INACTIVE = 20; // 20 requests per 60 seconds for inactive API keys
let requestCount = 0;
let lastRequestTime = Date.now();

/**
 * 🎯 **Wise Old Man API Client**
 *
 * Manages interactions with the WOM API, enforcing rate limits and handling retries.
 */
class WOMApiClient {
    /**
     * 🛠️ **Constructor**
     *
     * Initializes the WOM API client, sets up rate limits, and validates the WOM group ID.
     *
     * @throws {Error} If the `WOM_GROUP_ID` is missing or invalid.
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

        setInterval(() => {
            requestCount = 0;
            lastRequestTime = Date.now();
        }, 60000);
    }

    /**
     * ⏳ **Enforces Rate Limiting**
     *
     * Ensures that API requests do not exceed the allowed **rate limit**.
     * If the request limit is reached, throws an error.
     *
     * @throws {Error} If the **rate limit** is exceeded.
     * @returns {Promise<void>} Resolves if the rate limit allows the request.
     */
    async handleWOMRateLimit() {
        const currentTime = Date.now();
        const timeElapsed = currentTime - lastRequestTime;

        if (timeElapsed < 60000) {
            if (requestCount >= this.rateLimit) {
                const limit = process.env.WOM_API_KEY ? '100/60s' : '20/60s';
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
     * 🔄 **Retries API Requests with Exponential Backoff**
     *
     * Retries failed API requests using **exponential backoff** for resilience.
     *
     * @param {string} endpoint - The WOM API endpoint (e.g., `'players'`, `'groups'`).
     * @param {string} methodName - The method to invoke on the API endpoint.
     * @param {string|Object} params - The parameters for the API request.
     * @param {number} [retries=15] - Maximum retry attempts.
     * @returns {Promise<any>} The API response or `null` if the error is non-critical.
     * @throws {Error} If all retries fail for a **critical** error.
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

                logger.warn(`⚡ Retrying ${endpoint}.${methodName} in ${Math.pow(2, attempt)}ms`);
                await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
            }
        }
    }

    /**
     * ⚡ **Executes an API Request with Retries**
     *
     * Handles **rate limiting**, **error handling**, and **automatic retries** for API requests.
     *
     * @param {string} endpoint - The WOM API endpoint (e.g., `'players'`, `'groups'`).
     * @param {string} methodName - The method to call on the endpoint.
     * @param {string|Object} [params={}] - The parameters for the API call.
     * @returns {Promise<any>} The API response.
     * @throws {Error} If the request fails after **all retries**.
     */
    async request(endpoint, methodName, params = {}) {
        await this.handleWOMRateLimit();
        try {
            return await this.retryRequest(endpoint, methodName, params);
        } catch (error) {
            logger.error(`🚫 **WoM** Error calling ${endpoint}.${methodName}: ${error.message}`);
            throw error;
        }
    }
}

/**
 * 📦 **Exports an instance of WOMApiClient**
 *
 * Provides a singleton API client for interacting with **Wise Old Man**.
 */
module.exports = new WOMApiClient();
