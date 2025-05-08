const db = require('../essentials/dbUtils');
const { normalizeRsn } = require('../normalizing/normalizeRsn');
const getEmojiWithFallback = require('./getEmojiWithFallback');
const getPlayerRank = require('./getPlayerRank');

async function getPlayerLink(rsn) {
    const emojiCache = {}; 

    const playerRsnObj = await db.getOne(
        `SELECT rsn, player_id
         FROM registered_rsn 
         WHERE LOWER(rsn) = LOWER(?)`,
        [rsn],
    );

    const playerClanObj = await db.getOne(
        `SELECT player_id, rsn
         FROM clan_members 
         WHERE LOWER(rsn) = LOWER(?)`,
        [rsn],
    );

    if (!playerRsnObj && !playerClanObj) {
        const playerNameForLink = encodeURIComponent(normalizeRsn(rsn));
        const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;
        return `**[${rsn}](${profileLink})**`; 
    }

    const finalRsn = playerRsnObj?.rsn || rsn;
    const finalPlayerId = playerClanObj?.player_id || playerRsnObj?.player_id || null;

    const playerNameForLink = encodeURIComponent(normalizeRsn(rsn));
    const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;

    let linkedRsn;

    if (finalPlayerId) {
        const playerRank = await getPlayerRank(finalPlayerId);

        if (!emojiCache[playerRank]) {
            emojiCache[playerRank] = await getEmojiWithFallback(`emoji_${playerRank}`, '🚫');
        }

        linkedRsn = `${emojiCache[playerRank]}`; 
    }

    linkedRsn += `[${finalRsn}](${profileLink})`;
    if (!playerRsnObj) {
        linkedRsn += '📡';
    }
    linkedRsn = `**${linkedRsn}**`;
    return linkedRsn;
}

module.exports = getPlayerLink;
