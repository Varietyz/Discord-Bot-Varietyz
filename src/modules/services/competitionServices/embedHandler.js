// competitionService/embedHandler.js

// @ts-nocheck

const logger = require('../../utils/logger');
const { createCompetitionEmbed, createVotingDropdown } = require('../../utils/embedUtils');
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
 * // Update the active embed for SOTW competitions:
 * await updateActiveCompetitionEmbed('SOTW', db, client, constants);
 */
async function updateActiveCompetitionEmbed(competitionType, db, client, constants) {
    try {
        const nowISO = new Date().toISOString();

        // Fetch all active competitions
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

        const channelId = competitionType === 'SOTW' ? constants.SOTW_CHANNEL_ID : constants.BOTW_CHANNEL_ID;

        // Fetch the Discord text channel
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.warn(`No channel for ID ${channelId}. Can't update embed.`);
            return;
        }

        if (competitions.length === 0) {
            logger.info(`No active comps found for ${competitionType}. Nothing to post.`);
            return;
        }

        for (const comp of competitions) {
            // Attempt to fetch the old message if it exists
            let oldMsg = null;
            if (comp.message_id) {
                try {
                    oldMsg = await channel.messages.fetch(comp.message_id);
                } catch (err) {
                    logger.debug(`Old message not found for ID ${comp.message_id}: ${err.message}`);
                }
            }

            // Update the leaderboard embed before posting competition embed
            await updateLeaderboard(comp.type, db, client, constants);

            // Build new embed and dropdown components for the competition
            const { embeds, files } = await createCompetitionEmbed(client, comp.type, comp.metric, comp.starts_at, comp.ends_at, comp.id);
            const dropdown = await buildPollDropdown(comp.type, db);

            if (!embeds || embeds.length === 0) {
                logger.error('Embed creation failed: No embeds were generated.');
                continue;
            }

            // Edit the existing message if available; otherwise, send a new one
            if (oldMsg) {
                logger.debug(`Editing old competition message for comp ID=${comp.id}...`);
                await oldMsg.edit({ embeds, files, components: [dropdown] });
            } else {
                logger.debug(`Posting new competition message for comp ID=${comp.id}...`);
                const posted = await channel.send({ embeds, files, components: [dropdown] });

                // Store the new message ID in the database for future updates
                await db.runQuery('UPDATE competitions SET message_id = ? WHERE id = ?', [posted.id, comp.id]);
                logger.info(`Posted new competition embed for comp ID=${comp.id}, message ID=${posted.id}`);
            }
        }
    } catch (err) {
        logger.error(`Error updateActiveCompetitionEmbed(${competitionType}): ${err.message}`);
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
 * // Build a voting dropdown for BOTW competitions:
 * const dropdown = await buildPollDropdown('BOTW', db);
 */
async function buildPollDropdown(compType, db) {
    logger.debug(`buildPollDropdown called for ${compType}`);

    const nowISO = new Date().toISOString();
    logger.debug(`Current time: ${nowISO}`);

    // Fetch the active competition and its rotation index
    const competition = await db.getOne(
        `
        SELECT id, rotation_index
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
        logger.debug(`No active competition for ${compType}, returning empty menu`);
        return createVotingDropdown([]);
    }

    logger.debug(`Active comp for ${compType}: ID=${competition.id}, Rotation Index=${competition.rotation_index}`);

    // Determine the kind of options: 'Skill' for SOTW, 'Boss' for BOTW
    const kind = compType === 'SOTW' ? 'Skill' : 'Boss';
    logger.debug(`Fetching ${kind} from skills_bosses...`);

    // Fetch all available options from the skills_bosses table
    const allOptionsData = await db.getAll(
        `
        SELECT name 
        FROM skills_bosses
        WHERE type = ?
        ORDER BY name
        `,
        [kind],
    );

    // Fetch vote counts for the active competition
    const voteCounts = await db.getAll(
        `
        SELECT vote_choice, COUNT(*) AS total
        FROM votes
        WHERE competition_id = ?
        GROUP BY vote_choice
        `,
        [competition.id],
    );

    // Create a map for quick lookup of vote counts by option name
    const voteMap = new Map();
    for (const row of voteCounts) {
        voteMap.set(row.vote_choice.toLowerCase(), row.total);
    }

    let finalList = allOptionsData;

    // For BOTW competitions, handle chunking of options if there are too many
    if (compType === 'BOTW') {
        const rotationIndex = competition.rotation_index || 0; // Use stored rotation index
        const allChunks = chunkArray(allOptionsData, 25); // Split into chunks of 25

        if (allChunks.length === 0) {
            logger.warn('No chunks found for BOTW options.');
            return createVotingDropdown([]);
        }

        // Use modulo to wrap around if rotation index exceeds available chunks
        const chunkPos = rotationIndex % allChunks.length;
        finalList = allChunks[chunkPos];

        logger.debug(`BOTW chunk pos = ${chunkPos} (rotationIndex=${rotationIndex}), total chunks=${allChunks.length}`);
    }

    // Map each option to a format including vote count and proper label formatting
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
