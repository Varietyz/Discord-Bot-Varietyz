const logger = require('../../utils/essentials/logger');
const { createCompetitionEmbed, createVotingDropdown } = require('../../utils/helpers/embedUtils');
const { chunkArray } = require('./helpers');
const { updateLeaderboard } = require('./leaderboardUpdater');
/**
 *
 * @param competitionType
 * @param db
 * @param client
 * @param constants
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
        const row = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', [channelKey]);
        if (!row) {
            logger.info(`⚠️ No channel_id is configured in ensured_channels for ${channelKey}.`);
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
                } catch (err) {}
            }
            await updateLeaderboard(comp.type, db, client, constants);
            const { embeds, files } = await createCompetitionEmbed(client, comp.type, comp.metric, comp.starts_at, comp.ends_at, comp.competition_id);
            const dropdown = await buildPollDropdown(comp.type, db);
            if (!embeds || embeds.length === 0) {
                logger.error(`🚫 **Error:** Embed creation failed: No embeds were generated for competition ID \`${comp.competition_id}\`.`);
                continue;
            }
            if (oldMsg) {
                await oldMsg.edit({ embeds, files, components: [dropdown] });
            } else {
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
 *
 * @param compType
 * @param db
 */
async function buildPollDropdown(compType, db) {
    const nowISO = new Date().toISOString();
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
        return createVotingDropdown([]);
    }
    const kind = compType === 'SOTW' ? 'Skill' : 'Boss';
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
