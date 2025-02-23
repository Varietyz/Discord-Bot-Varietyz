const logger = require('../essentials/logger');
const axios = require('axios');
async function fetchPlayerData(rsn) {
    const url = `https://api.wiseoldman.net/v2/players/${encodeURIComponent(rsn)}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            logger.warn(`❌ **Not Found:** RSN \`${rsn}\` was not found on Wise Old Man.`);
            return null;
        } else if (error.response && error.response.status === 429) {
            logger.warn('⚠️ **Rate Limit:** You have been rate limited by the WOM API. Please try again later.');
            throw new Error('Rate limited by WOM API.');
        } else {
            logger.error(`🚨 **Unexpected Error:** Error fetching RSN \`${rsn}\`: ${error.message}`);
            throw error;
        }
    }
}
module.exports = { fetchPlayerData };