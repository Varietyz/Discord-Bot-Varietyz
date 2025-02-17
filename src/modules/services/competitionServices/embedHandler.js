// competitionService/embedHandler.js

// @ts-nocheck
/**
 * @fileoverview
 * 🚀 **Module Purpose:**
 * This module handles the updating and management of competition embeds on Discord.
 * It updates active competition leaderboards, constructs new competition embeds, and builds voting dropdowns.
 *
 * 📦 **Key Exports:**
 * - `updateActiveCompetitionEmbed(competitionType, db, client, constants)`
 * - `buildPollDropdown(compType, db)`
 *
 * 🛠️ **Dependencies:**
 * - Custom `logger` utility for logging
 * - `createCompetitionEmbed` and `createVotingDropdown` from embed utilities
 * - Helper function `chunkArray`
 * - `updateLeaderboard` from leaderboard updater
 */

const logger = require('../../utils/essentials/logger');
const { createCompetitionEmbed, createVotingDropdown } = require('../../utils/helpers/embedUtils');
const { chunkArray } = require('./helpers');
const { updateLeaderboard } = require('./leaderboardUpdater');

/**
 * 🎯 **Updates the Active Competition Embed in Discord**
 *
 * Retrieves all active competitions of the specified type, updates the leaderboard,
 * builds new competition embeds and voting dropdowns, and then either edits existing
 * messages or posts new ones in the designated Discord channel.
 *
 * @async
 * @function updateActiveCompetitionEmbed
 * @param {string} competitionType - The competition type, either `SOTW` or `BOTW`.
 * @param {Object} db - The database utility object.
 * @param {Discord.Client} client - The Discord client instance.
 * @param {Object} constants - Configuration constants (e.g., channel IDs).
 * @returns {Promise<void>} Resolves when the active competition embed has been updated.
 *
 * @example
 * // 📌 Update the active embed for SOTW competitions:
 * await updateActiveCompetitionEmbed('SOTW', db, client, constants);
 */
async function updateActiveCompetitionEmbed(competitionType, db, client, constants) {
    try {
        const nowISO = new Date().toISOString();
        const competitions = await db.getAll(
            `
            SELECT *
            FROM competitions
            WHERE type = ?
              AND starts_at <= ?
              AND ends_at >= ?
            ORDER BY ends_at ASC
            `,
            [competitionType, nowISO, nowISO],
        );

        let channelKey;
        if (competitionType === 'SOTW') {
            channelKey = 'sotw_channel';
        } else if (competitionType === 'BOTW') {
            channelKey = 'botw_channel';
        } else {
            logger.info(`⚠️ Unknown competition type: ${competitionType}.`);
            return;
        }

        // Query the database for the corresponding channel ID
        const row = await db.guild.getOne('SELECT channel_id FROM comp_channels WHERE comp_key = ?', [channelKey]);
        if (!row) {
            logger.info(`⚠️ No channel_id is configured in comp_channels for ${channelKey}.`);
            return;
        }

        const channelId = row.channel_id;

        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.warn(`🚫 **Warning:** No channel found for ID \`${channelId}\`. Unable to update competition embed.`);
            return;
        }

        if (competitions.length === 0) {
            logger.info(`ℹ️ **Info:** No active competitions found for \`${competitionType}\`. Nothing to post.`);
            return;
        }

        for (const comp of competitions) {
            let oldMsg = null;
            if (comp.message_id) {
                try {
                    oldMsg = await channel.messages.fetch(comp.message_id);
                } catch (err) {
                    //logger.debug(`🔍 **Debug:** Old message not found for ID \`${comp.message_id}\`: ${err.message}`);
                }
            }
            await updateLeaderboard(comp.type, db, client, constants);

            const { embeds, files } = await createCompetitionEmbed(client, comp.type, comp.metric, comp.starts_at, comp.ends_at, comp.competition_id);
            const dropdown = await buildPollDropdown(comp.type, db);

            if (!embeds || embeds.length === 0) {
                logger.error(`🚫 **Error:** Embed creation failed: No embeds were generated for competition ID \`${comp.competition_id}\`.`);
                continue;
            }

            if (oldMsg) {
                //logger.debug(`🔄 **Updating:** Editing old competition message for competition ID \`${comp.competition_id}\`...`);
                await oldMsg.edit({ embeds, files, components: [dropdown] });
            } else {
                //logger.debug(`✉️ **Posting:** New competition message for competition ID \`${comp.competition_id}\`...`);
                const posted = await channel.send({ embeds, files, components: [dropdown] });

                await db.runQuery('UPDATE competitions SET message_id = ? WHERE competition_id = ?', [posted.id, comp.competition_id]);
                logger.info(`✅ **Success:** Posted new competition embed for competition ID \`${comp.competition_id}\`, message ID \`${posted.id}\`.`);
            }
        }
    } catch (err) {
        logger.error(`🚫 **Error in updateActiveCompetitionEmbed(${competitionType}):** ${err.message}`);
    }
}

/**
 * 🎯 **Builds the Voting Dropdown for Competitions**
 *
 * Constructs a dropdown menu component for competition voting.
 * For BOTW competitions, the available options are chunked if necessary, using the current rotation index.
 * Vote counts for each option are fetched from the database to display current tallies.
 *
 * @async
 * @function buildPollDropdown
 * @param {string} compType - The competition type, either `SOTW` or `BOTW`.
 * @param {Object} db - The database utility object.
 * @returns {Promise<Object>} Returns a Discord dropdown component for voting.
 *
 * @example
 * // 📌 Build a voting dropdown for BOTW competitions:
 * const dropdown = await buildPollDropdown('BOTW', db);
 */
async function buildPollDropdown(compType, db) {
    //logger.debug(`🔍 **Debug:** buildPollDropdown called for \`${compType}\`.`);

    const nowISO = new Date().toISOString();
    //logger.debug(`⏱️ **Current Time:** \`${nowISO}\`.`);

    const competition = await db.getOne(
        `
        SELECT competition_id, rotation_index
        FROM competitions
        WHERE type = ?
          AND starts_at <= ?
          AND ends_at >= ?
        ORDER BY ends_at ASC
        LIMIT 1
        `,
        [compType, nowISO, nowISO],
    );

    if (!competition) {
        //logger.debug(`🚫 **Debug:** No active competition for \`${compType}\` found. Returning empty voting menu.`);
        return createVotingDropdown([]);
    }

    //logger.debug(`🔄 **Active Competition:** ID=\`${competition.competition_id}\`, Rotation Index=\`${competition.rotation_index}\` for \`${compType}\`.`);

    const kind = compType === 'SOTW' ? 'Skill' : 'Boss';
    //logger.debug(`🔍 **Fetching:** Retrieving \`${kind}\` options from skills_bosses...`);

    const allOptionsData = await db.getAll(
        `
        SELECT name 
        FROM skills_bosses
        WHERE type = ?
        ORDER BY name
        `,
        [kind],
    );

    const voteCounts = await db.getAll(
        `
        SELECT vote_choice, COUNT(*) AS total
        FROM votes
        WHERE competition_id = ?
        GROUP BY vote_choice
        `,
        [competition.competition_id],
    );

    const voteMap = new Map();
    for (const row of voteCounts) {
        voteMap.set(row.vote_choice.toLowerCase(), row.total);
    }

    let finalList = allOptionsData;

    if (compType === 'BOTW') {
        const rotationIndex = competition.rotation_index || 0;
        const allChunks = chunkArray(allOptionsData, 25);

        if (allChunks.length === 0) {
            logger.warn('🚫 **Warning:** No chunks found for BOTW options. Returning empty dropdown.');
            return createVotingDropdown([]);
        }

        const chunkPos = rotationIndex % allChunks.length;
        finalList = allChunks[chunkPos];

        //logger.debug(`🔄 **Chunk Info:** BOTW chunk position \`${chunkPos}\` (Rotation Index: \`${rotationIndex}\`), Total Chunks: \`${allChunks.length}\`.`);
    }

    const options = finalList.map((e) => {
        const normalizedName = e.name.toLowerCase();
        const label = e.name
            .toLowerCase()
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        const count = voteMap.get(normalizedName) || 0;

        return {
            label: label,
            description: '',
            value: e.name,
            voteCount: count,
        };
    });

    return createVotingDropdown(options, compType);
}

module.exports = {
    updateActiveCompetitionEmbed,
    buildPollDropdown,
};
