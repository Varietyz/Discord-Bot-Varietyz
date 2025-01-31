// competitionService/embedHandler.js

// @ts-nocheck

const logger = require('../../utils/logger');
const { createCompetitionEmbed, createVotingDropdown } = require('../../utils/embedUtils');
const { chunkArray } = require('./helpers');
const { updateLeaderboard } = require('./leaderboardUpdater');

/**
 * Updates the active competition embed in Discord.
 * @param {string} competitionType - 'SOTW' or 'BOTW'.
 * @param {Object} db - The database utility.
 * @param {Discord.Client} client - The Discord client.
 * @param {Object} constants - Configuration constants.
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

        // Fetch the text channel
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
            // Fetch old message if available
            let oldMsg = null;
            if (comp.message_id) {
                try {
                    oldMsg = await channel.messages.fetch(comp.message_id);
                } catch (err) {
                    logger.debug(`Old message not found for ID ${comp.message_id}: ${err.message}`);
                }
            }
            await updateLeaderboard(comp.type, db, client, constants);
            // Build new embed and dropdown
            const { embeds, files } = await createCompetitionEmbed(client, comp.type, comp.metric, comp.starts_at, comp.ends_at, comp.id);
            const dropdown = await buildPollDropdown(comp.type, db);

            if (!embeds || embeds.length === 0) {
                logger.error('Embed creation failed: No embeds were generated.');
                continue;
            }

            if (oldMsg) {
                logger.debug(`Editing old competition message for comp ID=${comp.id}...`);
                await oldMsg.edit({ embeds, files, components: [dropdown] });
            } else {
                logger.debug(`Posting new competition message for comp ID=${comp.id}...`);
                const posted = await channel.send({ embeds, files, components: [dropdown] });

                // Store new message ID in DB
                await db.runQuery('UPDATE competitions SET message_id = ? WHERE id = ?', [posted.id, comp.id]);
                logger.info(`Posted new competition embed for comp ID=${comp.id}, message ID=${posted.id}`);
            }
        }
    } catch (err) {
        logger.error(`Error updateActiveCompetitionEmbed(${competitionType}): ${err.message}`);
    }
}

/**
 * Builds a dropdown menu for voting based on competition type.
 * Supports chunking for BOTW if the list is too large.
 * @param {string} compType - 'SOTW' or 'BOTW'.
 * @param {Object} db - The database utility.
 * @returns {Object} - Discord dropdown component.
 */
async function buildPollDropdown(compType, db) {
    logger.debug(`buildPollDropdown called for ${compType}`);

    const nowISO = new Date().toISOString();
    logger.debug(`Current time: ${nowISO}`);

    // Fetch active competition and rotation index
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

    const kind = compType === 'SOTW' ? 'Skill' : 'Boss';
    logger.debug(`Fetching ${kind} from skills_bosses...`);

    // Fetch all skills/bosses
    const allOptionsData = await db.getAll(
        `
        SELECT name 
        FROM skills_bosses
        WHERE type = ?
        ORDER BY name
        `,
        [kind],
    );

    // Fetch vote counts
    const voteCounts = await db.getAll(
        `
        SELECT vote_choice, COUNT(*) AS total
        FROM votes
        WHERE competition_id = ?
        GROUP BY vote_choice
        `,
        [competition.id],
    );

    // Create a map for quick lookup
    const voteMap = new Map();
    for (const row of voteCounts) {
        voteMap.set(row.vote_choice.toLowerCase(), row.total);
    }

    let finalList = allOptionsData;

    // Handle BOTW chunking
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

    // Ensure all options are included with proper vote counts
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
