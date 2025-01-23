const {
  RANKS,
  WOM_RATE_LIMIT,
  RATE_LIMIT_CACHE,
} = require("../config/constants");
const axios = require("axios");
const logger = require("./functions/logger");
const { DateTime } = require("luxon");

/**
 * Normalize the RSN for consistent comparison.
 * @param {string} rsn - RSN string to normalize.
 * @returns {string} Normalized RSN.
 */
function normalizeRSN(rsn) {
  return rsn.replace(" ", "").toLowerCase();
}

/**
 * Get the emoji representation for a given rank.
 * @param {string} rank - The rank of the clan member.
 * @returns {string} Corresponding rank emoji.
 */
function getRankEmoji(rank) {
  const rankData = RANKS[rank.toLowerCase()];
  return rankData ? rankData.emoji : "";
}

/**
 * Get the emoji representation for a given rank.
 * @param {string} rank - The rank of the clan member.
 * @returns {string} Corresponding rank emoji.
 */
function getRankColor(rank) {
  const rankData = RANKS[rank.toLowerCase()];
  return rankData ? rankData.color : 0xffff00; // Default to yellow if rank not found
}

async function purgeChannel(channel) {
  let messagesToDelete = [];
  try {
    // Fetch up to 100 messages at a time
    do {
      const fetchedMessages = await channel.messages.fetch({ limit: 100 });
      if (fetchedMessages.size === 0) {
        break;
      }
      messagesToDelete = fetchedMessages;
      await channel.bulkDelete(messagesToDelete, true); // Bulk delete the fetched messages
      logger.info(`[Util] Deleted ${messagesToDelete.size} messages.`);

      // Adding a delay between deletions to avoid hitting rate limits
      await new Promise((res) => setTimeout(res, 1000));
    } while (messagesToDelete.size > 0); // Repeat until no more messages left
  } catch (error) {
    logger.error(`[Util] Error deleting messages: ${error}`);
    await new Promise((res) => setTimeout(res, 2000)); // Delay on error to avoid hitting rate limits
  }
}

function formatExp(experience) {
  return Number.parseInt(experience).toLocaleString();
}

function formatRank(rank) {
  return rank.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function respectRateLimit() {
  const now = DateTime.utc().toMillis();
  if (
    RATE_LIMIT_CACHE.lastCall &&
    now - RATE_LIMIT_CACHE.lastCall < WOM_RATE_LIMIT
  ) {
    const delay = WOM_RATE_LIMIT - (now - RATE_LIMIT_CACHE.lastCall);
    logger.info(`Rate-limited. Waiting for ${delay} ms...`);
    await sleep(delay);
  }
}

// Centralized request handler with retry logic
async function fetchWithRetry(url, headers, retries = 10, delay = 10000) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter =
          error.response.headers["retry-after"] || delay / 1000;
        logger.warn(`Rate-limited. Retrying in ${retryAfter} seconds...`);
        await sleep(retryAfter * 1000);
      } else if (error.response?.status === 404) {
        logger.error(`Player not found (404) for URL: ${url}`);
        throw new Error("404: Player not found");
      } else {
        logger.error(`Request failed for URL: ${url} - ${error.message}`);
        throw error;
      }
    }
    attempt++;
  }
  logger.error(`Max retries reached for URL: ${url}`);
  throw new Error("Max retries reached");
}

module.exports = {
  normalizeRSN,
  getRankEmoji,
  getRankColor,
  purgeChannel,
  formatExp,
  formatRank,
  sleep,
  respectRateLimit,
  fetchWithRetry,
};
