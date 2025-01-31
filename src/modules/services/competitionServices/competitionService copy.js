/* eslint-disable jsdoc/require-returns */
// @ts-nocheck

const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/dbUtils');
const { getConfigValue, setConfigValue } = require('../../utils/dbUtils');
const logger = require('../../utils/logger');
const { createCompetitionEmbed, createVotingDropdown } = require('../../utils/embedUtils');
const constants = require('../../../config/constants');
const schedule = require('node-schedule');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');
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
        this.scheduledJobs = new Map();
    }

    /**
     * Starts the next competition cycle and schedules the subsequent rotation.
     */
    /**
     * Starts the next competition cycle and schedules the subsequent rotation.
     */
    async startNextCompetitionCycle() {
        try {
            const now = new Date();
            const nowISOString = now.toISOString();

            // Define the competition types to handle
            const competitionTypes = ['SOTW', 'BOTW'];

            // To keep track of the nearest end time across all competition types
            let overallNearestEndTime = null;

            for (const type of competitionTypes) {
                // ===== Step 1: Process Ended Competitions for the Current Type =====
                const endedCompetitions = await db.getAll(
                    `
                SELECT *
                FROM competitions
                WHERE ends_at <= ?
                  AND type = ?
                `,
                    [nowISOString, type],
                );

                if (endedCompetitions.length > 0) {
                    for (const comp of endedCompetitions) {
                        logger.info(`Competition ${comp.id} of type ${comp.type} has ended and was processed.`);
                    }
                }

                // ===== Step 2: Check for Active Competitions of the Current Type =====
                const activeCompetitions = await db.getAll(
                    `
                SELECT *
                FROM competitions
                WHERE ends_at > ?
                  AND type = ?
                ORDER BY ends_at ASC
                `,
                    [nowISOString, type],
                );

                if (activeCompetitions.length > 0) {
                    // Update embeds and perform any necessary updates
                    // await this.updateCompetitionData();
                    await this.removeInvalidCompetitions();
                    logger.info(`There are still active ${type} competitions running. Skipping new ${type} competition creation.`);

                    // Find the nearest end time for the current type
                    const nearestEnd = activeCompetitions[0].ends_at;
                    const nearestEndDate = new Date(nearestEnd);

                    // Update the overall nearest end time if necessary
                    if (!overallNearestEndTime || nearestEndDate < overallNearestEndTime) {
                        overallNearestEndTime = nearestEndDate;
                    }

                    // Continue to the next competition type without creating a new competition for this type
                    continue;
                }

                // ===== Step 3: Handle Rotation and Create New Competition for the Current Type =====
                // Increment and update the rotation index
                let rotationIndex = parseInt(await getConfigValue('boss_rotation_index', '0'), 10) || 0;
                rotationIndex = (rotationIndex + 1) % 9999; // Adjust modulus as needed
                await setConfigValue('boss_rotation_index', rotationIndex);
                logger.info(`Updated boss_rotation_index => ${rotationIndex}`);

                // Fetch queued competitions for the current type
                const queuedCompetitions = await db.getAll(
                    `
                SELECT *
                FROM competition_queue
                WHERE type = ?
                ORDER BY queued_at ASC
                `,
                    [type],
                );

                if (queuedCompetitions.length === 0) {
                    logger.info(`No queued competitions found for type ${type}. Creating default competitions.`);
                    await this.createDefaultCompetitions(type);
                } else {
                    for (const comp of queuedCompetitions) {
                        // Create competition based on queue
                        await this.createCompetitionFromQueue(comp);
                        logger.info(`Created competition from queue: ${comp.id} of type ${type}`);
                    }
                    // Clear the competition queue for the current type after processing
                    await db.runQuery(
                        `
                    DELETE FROM competition_queue
                    WHERE type = ?
                    `,
                        [type],
                    );
                    logger.info(`Cleared competition queue for type ${type} after creating competitions.`);
                }

                // Update embeds after creating competitions
                await this.updateCompetitionData();
                logger.info(`Created new competition(s) for type ${type}.`);

                // Fetch newly created active competitions for the current type to find the nearest end time
                const newActiveCompetitions = await db.getAll(
                    `
                SELECT *
                FROM competitions
                WHERE ends_at > ?
                  AND type = ?
                ORDER BY ends_at ASC
                `,
                    [new Date().toISOString(), type],
                );

                if (newActiveCompetitions.length > 0) {
                    const nearestEnd = newActiveCompetitions[0].ends_at;
                    const nearestEndDate = new Date(nearestEnd);
                    if (!overallNearestEndTime || nearestEndDate < overallNearestEndTime) {
                        overallNearestEndTime = nearestEndDate;
                    }
                }
            }

            logger.info('Next competition cycle setup completed.');

            // ===== Step 4: Schedule Rotation Based on the Nearest End Time Across All Types =====
            if (overallNearestEndTime) {
                this.scheduleRotation(overallNearestEndTime);
                logger.info(`Scheduled next rotation at ${overallNearestEndTime.toISOString()}.`);
            } else {
                logger.info('No active competitions found. Rotation not scheduled.');
            }
        } catch (err) {
            logger.error(`Error in startNextCompetitionCycle: ${err.message}`);
        }
    }

    /**
     *
     */
    async updateCompetitionData() {
        await this.removeInvalidCompetitions();
        await this.updateLeaderboard('SOTW');
        await this.updateLeaderboard('BOTW');
        await this.updateActiveCompetitionEmbed('SOTW');
        await this.updateActiveCompetitionEmbed('BOTW');
    }
    /**
     * Schedules the rotation using node-schedule.
     * @param {Date} endTime - The time when the competition ends.
     */
    scheduleRotation(endTime) {
        const jobName = 'rotation';

        // Cancel existing job if any
        if (this.scheduledJobs.has(jobName)) {
            const existingJob = this.scheduledJobs.get(jobName);
            existingJob.cancel();
            this.scheduledJobs.delete(jobName);
            logger.info('Cleared existing scheduled rotation job.');
        }

        // Schedule the job
        const job = schedule.scheduleJob(endTime, async () => {
            logger.info('Scheduled rotation triggered.');
            await this.startNextCompetitionCycle();
            this.scheduledJobs.delete(jobName);
        });

        this.scheduledJobs.set(jobName, job);
        logger.info(`Scheduled rotation for ${endTime.toISOString()}.`);
    }

    /**
     * On bot startup, schedule rotations based on active competitions.
     */
    async scheduleRotationsOnStartup() {
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

            if (activeCompetitions.length === 0) {
                logger.info('No active competitions on startup. Scheduling immediate rotation.');
                await this.startNextCompetitionCycle();
                return;
            }

            // Find the nearest end time
            const nearestEnd = activeCompetitions[0].ends_at;
            this.scheduleRotation(new Date(nearestEnd));
            logger.info(`Scheduled rotation for competition ending at ${nearestEnd}.`);
        } catch (err) {
            logger.error(`Error scheduling rotations on startup: ${err.message}`);
        }
    }

    /**
     * Removes any competitions from the DB that do not exist on WOM
     * (i.e., WOM returns a 404 or otherwise invalid data).
     */
    async removeInvalidCompetitions() {
        try {
            const allCompetitions = await db.getAll('SELECT * FROM competitions');
            logger.debug(`Fetched ${allCompetitions.length} competitions from the database.`);

            for (const comp of allCompetitions) {
                try {
                    // Fetch competition details from WOM API
                    const womDetails = await WOMApiClient.request('competitions', 'getCompetitionDetails', comp.id);

                    // Check if competition data exists
                    if (womDetails && womDetails.id) {
                        const { id, title, metric, startsAt, endsAt } = womDetails;
                        logger.debug(`WOM Competition Details for ID ${id}: Title="${title}", Metric="${metric}", StartsAt="${startsAt}", EndsAt="${endsAt}"`);

                        // Compare API data with DB entry
                        const dbCompetition = comp; // Current DB record
                        const apiCompetition = womDetails; // Data from API

                        const updates = {};

                        // Compare and prepare updates
                        if (dbCompetition.title !== apiCompetition.title) {
                            updates.title = apiCompetition.title;
                            logger.info(`Updating title for competition ID ${comp.id}: "${dbCompetition.title}" => "${apiCompetition.title}"`);
                        }

                        if (dbCompetition.metric !== apiCompetition.metric) {
                            updates.metric = apiCompetition.metric;
                            logger.info(`Updating metric for competition ID ${comp.id}: "${dbCompetition.metric}" => "${apiCompetition.metric}"`);
                        }

                        // Handle starts_at
                        const dbStartsAt = new Date(dbCompetition.starts_at);
                        const apiStartsAt = new Date(apiCompetition.startsAt);

                        if (dbStartsAt.getTime() !== apiStartsAt.getTime()) {
                            // Convert to ISO string to ensure consistency
                            updates.starts_at = apiStartsAt.toISOString();
                            logger.info(`Updating starts_at for competition ID ${comp.id}: "${dbCompetition.starts_at}" => "${updates.starts_at}"`);
                        }

                        // Handle ends_at
                        const dbEndsAt = new Date(dbCompetition.ends_at);
                        const apiEndsAt = new Date(apiCompetition.endsAt);

                        if (dbEndsAt.getTime() !== apiEndsAt.getTime()) {
                            // Convert to ISO string to ensure consistency
                            updates.ends_at = apiEndsAt.toISOString();
                            logger.info(`Updating ends_at for competition ID ${comp.id}: "${dbCompetition.ends_at}" => "${updates.ends_at}"`);
                        }

                        // If any updates are present, execute the update query
                        const updateKeys = Object.keys(updates);
                        if (updateKeys.length > 0) {
                            const setClause = updateKeys.map((key) => `${key} = ?`).join(', ');
                            const values = updateKeys.map((key) => updates[key]);
                            values.push(comp.id); // For WHERE clause

                            const updateQuery = `
                            UPDATE competitions
                            SET ${setClause}
                            WHERE id = ?
                        `;

                            await db.runQuery(updateQuery, values);
                            logger.info(`Updated competition ID ${comp.id} with new details from WOM API.`);
                        }
                    } else {
                        // Log the entire womDetails object for debugging
                        logger.debug(`WOM Competition Details for ID ${comp.id}: ${JSON.stringify(womDetails, null, 2)}`);
                    }
                } catch (err) {
                    // Handle specific error where competition is not found
                    if (err.message && err.message.includes('Competition not found')) {
                        await db.runQuery('DELETE FROM competitions WHERE id = ?', [comp.id]);
                        logger.info(`Removed competition ID ${comp.id} from DB (WOM "Competition not found").`);
                    } else {
                        // Log other errors for debugging
                        logger.error(`Error fetching WOM competition ID ${comp.id}: ${err.message}`, { competitionId: comp.id, errorStack: err.stack });
                    }
                }
            }
        } catch (err) {
            logger.error(`Failed to remove invalid competitions: ${err.message}`, { errorStack: err.stack });
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
    // Corrected createCompetition method
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

            // Build embed
            const { embeds, files } = await createCompetitionEmbed(this.client, type, metric, startsAt.toISOString(), endsAt.toISOString());

            if (!embeds || embeds.length === 0) {
                logger.error('Embed creation failed: No embeds were generated.');
                return;
            }

            // Fetch skill/boss from DB for initial dropdown
            const optionsData = await db.getAll(
                `
            SELECT name 
            FROM skills_bosses
            WHERE type=?
            `,
                [type === 'SOTW' ? 'Skill' : 'Boss'],
            );

            const options = optionsData.map((e) => ({
                label: e.name
                    .toLowerCase()
                    .split('_')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' '),
                description: `Vote for ${e.name
                    .toLowerCase()
                    .split('_')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}`,
                value: e.name,
            }));
            const limitedOptions = options.slice(0, 25);
            const dropdown = createVotingDropdown(limitedOptions);

            const pollMsg = await channel.send({ embeds, files, components: [dropdown] });
            logger.info(`Poll msg posted: ID ${pollMsg.id}`);

            // Store in DB
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

            // 3) Build the new embed and attachments
            const { embeds, files } = await createCompetitionEmbed(this.client, comp.type, comp.metric, comp.starts_at, comp.ends_at);

            if (!embeds || embeds.length === 0) {
                logger.error('Embed creation failed: No embeds were generated.');
                return;
            }

            if (oldMsg) {
                // We have an old message. Decide if it's outdated or forced
                const oldEmbed = oldMsg.embeds?.[0];
                let isOutdated = true;

                if (oldEmbed && !forceRefresh) {
                    const newDesc = embeds[0].data.description;
                    const oldDesc = oldEmbed.description;
                    if (oldDesc && newDesc && oldDesc.trim() === newDesc.trim()) {
                        // The embed text is identical, so not “outdated”
                        isOutdated = false;
                    }
                }

                if (isOutdated) {
                    logger.debug('Editing old competition message with a fresh embed and dropdown...');

                    // Rebuild the dropdown based on the competition type
                    const dropdown = await this.buildPollDropdown(comp.type);

                    await oldMsg.edit({ embeds, files, components: [dropdown] });
                } else {
                    logger.debug('Embed not outdated, skipping re-edit...');
                }
            } else {
                // 4) The old message was missing => Re-post a new one
                // => Also add the dropdown if you want them to keep voting from that embed
                const dropdown = await this.buildPollDropdown(comp.type);
                const posted = await channel.send({
                    embeds,
                    files,
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
            const label = e.name
                .toLowerCase()
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            const count = voteMap.get(e.name) || 0;

            return {
                label,
                description: '',
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
                content: `Your vote for **${selectedOption
                    .toLowerCase()
                    .split('_')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}** has been recorded. Thank you!`,
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
     * @param {string} competitionType - 'SOTW' or 'BOTW'
     */
    async updateLeaderboard(competitionType) {
        try {
            const channelId = competitionType === 'SOTW' ? constants.SOTW_CHANNEL_ID : constants.BOTW_CHANNEL_ID;
            const channel = await this.client.channels.fetch(channelId);

            if (!channel) {
                logger.error(`No channel found for type ${competitionType}`);
                return;
            }

            const competition = await this.getActiveCompetition(competitionType);
            if (!competition) {
                logger.warn(`No active competition found for ${competitionType}`);
                return;
            }

            const sortedParticipants = await this.getSortedParticipants(competition.id);
            const embedDescription = this.formatLeaderboardDescription(sortedParticipants);

            const embed = this.buildLeaderboardEmbed(competitionType, embedDescription);

            await this.sendOrUpdateEmbed(channel, competition, embed);
            logger.info(`Updated ${competitionType} leaderboard with WOM data.`);
        } catch (err) {
            logger.error(`Error updateLeaderboard: ${err.message}`);
        }
    }

    /**
     * Fetch the active competition from the database
     * @param {string} competitionType
     * @returns {Object|null}
     */
    async getActiveCompetition(competitionType) {
        return await db.getOne(
            `
        SELECT *
        FROM competitions
        WHERE type=?
          AND starts_at <= ?
          AND ends_at >= ?
        `,
            [competitionType, new Date().toISOString(), new Date().toISOString()],
        );
    }

    /**
     * Fetch and sort participants based on progress gained
     * @param {string} competitionId
     * @returns {Array}
     */
    async getSortedParticipants(competitionId) {
        const details = await womclient.competitions.getCompetitionDetails(competitionId);
        return details.participations.sort((a, b) => b.progress.gained - a.progress.gained);
    }

    /**
     * Format the leaderboard description
     * @param {Array} participants
     * @returns {string}
     */
    formatLeaderboardDescription(participants) {
        let desc = '';
        participants.slice(0, 10).forEach((p, i) => {
            desc += `**${i + 1}.** ${p.player.displayName} — \`${p.progress.gained.toLocaleString()}\`\n`;
        });
        return desc || 'No participants yet.';
    }

    /**
     * Build the leaderboard embed
     * @param {string} competitionType
     * @param {string} description
     * @returns {EmbedBuilder}
     */
    buildLeaderboardEmbed(competitionType, description) {
        return new EmbedBuilder()
            .setTitle(`${competitionType} Leaderboard`)
            .setColor(competitionType === 'SOTW' ? 0x3498db : 0xe74c3c)
            .setDescription(description)
            .setFooter({ text: 'Live data from WOM' })
            .setTimestamp();
    }

    /**
     * Send a new embed or update the existing one
     * @param {Channel} channel
     * @param {Object} competition
     * @param {EmbedBuilder} embed
     */
    async sendOrUpdateEmbed(channel, competition, embed) {
        if (competition.leaderboard_message_id) {
            try {
                const msg = await channel.messages.fetch(competition.leaderboard_message_id);
                await msg.edit({ embeds: [embed] });
            } catch (err) {
                logger.error(`Failed to fetch or edit message ID ${competition.leaderboard_message_id}: ${err.message}`);
                // Optionally, send a new embed if fetching/editing fails
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
    }
}

module.exports = CompetitionService;
