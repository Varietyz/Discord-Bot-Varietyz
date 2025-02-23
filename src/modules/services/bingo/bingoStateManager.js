// /modules/services/bingo/bingoStateManager.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');

/**
 * @param eventId
 * @param newState
 */
async function setEventState(eventId, newState) {
    try {
        logger.info(`[BingoStateManager] setEventState(#${eventId}, ${newState})`);
        await db.runQuery(
            `
            UPDATE bingo_state
            SET state = ?,
                last_updated = CURRENT_TIMESTAMP
            WHERE event_id = ?
            `,
            [newState, eventId],
        );
        logger.info(`[BingoStateManager] Event #${eventId} state updated to ${newState}`);
    } catch (err) {
        logger.error(`[BingoStateManager] setEventState error: ${err.message}`);
    }
}

/**
 * If startTime > now, set state='upcoming'. If startTime <= now, set state='ongoing'.
 * E.g. used in startBingoEvent
 * @param eventId
 * @param startTime
 */
async function scheduleEventStart(eventId, startTime) {
    try {
        const now = Date.now();
        const scheduled = new Date(startTime).getTime();
        let newState = 'upcoming';
        if (scheduled <= now) {
            newState = 'ongoing';
        }
        await db.runQuery(
            `
      UPDATE bingo_state
      SET start_time = ?,
          state = ?
      WHERE event_id = ?
    `,
            [startTime, newState, eventId],
        );

        logger.info(`[BingoStateManager] scheduleEventStart for #${eventId} at ${startTime} (state=${newState})`);
    } catch (err) {
        logger.error(`[BingoStateManager] scheduleEventStart error: ${err.message}`);
    }
}

/**
 * If endTime is set, we can have a cron job checking if end_time < now => set state='completed'.
 * @param eventId
 * @param endTime
 */
async function scheduleEventEnd(eventId, endTime) {
    try {
        await db.runQuery(
            `
      UPDATE bingo_state
      SET end_time = ?
      WHERE event_id = ?
    `,
            [endTime, eventId],
        );
        logger.info(`[BingoStateManager] scheduleEventEnd for #${eventId} at ${endTime}`);
    } catch (err) {
        logger.error(`[BingoStateManager] scheduleEventEnd error: ${err.message}`);
    }
}

module.exports = {
    setEventState,
    scheduleEventStart,
    scheduleEventEnd,
};
