const { getRanks } = require('../fetchers/fetchRankEmojis');
const logger = require('../essentials/logger');
const normalizeStr = require('../normalizing/normalizeStr');
const { guestRank } = require('../../../config/constants');
let rankDataCache = null;

async function loadRanks() {
    if (!rankDataCache) {
        rankDataCache = await getRanks();
        logger.info('✅ Rank data cached successfully.');
    }
}

async function getRankEmoji(rank) {
    rank = convertRanks(rank);
    await loadRanks();
    const safeRank = String(rank).toLowerCase();
    logger.debug(`getRankEmoji: Looking up key "${safeRank}" from available keys: ${Object.keys(rankDataCache).join(', ')}`);
    return rankDataCache?.[safeRank]?.emoji || '❌';
}

async function getRankColor(rank) {
    rank = convertRanks(rank);
    await loadRanks();
    const safeRank = String(rank).toLowerCase();
    return rankDataCache?.[safeRank]?.color || 0xffff00;
}

function formatExp(experience) {
    const numericValue = typeof experience === 'number' ? experience : Number.parseInt(experience, 10);
    if (isNaN(numericValue)) {
        return '0';
    }
    return numericValue.toLocaleString();
}

function formatRank(rank) {
    rank = convertRanks(rank);
    return rank.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function convertRanks(rank) {
    rank = normalizeStr(rank);
    if (rank === guestRank) {
        rank = 'guest';
    }
    return rank;
}

module.exports = {
    getRankEmoji,
    getRankColor,
    formatExp,
    formatRank,
    convertRanks,
};
