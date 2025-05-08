const WOMApiClient = require('../../../api/wise_old_man/apiClient');
const { savePlayerDataToDb } = require('../../services/playerDataExtractor');
const { getLastFetchedTime, setLastFetchedTime } = require('../fetchers/lastFetchedTime');
const logger = require('./logger');

async function updatePlayerData(rsn, playerId) {
    try {
        logger.info(`🔄 Updating data for ${rsn} (player: ${playerId})...`);
        const lastFetched = await getLastFetchedTime(playerId);
        const now = new Date();
        let playerData;
        if (lastFetched) {
            const minutesSinceLastFetch = (now.getTime() - lastFetched.getTime()) / (1000 * 60);
            if (minutesSinceLastFetch > 10) {
                logger.info(`🔄 Updating player ${rsn} on WOM API...`);
                playerData = await WOMApiClient.request('players', 'updatePlayer', rsn);
                await setLastFetchedTime(playerId);
            } else {
                logger.info(`📌 No update needed for ${rsn}.`);
                playerData = await WOMApiClient.request('players', 'getPlayerDetails', rsn);
            }
        } else {
            logger.info(`🔄 First-time update for ${rsn} on WOM API...`);
            playerData = await WOMApiClient.request('players', 'updatePlayer', rsn);
            await setLastFetchedTime(playerId);
        }
        await savePlayerDataToDb(rsn, playerData);
        logger.info(`✅ Updated data for ${rsn}`);
    } catch (err) {
        logger.error(`❌ Error updating data for ${rsn}: ${err.message}`);
    }
}

module.exports = { updatePlayerData };
