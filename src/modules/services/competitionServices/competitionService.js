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
const { recordCompetitionWinner, updateFinalLeaderboard } = require('./competitionWinners');
const { updateAllTimeLeaderboard } = require('./alltimeCompetitionWinners');
const migrateEndedCompetitions = require('../../../migrations/migrateEndedCompetitions');

/**
 * @fileoverview
 * **CompetitionService.js** handles the creation, management, and conclusion of competitions.
 * It orchestrates the lifecycle of competitions including processing ended competitions,
 * handling votes, creating new competitions, and scheduling rotations. 🚀
 *
 * **Key Exports:**
 * - `CompetitionService`: Main class that encapsulates all competition-related functionalities.
 *
 * @module CompetitionService
 */

/**
 * 🚀 **CompetitionService**
 *
 * This class is responsible for handling the lifecycle of competitions, including:
 * - Initializing competition rotations on startup.
 * - Processing ended competitions, updating leaderboards, and handling vote outcomes.
 * - Creating new competitions from queues, votes, or as defaults.
 * - Scheduling the next competition cycle.
 *
 * @class
 */
class CompetitionService {
    /**
     * 🛠️ **Constructor: Initializes a new CompetitionService instance.**
     *
     * @param {Discord.Client} client - The Discord client instance used for fetching channels and messages.
     */
    constructor(client) {
        this.client = client;
        /** @type {Map<string, any>} Map of scheduled jobs for competition rotations. */
        this.scheduledJobs = new Map();
    }

    /**
     * 🎯 **Initializes the Competition Service.**
     *
     * Schedules competition rotations on bot startup.
     *
     * @returns {Promise<void>} Resolves when initialization is complete.
     */
    async initialize() {
        await scheduleRotationsOnStartup();
    }

    /**
     * 🎯 **Starts the Next Competition Cycle.**
     *
     * Executes the entire cycle for processing competitions:
     * 1. Processes completed competitions.
     * 2. Checks for ongoing competitions.
     * 3. Processes votes for the last competition if available.
     * 4. Creates new competitions (queued or default).
     * 5. Determines and schedules the next rotation.
     *
     * @returns {Promise<void>} Resolves when the cycle is complete.
     */
    async startNextCompetitionCycle() {
        try {
            const now = new Date().toISOString();
            const competitionTypes = ['SOTW', 'BOTW'];
            let overallNearestEndTime = null;
            let pauseForRotationUpdate = false;

            for (const type of competitionTypes) {
                await removeInvalidCompetitions(db);

                // 🏆 Step 1: Process Completed Competitions
                await this.processEndedCompetitions(type);

                // ⏳ Step 2: Check for Ongoing Competitions (Skip if Active)
                const nearestEndDate = await this.checkOngoingCompetitions(type, now);
                if (nearestEndDate) {
                    overallNearestEndTime = this.updateNearestEndTime(overallNearestEndTime, nearestEndDate);
                    continue;
                }

                // 🗳️ Step 3: Check if Votes Exist for the Last Competition
                const lastCompetition = await db.getOne('SELECT * FROM competitions WHERE type = ? ORDER BY ends_at DESC LIMIT 1', [type]);

                let votesExist = false;
                if (lastCompetition) {
                    votesExist = await this.checkIfVotesExist(lastCompetition.id);
                }

                if (votesExist) {
                    logger.info(`Processing votes for last ${type} competition.`);
                    await this.processLastCompetition(type, lastCompetition);
                    pauseForRotationUpdate = true;
                }

                // 📜 Step 4: Create New Competitions (Queued or Default)
                pauseForRotationUpdate = await this.createNewCompetitions(type, lastCompetition, votesExist, pauseForRotationUpdate);

                // 🗓️ Step 5: Determine Next Rotation Time
                overallNearestEndTime = await this.getNearestFutureCompetition(type, overallNearestEndTime);
            }

            // 🔄 Step 6: Finalize Rotation Setup
            await this.finalizeRotation(overallNearestEndTime, pauseForRotationUpdate);
        } catch (err) {
            logger.error(`Error in startNextCompetitionCycle: ${err.message}`);
        }
    }

    /**
     * 🎯 **Checks if Votes Exist for a Competition.**
     *
     * Queries the database to determine if any votes have been recorded for the specified competition.
     *
     * @param {number|string} competitionId - The unique identifier for the competition.
     * @returns {Promise<boolean>} `true` if votes exist, otherwise `false`.
     */
    async checkIfVotesExist(competitionId) {
        const votes = await db.getOne('SELECT COUNT(*) as count FROM votes WHERE competition_id = ?', [competitionId]);

        return votes && votes.count > 0;
    }

    /**
     * 🎯 **Creates New Competitions.**
     *
     * Checks for queued competitions and creates a new competition accordingly. If no votes and no queue exist,
     * it creates a default competition.
     *
     * @param {string} type - Competition type (`SOTW` or `BOTW`).
     * @param {Object} lastCompetition - The most recent competition record. *TODO:* Clarify structure.
     * @param {boolean} votesExist - Indicates if votes exist for the last competition.
     * @param {boolean} pauseForRotationUpdate - Flag to determine if rotation update should be paused.
     * @returns {Promise<boolean>} Updated `pauseForRotationUpdate` flag.
     */
    async createNewCompetitions(type, lastCompetition, votesExist, pauseForRotationUpdate) {
        const queuedCompetitions = await db.getAll('SELECT * FROM competition_queue WHERE type = ? ORDER BY queued_at ASC', [type]);

        const channel = await this.client.channels.fetch(type === 'SOTW' ? constants.SOTW_CHANNEL_ID : constants.BOTW_CHANNEL_ID);

        if (!votesExist && queuedCompetitions.length === 0) {
            logger.info(`No votes and no queued competitions for ${type}. Creating a random competition.`);
            await purgeChannel(channel);
            await this.createDefaultCompetitions(type);
            return true;
        }

        if (queuedCompetitions.length > 0) {
            for (const comp of queuedCompetitions) {
                await purgeChannel(channel);
                await this.createCompetitionFromQueue(comp);
                logger.info(`Created competition from queue: ${comp.id} (${type})`);
            }

            await db.runQuery('DELETE FROM competition_queue WHERE type = ?', [type]);
            return true;
        }

        return pauseForRotationUpdate;
    }

    /**
     * 🎯 **Checks for Ongoing Competitions.**
     *
     * Determines if there are any active competitions of the given type that have not yet ended.
     *
     * @param {string} type - Competition type (`SOTW` or `BOTW`).
     * @param {string} now - Current timestamp in ISO format.
     * @returns {Promise<Date|null>} The end date of the nearest active competition, or `null` if none exist.
     */
    async checkOngoingCompetitions(type, now) {
        const existingCompetitions = await db.getAll('SELECT * FROM competitions WHERE type = ? AND ends_at > ?', [type, now]);

        if (existingCompetitions.length > 0) {
            logger.info(`Skipping new ${type} competition creation (active competitions exist).`);
            return new Date(existingCompetitions[0].ends_at);
        }

        return null;
    }

    /**
     * 🎯 **Processes Ended Competitions.**
     *
     * For competitions that have ended and not yet had their final leaderboard sent, this method:
     * - Records the competition winner.
     * - Updates both final and all-time leaderboards.
     * - Marks the competition as processed.
     *
     * @param {string} type - Competition type (`SOTW` or `BOTW`).
     * @returns {Promise<void>}
     */
    async processEndedCompetitions(type) {
        const now = new Date().toISOString();
        const endedCompetitions = await db.getAll(
            `
        SELECT * FROM competitions 
        WHERE ends_at <= ? AND type = ? AND final_leaderboard_sent = 0
    `,
            [now, type],
        );

        for (const competition of endedCompetitions) {
            await recordCompetitionWinner(competition);
            await updateFinalLeaderboard(competition, this.client);
            await updateAllTimeLeaderboard(this.client); // ✅ Updates leaderboard after every competition
            // ✅ Mark the competition as having sent the final leaderboard
            await db.runQuery('UPDATE competitions SET final_leaderboard_sent = 1 WHERE id = ?', [competition.id]);

            logger.info(`📢 Final leaderboard sent for competition ID ${competition.id}`);
        }
    }

    /**
     * 🎯 **Processes the Last Competition Based on Vote Outcome.**
     *
     * Fetches the appropriate Discord channel, purges its contents, and creates a new competition based on the vote results.
     *
     * @param {string} type - Competition type (`SOTW` or `BOTW`).
     * @param {Object} lastCompetition - The most recent competition record from which votes are processed.
     * @returns {Promise<void>}
     */
    async processLastCompetition(type, lastCompetition) {
        const channel = await this.client.channels.fetch(type === 'SOTW' ? constants.SOTW_CHANNEL_ID : constants.BOTW_CHANNEL_ID);

        await purgeChannel(channel);
        await this.createCompetitionFromVote(lastCompetition);
    }

    /**
     * 🎯 **Determines the Nearest Future Competition End Time.**
     *
     * Checks active competitions for the given type and updates the overall nearest end time.
     *
     * @param {string} type - Competition type (`SOTW` or `BOTW`).
     * @param {Date|null} overallNearestEndTime - The current overall nearest end time.
     * @returns {Promise<Date|null>} The updated overall nearest end time.
     */
    async getNearestFutureCompetition(type, overallNearestEndTime) {
        const newActiveCompetitions = await db.getAll('SELECT * FROM competitions WHERE type = ? AND ends_at > ? ORDER BY ends_at ASC', [type, new Date().toISOString()]);

        if (newActiveCompetitions.length > 0) {
            return this.updateNearestEndTime(overallNearestEndTime, new Date(newActiveCompetitions[0].ends_at));
        }

        return overallNearestEndTime;
    }

    /**
     * 🎯 **Updates the Nearest End Time.**
     *
     * Compares the current nearest end time with a new candidate and returns the earlier of the two.
     *
     * @param {Date|null} currentNearest - The current nearest end time.
     * @param {Date} newEndDate - The new candidate end time.
     * @returns {Date} The updated nearest end time.
     */
    updateNearestEndTime(currentNearest, newEndDate) {
        return !currentNearest || newEndDate < currentNearest ? newEndDate : currentNearest;
    }

    /**
     * 🎯 **Finalizes the Rotation Setup.**
     *
     * Completes the competition cycle by:
     * - Optionally pausing the rotation update.
     * - Updating competition-related data (leaderboards, embeds).
     * - Scheduling the next rotation based on the nearest end time.
     * - Migrating ended competitions.
     *
     * @param {Date|null} overallNearestEndTime - The determined next rotation time.
     * @param {boolean} pauseForRotationUpdate - Whether to pause before updating competition data.
     * @returns {Promise<void>}
     */
    async finalizeRotation(overallNearestEndTime, pauseForRotationUpdate) {
        logger.info('Next competition cycle setup completed.');

        if (pauseForRotationUpdate) {
            await sleep(63000);
        }

        await this.updateCompetitionData();

        if (overallNearestEndTime) {
            scheduleRotation(new Date(overallNearestEndTime), () => this.startNextCompetitionCycle(), this.scheduledJobs);
            logger.info(`Scheduled next rotation at ${overallNearestEndTime.toISOString()}.`);
            await migrateEndedCompetitions();
        } else {
            logger.info('No active or scheduled competitions found. Rotation not scheduled.');
        }
    }

    /**
     * 🎯 **Updates Competition Data.**
     *
     * Refreshes the active competition embeds for both `SOTW` and `BOTW` competitions.
     *
     * @returns {Promise<void>}
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
     * 🎯 **Creates Default Competitions.**
     *
     * When no queued competitions exist, this method creates a default competition for the given type
     * by randomly selecting a metric and scheduling the competition based on the configured rotation period.
     *
     * @param {string} type - Competition type (`SOTW` or `BOTW`).
     * @returns {Promise<void>}
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
     * 🎯 **Creates a Competition from Queue Data.**
     *
     * Uses the provided queued competition data to schedule a new competition.
     *
     * @param {Object} competition - Competition data retrieved from the queue.
     * @returns {Promise<void>}
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
     * 🎯 **Schedules Rotations on Bot Startup.**
     *
     * On startup, this method schedules future competition rotations based on active competitions.
     *
     * @returns {Promise<void>}
     */
    async scheduleRotationsOnStartup() {
        try {
            await scheduleRotationsOnStartup(db, () => this.startNextCompetitionCycle(), constants, this.scheduledJobs, womclient);
        } catch (err) {
            logger.error(`Error scheduling rotations on startup: ${err.message}`);
        }
    }

    /**
     * 🎯 **Creates a Competition Based on Voting Results.**
     *
     * This method creates a new competition based on the results of a completed competition.
     * If no winning metric is determined from votes, it falls back to queued competitions or selects a random metric.
     *
     * @param {Object} competition - The completed competition whose votes are being processed.
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
     * 🎯 **Returns a Random Metric.**
     *
     * Retrieves a random metric (skill or boss name) ensuring that it does not match the metric
     * used in the most recent competition.
     *
     * @param {string} type - The type of metric to retrieve (`Skill` or `Boss`).
     * @returns {Promise<string>} A promise that resolves to the selected metric name.
     * @throws {Error} If no available metrics are found.
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
     * 🎯 **Handles a User Vote Interaction.**
     *
     * Processes a user's vote by verifying eligibility, recording the vote, and updating the poll embed.
     * Responds to the interaction with appropriate success or error messages.
     *
     * @param {Object} interaction - The Discord interaction object containing user vote data.
     * @returns {Promise<void>}
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
            // Find active competition
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

            // Check if user already voted
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

            // Insert vote into the database
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
