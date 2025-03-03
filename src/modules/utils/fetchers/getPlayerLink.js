const db = require('../essentials/dbUtils');
const { normalizeRsn } = require('../normalizing/normalizeRsn');
const getEmojiWithFallback = require('./getEmojiWithFallback');
const getPlayerRank = require('./getPlayerRank');

/**
 * Gets a formatted Markdown link for a player's Wise Old Man profile.
 * @param {string} rsn - The player's RuneScape Name (RSN).
 * @returns {Promise<string>} The formatted RSN link with rank emoji if applicable.
 */
async function getPlayerLink(rsn) {
    const emojiCache = {}; // ✅ Use an object for proper caching

    // ✅ Get player details from registered_rsn
    const playerRsnObj = await db.getOne(
        `SELECT rsn, player_id
         FROM registered_rsn 
         WHERE LOWER(rsn) = LOWER(?)`,
        [rsn],
    );

    // ✅ Get player details from clan_members
    const playerClanObj = await db.getOne(
        `SELECT player_id, rsn
         FROM clan_members 
         WHERE LOWER(rsn) = LOWER(?)`,
        [rsn],
    );

    // ✅ Handle case where the RSN does not exist in both tables
    if (!playerRsnObj && !playerClanObj) {
        const playerNameForLink = encodeURIComponent(normalizeRsn(rsn));
        const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;
        return `❌ [${rsn}](${profileLink})`; // Default for unregistered RSNs & non-clan members
    }

    // ✅ Determine the best available RSN and player ID
    const finalRsn = playerRsnObj?.rsn || rsn;
    const finalPlayerId = playerClanObj?.player_id || playerRsnObj?.player_id || null;

    // ✅ Generate profile link
    const playerNameForLink = encodeURIComponent(normalizeRsn(rsn));
    const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;

    let linkedRsn;

    // ✅ If the player has a valid ID, fetch rank and add emoji
    if (finalPlayerId) {
        const playerRank = await getPlayerRank(finalPlayerId);

        if (!emojiCache[playerRank]) {
            emojiCache[playerRank] = await getEmojiWithFallback(`emoji_${playerRank}`, '🚫');
        }

        linkedRsn = `${emojiCache[playerRank]}`; // Append rank emoji
    }

    linkedRsn += `[${finalRsn}](${profileLink})`;
    if (!playerRsnObj) {
        linkedRsn += '📡';
    }
    linkedRsn = `**${linkedRsn}**`;
    return linkedRsn;
}

module.exports = getPlayerLink;
