const { autoTransitionEvents } = require('./autoTransitionEvents');
const db = require('../../utils/essentials/dbUtils');

/**
 *
 * @param interaction
 */
async function endEvent() {
    const ongoingEvent = await db.getOne(`
        SELECT event_id 
        FROM bingo_state 
        WHERE state = 'ongoing' 
        LIMIT 1
    `);

    if (!ongoingEvent) {
        return;
    }

    const nowIso = new Date().toISOString();
    await db.runQuery(
        `
        UPDATE bingo_state
        SET end_time = ?
        WHERE event_id = ?
    `,
        [nowIso, ongoingEvent.event_id],
    );

    await db.runQuery(
        `
            UPDATE bingo_state
            SET state='completed'
            WHERE event_id=?
        `,
        [ongoingEvent.event_id],
    );

    await autoTransitionEvents();
}

module.exports = { endEvent };
