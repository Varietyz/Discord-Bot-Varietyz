/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/require-returns */
// @ts-nocheck
/* eslint-disable node/no-unsupported-features/es-syntax */

const { EmbedBuilder } = require('discord.js');
const db = require('../utils/dbUtils');
const { getConfigValue, setConfigValue } = require('../utils/dbUtils');
const logger = require('../utils/logger');
const { createCompetitionEmbed, createVotingDropdown, buildLeaderboardDescription } = require('../utils/embedUtils');
const constants = require('../../config/constants');
require('dotenv').config();

const { WOMClient, Metric } = require('@wise-old-man/utils');
const womclient = new WOMClient();

/**
 *
 * @param array
 * @param size
 */
function chunkArray(array, size = 25) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

/**
 * CompetitionService handles creation, management, and conclusion of competitions.
 */
class CompetitionService {
    /**
     *
     * @param client
     */
    constructor(client) {
        this.client = client;
    }

    /**
     *
     */
    async startNextCompetitionCycle() {
        try {
            const now = new Date().toISOString();
            const activeCompetitions = await db.getAll(
                `
      SELECT *
      FROM competitions
      WHERE ends_at > ?
        AND type IN ('SOTW','BOTW')
      ORDER BY ends_at ASC
    `,
                [now],
            );

            if (activeCompetitions.length > 0) {
                // We have an ongoing comp; just forcibly update
                await this.updateActiveCompetitionEmbed('SOTW');
                await this.updateActiveCompetitionEmbed('BOTW');
                await this.removeInvalidCompetitions();
                logger.info('An active competition is still running. Skipping new creation.');
                return;
            }

            // ------------------- BOSS ROTATION INDEX LOGIC --------------------
            // 1) Get current rotation index from DB
            let rotationIndex = parseInt(await getConfigValue('boss_rotation_index', '0'), 10) || 0;

            // 2) Increment. For example, wrap around 999 or any max you choose
            //    (If you want infinite, just do rotationIndex++)
            rotationIndex = (rotationIndex + 1) % 9999;
            // store it
            await setConfigValue('boss_rotation_index', rotationIndex);
            logger.info(`Updated boss_rotation_index => ${rotationIndex}`);

            // No active comps => create from queue or default
            const queuedCompetitions = await db.getAll('SELECT * FROM competition_queue ORDER BY queued_at ASC');
            if (queuedCompetitions.length === 0) {
                logger.info('No queued comps found. Creating default comps.');
                await this.createDefaultCompetitions();
            } else {
                for (const comp of queuedCompetitions) {
                    await this.createCompetitionFromQueue(comp);
                }
                await db.runQuery('DELETE FROM competition_queue');
                logger.info('Cleared competition queue after creation.');
            }

            // In either case, forcibly refresh the SOTW & BOTW embed
            await this.updateActiveCompetitionEmbed('SOTW');
            await this.updateActiveCompetitionEmbed('BOTW');

            logger.info('Next competition cycle setup completed.');
        } catch (err) {
            logger.error(`Error in startNextCompetitionCycle: ${err.message}`);
        }
    }

    /**
     * Removes any competitions from the DB that do not exist on WOM
     * (i.e., WOM returns a 404 or otherwise invalid data).
     */
    async removeInvalidCompetitions() {
        try {
            const allCompetitions = await db.getAll('SELECT * FROM competitions');

            for (const comp of allCompetitions) {
                try {
                    // Attempt to fetch details from WOM:
                    const womDetails = await womclient.competitions.getCompetitionDetails(comp.id);
                    // If this succeeds, do nothing.
                } catch (err) {
                    // Check if the error message says "Competition not found"
                    if (err.message && err.message.includes('Competition not found')) {
                        await db.runQuery('DELETE FROM competitions WHERE id = ?', [comp.id]);
                        logger.info(`Removed competition ${comp.id} from DB (WOM "Competition not found").`);
                    } else {
                        // Otherwise, log the error for debugging
                        logger.error(`Error fetching WOM competition ${comp.id}: ${err.message}`);
                    }
                }
            }
        } catch (err) {
            logger.error(`Failed to remove invalid competitions: ${err.message}`);
        }
    }

    /**
     *
     */
    async createDefaultCompetitions() {
        try {
            const randomSkill = await this.getRandomMetric('Skill');
            const randomBoss = await this.getRandomMetric('Boss');

            const now = new Date();
            const startsAt = new Date();
            if (now.getUTCHours() !== 0 || now.getUTCMinutes() !== 0) {
                startsAt.setUTCDate(startsAt.getUTCDate() + 1);
            }
            startsAt.setUTCHours(0, 0, 0, 0);

            const endsAt = new Date(startsAt);
            endsAt.setUTCDate(endsAt.getUTCDate() + 7);
            endsAt.setUTCHours(23, 59, 0, 0);

            logger.info(`Creating SOTW for metric "${randomSkill}"`);
            await this.createCompetition('SOTW', randomSkill, startsAt, endsAt);

            logger.info(`Creating BOTW for metric "${randomBoss}"`);
            await this.createCompetition('BOTW', randomBoss, startsAt, endsAt);
        } catch (err) {
            logger.error(`Error createDefaultCompetitions: ${err.message}`);
        }
    }

    /**
     *
     * @param competition
     */
    async createCompetitionFromQueue(competition) {
        try {
            const { type, metric } = competition;
            const now = new Date();
            const startsAt = new Date();
            if (now.getUTCHours() !== 0 || now.getUTCMinutes() !== 0) {
                startsAt.setUTCDate(startsAt.getUTCDate() + 1);
            }
            startsAt.setUTCHours(0, 0, 0, 0);

            const endsAt = new Date(startsAt);
            endsAt.setUTCDate(endsAt.getUTCDate() + 7);
            endsAt.setUTCHours(23, 59, 0, 0);

            await this.createCompetition(type, metric, startsAt, endsAt);
        } catch (err) {
            logger.error(`Error createCompetitionFromQueue: ${err.message}`);
        }
    }

    /**
     * Creates a new competition on WOM, inserts in DB, and posts an embed + dropdown poll
     * @param type
     * @param metric
     * @param startsAt
     * @param endsAt
     */
    async createCompetition(type, metric, startsAt, endsAt) {
        try {
            const title = type === 'SOTW' ? `${metric.replace(/_/g, ' ').toUpperCase()} SOTW` : `${metric.replace(/_/g, ' ').toUpperCase()} BOTW`;

            const metricKey = metric.toUpperCase();
            if (!Metric[metricKey]) {
                throw new Error(`Invalid metric: ${metric}`);
            }
            const competitionMetric = Metric[metricKey];

            const newComp = await womclient.competitions.createCompetition({
                title,
                metric: competitionMetric,
                startsAt: startsAt.toISOString(),
                endsAt: endsAt.toISOString(),
                groupId: Number(constants.WOM_GROUP_ID),
                groupVerificationCode: constants.WOM_VERIFICATION,
            });

            const competitionId = newComp.competition.id;
            const verificationCode = newComp.verificationCode;

            await db.runQuery(
                `
        INSERT INTO competitions (id, title, metric, type, starts_at, ends_at, verification_code)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
                [competitionId, title, metric, type, startsAt.toISOString(), endsAt.toISOString(), verificationCode],
            );

            // Update last_selected
            await db.runQuery(
                `
        UPDATE skills_bosses
        SET last_selected_at = ?
        WHERE name = ?
      `,
                [new Date().toISOString(), metric],
            );

            // Post embed + dropdown
            const channelId = type === 'SOTW' ? constants.SOTW_CHANNEL_ID : constants.BOTW_CHANNEL_ID;
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) {
                logger.error(`Channel ${channelId} not found or no perms.`);
                return;
            }

            // build embed
            const embed = await createCompetitionEmbed(this.client, type, metric, startsAt.toISOString(), endsAt.toISOString());

            // fetch skill/boss from DB for initial dropdown
            const optionsData = await db.getAll(
                `
        SELECT name 
        FROM skills_bosses
        WHERE type=?
      `,
                [type === 'SOTW' ? 'Skill' : 'Boss'],
            );

            const options = optionsData.map((e) => ({
                label: e.name.replace(/_/g, ' ').toUpperCase(),
                description: `Vote for ${e.name.replace(/_/g, ' ')}`,
                value: e.name,
            }));
            const limitedOptions = options.slice(0, 25);
            const dropdown = createVotingDropdown(limitedOptions);

            const pollMsg = await channel.send({ embeds: [embed], components: [dropdown] });
            logger.info(`Poll msg posted: ID ${pollMsg.id}`);

            // store in DB
            await db.runQuery(
                `
        UPDATE competitions
        SET message_id = ?
        WHERE id = ?
      `,
                [pollMsg.id, competitionId],
            );
        } catch (err) {
            logger.error(`Error createCompetition: ${err.message}`);
            throw err;
        }
    }

    /**
     * Attempts to ensure there's a single "Active Competition" embed in the channel
     * that matches the current competition's metric/times.
     * If the existing embed is missing or outdated, it is replaced or edited.
     *
     * @param {string} competitionType - 'SOTW' or 'BOTW'
     * @param {boolean} [forceRefresh=false] - If true, always edit or replace the embed even if it matches
     */
    async updateActiveCompetitionEmbed(competitionType, forceRefresh = false) {
        try {
            // 1) Find any active competition in the DB
            const comp = await db.getOne(
                `
      SELECT *
      FROM competitions
      WHERE type = ?
        AND starts_at <= ?
        AND ends_at >= ?
      ORDER BY ends_at ASC
      LIMIT 1
    `,
                [competitionType, new Date().toISOString(), new Date().toISOString()],
            );

            const channelId = competitionType === 'SOTW' ? constants.SOTW_CHANNEL_ID : constants.BOTW_CHANNEL_ID;

            // Fetch the text channel
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) {
                logger.warn(`No channel for ID ${channelId}. Can't update embed.`);
                return;
            }

            if (!comp) {
                // There's no active competition
                logger.info(`No active comp found for ${competitionType}. Nothing to post.`);
                return;
            }

            // 2) Try to get the old message
            let oldMsg = null;
            if (comp.message_id) {
                try {
                    oldMsg = await channel.messages.fetch(comp.message_id);
                } catch (err) {
                    logger.debug(`Old message not found for ID ${comp.message_id}: ${err.message}`);
                }
            }

            // 3) Build the new embed
            const newEmbed = await createCompetitionEmbed(this.client, comp.type, comp.metric, comp.starts_at, comp.ends_at);

            if (oldMsg) {
                // We have an old message. Decide if it's outdated or forced
                const oldEmbed = oldMsg.embeds?.[0];
                let isOutdated = true;

                if (oldEmbed && !forceRefresh) {
                    const newDesc = newEmbed.data.description;
                    const oldDesc = oldEmbed.description;
                    if (oldDesc && newDesc && oldDesc.trim() === newDesc.trim()) {
                        // The embed text is identical, so not “outdated”
                        isOutdated = false;
                    }
                }

                if (isOutdated) {
                    logger.debug('Editing old competition message with a fresh embed...');
                    await oldMsg.edit({ embeds: [newEmbed], components: [] });
                } else {
                    logger.debug('Embed not outdated, skipping re-edit...');
                }
            } else {
                // 4) The old message was missing => Re-post a new one
                // => Also add the dropdown if you want them to keep voting from that embed
                const dropdown = await this.buildPollDropdown(comp.type);
                const posted = await channel.send({
                    embeds: [newEmbed],
                    components: [dropdown], // Add the poll component!
                });

                // Store in DB
                await db.runQuery(
                    `
        UPDATE competitions
        SET message_id = ?
        WHERE id = ?
      `,
                    [posted.id, comp.id],
                );

                logger.info(`Posted a new active comp embed for comp ID=${comp.id}, message ID=${posted.id}`);
            }
        } catch (err) {
            logger.error(`Error updateActiveCompetitionEmbed(${competitionType}): ${err.message}`);
        }
    }

    // This is the “buildPollDropdown” helper to fetch possible skill/boss options
    // and build the same dropdown you used originally in createCompetition.
    /**
     *
     * @param compType
     */
    /**
     * Builds a dropdown of all skill/boss options, plus their current vote counts (if any)
     * for an active competition of the given type (SOTW/BOTW).
     * @param compType
     */
    async buildPollDropdown(compType) {
        logger.debug(`buildPollDropdown called for ${compType}`);

        const nowISO = new Date().toISOString();
        logger.debug(`Current time: ${nowISO}`);

        const competition = await db.getOne(
            `
    SELECT id
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

        logger.debug(`Active comp for ${compType}: ID=${competition.id}`);

        const kind = compType === 'SOTW' ? 'Skill' : 'Boss';
        logger.debug(`Fetching ${kind} from skills_bosses...`);

        // 1) Fetch all boss/skill names
        const allOptionsData = await db.getAll(
            `
    SELECT name
    FROM skills_bosses
    WHERE type = ?
    ORDER BY name
  `,
            [kind],
        );

        // 2) If BOTW, chunk the entire list & pick the chunk at boss_rotation_index
        let finalList = allOptionsData;
        if (compType === 'BOTW') {
            // Get the rotationIndex
            const rotationIndex = parseInt(await getConfigValue('boss_rotation_index', '0'), 10) || 0;

            const allChunks = chunkArray(allOptionsData, 25); // Each chunk has up to 25
            // e.g. chunkArray below:
            // function chunkArray(array, size = 25) { ... } (from earlier snippet)

            // if the index is bigger than number of chunks, wrap with modulo
            const chunkPos = rotationIndex % allChunks.length;

            finalList = allChunks[chunkPos];
            logger.debug(`BOTW chunk pos = ${chunkPos} (from rotationIndex=${rotationIndex}), total chunks=${allChunks.length}`);
        }

        // 3) Build the final array of option objects
        //    You can still fetch voteCounts if you want the “(X votes)” part
        const voteCounts = await db.getAll(
            `
    SELECT vote_choice, COUNT(*) AS total
    FROM votes
    WHERE competition_id = ?
    GROUP BY vote_choice
    `,
            [competition.id],
        );

        const voteMap = new Map();
        for (const row of voteCounts) {
            voteMap.set(row.vote_choice, row.total);
        }

        // e.g. finalList is your chunk for BOTW or entire list for SOTW
        const options = finalList.map((e) => {
            const label = e.name.replace(/_/g, ' ').toUpperCase();
            const count = voteMap.get(e.name) || 0;

            return {
                label,
                description: `Vote for ${label}`,
                value: e.name,
                voteCount: count,
            };
        });

        logger.debug('Final dropdown options: ' + JSON.stringify(options, null, 2));
        return createVotingDropdown(options);
    }

    /**
     * Returns a random skill or boss name
     * @param type
     */
    async getRandomMetric(type) {
        try {
            const lastComp = await db.getOne(
                `
        SELECT metric
        FROM competitions
        WHERE type = ?
        ORDER BY ends_at DESC
        LIMIT 1
      `,
                [type === 'Skill' ? 'SOTW' : 'BOTW'],
            );

            let query = 'SELECT name FROM skills_bosses WHERE type=?';
            const params = [type];
            if (lastComp && lastComp.metric) {
                query += ' AND name != ?';
                params.push(lastComp.metric);
            }

            const results = await db.getAll(query, params);
            if (results.length === 0) {
                throw new Error(`No metrics found for type ${type}`);
            }

            const idx = Math.floor(Math.random() * results.length);
            const chosen = results[idx].name;
            logger.info(`Selected random metric: ${chosen}`);
            return chosen;
        } catch (err) {
            logger.error(`getRandomMetric error: ${err.message}`);
            throw err;
        }
    }

    /**
     * The main vote handler for the dropdown menu
     * @param interaction
     */
    async handleVote(interaction) {
        const userId = interaction.user.id;
        const selectedOption = interaction.values[0];
        let competitionType = '';

        if (interaction.channelId === constants.SOTW_CHANNEL_ID) {
            competitionType = 'SOTW';
        } else if (interaction.channelId === constants.BOTW_CHANNEL_ID) {
            competitionType = 'BOTW';
        }

        try {
            // find active comp
            const competition = await db.getOne(
                `
        SELECT *
        FROM competitions
        WHERE type=?
          AND starts_at <= ?
          AND ends_at >= ?
      `,
                [competitionType, new Date().toISOString(), new Date().toISOString()],
            );

            if (!competition) {
                return interaction.reply({ content: 'No active competition found.', flags: 64 });
            }

            // check if user voted
            const existingVote = await db.getOne(
                `
        SELECT *
        FROM votes
        WHERE user_id=? AND competition_id=?
      `,
                [userId, competition.id],
            );

            if (existingVote) {
                return interaction.reply({ content: 'You have already voted.', flags: 64 });
            }

            // insert vote
            await db.runQuery(
                `
        INSERT INTO votes (user_id, competition_id, vote_choice)
        VALUES (?, ?, ?)
      `,
                [userId, competition.id, selectedOption],
            );

            await interaction.reply({
                content: `Your vote for **${selectedOption.replace('_', ' ').toUpperCase()}** has been recorded. Thank you!`,
                flags: 64,
            });
        } catch (err) {
            logger.error(`Error handleVote for user ${userId}: ${err.message}`);
            return interaction.reply({
                content: 'There was an error processing your vote.',
                flags: 64,
            });
        }
    }

    /**
     * Update the WOM-based leaderboard
     * @param competitionType
     */
    async updateLeaderboard(competitionType) {
        try {
            const channelId = competitionType === 'SOTW' ? constants.SOTW_CHANNEL_ID : constants.BOTW_CHANNEL_ID;

            const channel = await this.client.channels.fetch(channelId);
            if (!channel) {
                logger.error(`No channel found for type ${competitionType}`);
                return;
            }

            // find active competition
            const competition = await db.getOne(
                `
        SELECT *
        FROM competitions
        WHERE type=?
          AND starts_at <= ?
          AND ends_at >= ?
      `,
                [competitionType, new Date().toISOString(), new Date().toISOString()],
            );

            if (!competition) {
                logger.warn(`No active competition found for ${competitionType}`);
                return;
            }

            // fetch data from WOM
            const details = await womclient.competitions.getCompetitionDetails(competition.id);
            const sorted = details.participations.sort((a, b) => b.progress.gained - a.progress.gained);

            let desc = '';
            sorted.slice(0, 10).forEach((p, i) => {
                desc += `**${i + 1}.** ${p.player.displayName} — \`${p.progress.gained.toLocaleString()}\`\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle(`${competitionType} Leaderboard`)
                .setColor(competitionType === 'SOTW' ? 0x3498db : 0xe74c3c)
                .setDescription(desc || 'No participants yet.')
                .setFooter({ text: 'Live data from WOM' })
                .setTimestamp();

            if (competition.leaderboard_message_id) {
                const msg = await channel.messages.fetch(competition.leaderboard_message_id);
                await msg.edit({ embeds: [embed] });
            } else {
                const newMsg = await channel.send({ embeds: [embed] });
                await db.runQuery(
                    `
          UPDATE competitions
          SET leaderboard_message_id=?
          WHERE id=?
        `,
                    [newMsg.id, competition.id],
                );
            }

            logger.info(`Updated ${competitionType} leaderboard with WOM data.`);
        } catch (err) {
            logger.error(`Error updateLeaderboard: ${err.message}`);
        }
    }
}

module.exports = CompetitionService;
