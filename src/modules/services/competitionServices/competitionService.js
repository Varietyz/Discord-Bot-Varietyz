// competitionService/CompetitionService.js

/* eslint-disable jsdoc/require-returns */
// @ts-nocheck

const db = require('../../utils/dbUtils');
const { sleep } = require('../../utils/sleepUtil');
const { calculateEndDate } = require('../../utils/dateUtils');
const { purgeChannel } = require('../../utils/purgeChannel');
const logger = require('../../utils/logger');
const constants = require('../../../config/constants');
require('dotenv').config();

const { WOMClient } = require('@wise-old-man/utils');
const womclient = new WOMClient();

const { createCompetition } = require('./competitionCreator');
const { removeInvalidCompetitions } = require('./competitionValidator');
const { updateActiveCompetitionEmbed } = require('./embedHandler');
const { scheduleRotation, scheduleRotationsOnStartup } = require('./scheduler');
const { tallyVotesAndRecordWinner } = require('../../utils/tallyVotes');
const { buildPollDropdown } = require('./embedHandler');

/**
 * CompetitionService handles creation, management, and conclusion of competitions.
 */
class CompetitionService {
    /**
     *
     * @param {Discord.Client} client - The Discord client instance.
     */
    constructor(client) {
        this.client = client;
        this.scheduledJobs = new Map();
    }

    /**
     * Initializes the CompetitionService by scheduling rotations on startup.
     */
    async initialize() {
        await this.scheduleRotationsOnStartup();
    }

    /**
     * Starts the next competition cycle and schedules the subsequent rotation.
     */
    async startNextCompetitionCycle() {
        try {
            const now = new Date();
            const nowISOString = now.toISOString();

            const competitionTypes = ['SOTW', 'BOTW'];

            let overallNearestEndTime = null;
            let pauseForRotationUpdate = false;

            for (const type of competitionTypes) {
                const existingCompetitions = await db.getAll(
                    `
                    SELECT *
                    FROM competitions
                    WHERE type = ?
                      AND ends_at > ?
                    `,
                    [type, nowISOString],
                );

                if (existingCompetitions.length > 0) {
                    logger.info(`There are still active or scheduled ${type} competitions running. Skipping new ${type} competition creation.`);

                    const nearestEnd = existingCompetitions.reduce((prev, current) => {
                        return new Date(prev.ends_at) < new Date(current.ends_at) ? prev : current;
                    }).ends_at;
                    const nearestEndDate = new Date(nearestEnd);

                    if (!overallNearestEndTime || nearestEndDate < overallNearestEndTime) {
                        overallNearestEndTime = nearestEndDate;
                    }
                    // Continue to the next competition type without creating a new competition for this type
                    continue;
                }

                // Before creating a new competition, process the last ended competition

                const lastCompetition = await db.getOne('SELECT * FROM competitions WHERE type = ? ORDER BY ends_at DESC LIMIT 1', [type]);

                if (lastCompetition) {
                    logger.info(`Processing votes for last ${type} competition.`);
                    const channel = await this.client.channels.fetch(type === 'SOTW' ? constants.SOTW_CHANNEL_ID : constants.BOTW_CHANNEL_ID);
                    await purgeChannel(channel);
                    await this.createCompetitionFromVote(lastCompetition);
                    pauseForRotationUpdate = true;
                }

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

                if (queuedCompetitions.length === 0 && !lastCompetition) {
                    logger.info(`No queued competitions found for type ${type}. Creating default competitions.`);
                    const channel = await this.client.channels.fetch(type === 'SOTW' ? constants.SOTW_CHANNEL_ID : constants.BOTW_CHANNEL_ID);
                    await purgeChannel(channel);
                    await this.createDefaultCompetitions(type);
                    pauseForRotationUpdate = true;
                } else {
                    for (const comp of queuedCompetitions) {
                        const channel = await this.client.channels.fetch(type === 'SOTW' ? constants.SOTW_CHANNEL_ID : constants.BOTW_CHANNEL_ID);
                        await purgeChannel(channel);
                        await this.createCompetitionFromQueue(comp);
                        pauseForRotationUpdate = true;
                        logger.info(`Created competition from queue: ${comp.id} of type ${type}`);
                    }
                    await db.runQuery(
                        `
                        DELETE FROM competition_queue
                        WHERE type = ?
                        `,
                        [type],
                    );
                    logger.info(`Cleared competition queue for type ${type} after creating competitions.`);
                }

                logger.info(`Created new competition(s) for type ${type}.`);

                const newActiveCompetitions = await db.getAll(
                    `
                    SELECT *
                    FROM competitions
                    WHERE type = ?
                      AND ends_at > ?
                    ORDER BY ends_at ASC
                    `,
                    [type, new Date().toISOString()],
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
            await removeInvalidCompetitions(db);
            if (pauseForRotationUpdate == true) {
                await sleep(63000);
            }
            pauseForRotationUpdate = 0;
            await this.updateCompetitionData();
            if (overallNearestEndTime) {
                scheduleRotation(new Date(overallNearestEndTime), () => this.startNextCompetitionCycle(), this.scheduledJobs);
                logger.info(`Scheduled next rotation at ${overallNearestEndTime.toISOString()}.`);
            } else {
                logger.info('No active or scheduled competitions found. Rotation not scheduled.');
            }
        } catch (err) {
            logger.error(`Error in startNextCompetitionCycle: ${err.message}`);
        }
    }

    /**
     * Updates various competition data aspects including leaderboards and embeds.
     */
    async updateCompetitionData() {
        try {
            await updateActiveCompetitionEmbed('SOTW', db, this.client, constants);
            await updateActiveCompetitionEmbed('BOTW', db, this.client, constants);
        } catch (err) {
            logger.error(`Error in updateCompetitionData: ${err.message}`);
        }
    }

    /**
     * Creates default competitions when no queued competitions are present.
     * @param {string} type - Competition type ('SOTW' or 'BOTW').
     */
    async createDefaultCompetitions(type) {
        try {
            const randomSkill = await this.getRandomMetric('Skill');
            const randomBoss = await this.getRandomMetric('Boss');

            const now = new Date();
            const startsAt = new Date(now.getTime() + 60000);

            const rotationWeeksResult = await db.getOne('SELECT value FROM config WHERE key = ?', ['rotation_period_weeks']);
            const rotationWeeks = rotationWeeksResult ? parseInt(rotationWeeksResult.value, 10) : 1;

            const endsAt = calculateEndDate(rotationWeeks);

            if (type === 'SOTW') {
                logger.info(`Creating SOTW for metric "${randomSkill}"`);
                await createCompetition(womclient, db, 'SOTW', randomSkill, startsAt, endsAt, constants);
            } else if (type === 'BOTW') {
                logger.info(`Creating BOTW for metric "${randomBoss}"`);
                await createCompetition(womclient, db, 'BOTW', randomBoss, startsAt, endsAt, constants);
            }
        } catch (err) {
            logger.error(`Error createDefaultCompetitions: ${err.message}`);
        }
    }

    /**
     * Creates a competition based on queue data.
     * @param {Object} competition - Competition data from queue.
     */
    async createCompetitionFromQueue(competition) {
        try {
            const { type, metric } = competition;
            const now = new Date();
            const startsAt = new Date(now.getTime() + 60000);

            const rotationWeeksResult = await db.getOne('SELECT value FROM config WHERE key = ?', ['rotation_period_weeks']);
            const rotationWeeks = rotationWeeksResult ? parseInt(rotationWeeksResult.value, 10) : 1;

            const endsAt = calculateEndDate(rotationWeeks);

            await createCompetition(womclient, db, type, metric, startsAt, endsAt, constants);
        } catch (err) {
            logger.error(`Error createCompetitionFromQueue: ${err.message}`);
        }
    }

    /**
     * On bot startup, schedule rotations based on active competitions.
     */
    async scheduleRotationsOnStartup() {
        try {
            await scheduleRotationsOnStartup(db, () => this.startNextCompetitionCycle(), constants, this.scheduledJobs, womclient);
        } catch (err) {
            logger.error(`Error scheduling rotations on startup: ${err.message}`);
        }
    }

    /**
     * Creates a new competition based on the voting results or falls back to the queue/default.
     * @param {Object} competition - The completed competition.
     * @returns {Promise<void>}
     */
    async createCompetitionFromVote(competition) {
        const now = new Date();

        if (new Date(competition.ends_at) > now) {
            logger.warn(`❌ Competition ID ${competition.id} has NOT ended yet. Skipping vote processing.`);
            return;
        }

        logger.info(`Checking vote results for ${competition.type} competition ID ${competition.id}...`);

        // ✅ Step 1: Get the winning metric from the votes
        let winningMetric = await tallyVotesAndRecordWinner(competition);

        if (!winningMetric) {
            logger.info(`No votes recorded for competition ID ${competition.id}. Checking queued competitions.`);

            // ✅ Step 2: Check queued competitions
            const queuedCompetition = await db.getOne('SELECT * FROM competition_queue WHERE type = ? ORDER BY queued_at ASC LIMIT 1', [competition.type]);

            if (queuedCompetition) {
                logger.info(`Using queued ${competition.type} competition: ${queuedCompetition.metric}`);

                // ✅ Step 3: Remove from queue
                await db.runQuery('DELETE FROM competition_queue WHERE id = ?', [queuedCompetition.id]);

                winningMetric = queuedCompetition.metric;
            } else {
                logger.info(`No queued competitions found for ${competition.type}. Creating a default one.`);

                // ✅ Step 4: Ensure a metric is always chosen
                winningMetric = await this.getRandomMetric(competition.type);
            }
        }

        // ✅ Step 5: Ensure competition type is always valid
        const newType = competition.type && competition.type.toUpperCase() === 'SOTW' ? 'SOTW' : 'BOTW';

        // ✅ Step 6: Set start and end times for the new competition
        const startsAt = new Date(now.getTime() + 60000); // Start in 1 minute

        // ✅ Step 7: Retrieve the configured rotation period (default: 1 week)
        const rotationWeeksResult = await db.getOne('SELECT value FROM config WHERE key = ?', ['rotation_period_weeks']);

        const rotationWeeks = rotationWeeksResult && !isNaN(parseInt(rotationWeeksResult.value, 10)) ? parseInt(rotationWeeksResult.value, 10) : 1;

        const endsAt = calculateEndDate(rotationWeeks);

        // ✅ Step 8: Create the new competition
        await createCompetition(womclient, db, newType, winningMetric, startsAt, endsAt, constants);

        logger.info(`New ${newType} competition created successfully: ${winningMetric}`);
    }

    /**
     * Returns a random skill or boss name.
     * @param {string} type - 'Skill' or 'Boss'.
     * @returns {Promise<string>}
     */
    async getRandomMetric(type) {
        try {
            const lastComp = await db.getOne('SELECT metric FROM competitions WHERE type = ? ORDER BY ends_at DESC LIMIT 1', [type === 'Skill' ? 'SOTW' : 'BOTW']);

            let query = 'SELECT name FROM skills_bosses WHERE type = ?';
            const params = [type];

            if (lastComp && lastComp.metric) {
                query += ' AND name != ?';
                params.push(lastComp.metric);
            }

            const results = await db.getAll(query, params);

            if (results.length === 0) {
                logger.error(`🚨 No available metrics found for ${type}.`);
                throw new Error(`No metrics found for type ${type}`);
            }

            // ✅ Select a random metric from the available ones
            const chosen = results[Math.floor(Math.random() * results.length)].name;
            logger.info(`🎲 Selected random ${type} metric: ${chosen}`);
            return chosen;
        } catch (err) {
            logger.error(`⚠️ getRandomMetric error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Handles a user vote interaction.
     * @param {Object} interaction - The Discord interaction.
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
                return interaction.reply({ content: '⚠️ No active competition found.', flags: 64 });
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
                return interaction.reply({ content: '🚫 You have already voted in this competition.', flags: 64 });
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
                content: `✅ Your vote for **${selectedOption
                    .toLowerCase()
                    .split('_')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}** has been recorded. Thank you!`,
                flags: 64,
            });
            if (competition.message_id) {
                const channel = await interaction.client.channels.fetch(competitionType === 'SOTW' ? constants.SOTW_CHANNEL_ID : constants.BOTW_CHANNEL_ID);

                if (channel) {
                    try {
                        const message = await channel.messages.fetch(competition.message_id);
                        if (message) {
                            // **Step 2: Rebuild the dropdown with updated vote counts**
                            const dropdown = await buildPollDropdown(competitionType, db);

                            // **Step 3: Edit the existing message to reflect new votes**
                            await message.edit({ components: [dropdown] });
                            logger.info(`✅ Updated poll dropdown for ${competitionType} after a vote.`);
                        }
                    } catch (err) {
                        logger.error(`❌ Error updating dropdown after vote: ${err.message}`);
                    }
                }
            }
        } catch (err) {
            logger.error(`Error handleVote for user ${userId}: ${err.message}`);
            return interaction.reply({
                content: '❌ There was an error processing your vote.',
                flags: 64,
            });
        }
    }
}

module.exports = CompetitionService;
