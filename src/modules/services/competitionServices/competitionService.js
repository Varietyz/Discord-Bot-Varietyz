const db = require('../../utils/essentials/dbUtils');
const { sleep } = require('../../utils/helpers/sleepUtil');
const { calculateEndDate } = require('../../utils/helpers/dateUtils');
const { purgeChannel } = require('../../utils/helpers/purgeChannel');
const logger = require('../../utils/essentials/logger');
const constants = require('../../../config/constants');
require('dotenv').config();
const { WOMClient } = require('@wise-old-man/utils');
const womclient = new WOMClient();
const { createCompetition } = require('./competitionCreator');
const { removeInvalidCompetitions } = require('./competitionValidator');
const { updateActiveCompetitionEmbed } = require('./embedHandler');
const { scheduleRotation, scheduleRotationsOnStartup } = require('./scheduler');
const { tallyVotesAndRecordWinner } = require('../../utils/helpers/tallyVotes');
const { buildPollDropdown } = require('./embedHandler');
const {
    recordCompetitionWinner,
    updateFinalLeaderboard,
} = require('./competitionWinners');
const { updateAllTimeLeaderboard } = require('./alltimeCompetitionWinners');
const migrateEndedCompetitions = require('../../../migrations/migrateEndedCompetitions');
const { refreshBingoInfoEmbed } = require('../bingo/embeds/bingoInfoData');

class CompetitionService {

    constructor(client) {
        this.client = client;
        this.scheduledJobs = new Map();
        this.pendingCreations = {
            SOTW: false,
            BOTW: false,
        };
    }

    async initialize() {
        this.scheduledJobs.clear();
        this.scheduledJobs.meta = new Map();
        logger.info('🧹 Cleared all in-memory scheduled jobs on service init.');

        await scheduleRotationsOnStartup(
            db,
            () => this.startNextCompetitionCycle(),
            constants,
            this.scheduledJobs
        );
    }

    async startNextCompetitionCycle() {
        try {
            const now = new Date().toISOString();
            const competitionTypes = ['SOTW', 'BOTW'];
            let overallNearestEndTime = null;
            let pauseForRotationUpdate = false;
            let cycleUpdated = false;

            for (const type of competitionTypes) {
                await removeInvalidCompetitions(db);
                await this.processEndedCompetitions(type);
                const nearestEndDate = await this.checkOngoingCompetitions(type, now);
                if (nearestEndDate) {
                    overallNearestEndTime = this.updateNearestEndTime(
                        overallNearestEndTime,
                        nearestEndDate
                    );
                    continue;
                }
                const lastCompetition = await db.getOne(
                    'SELECT * FROM competitions WHERE type = ? ORDER BY ends_at DESC LIMIT 1',
                    [type]
                );
                let votesExist = false;
                if (lastCompetition) {
                    votesExist = await this.checkIfVotesExist(
                        lastCompetition.competition_id
                    );
                }
                if (votesExist) {
                    logger.info(
                        `ℹ️ **Info:** Processing votes for last \`${type}\` competition.`
                    );
                    await this.processLastCompetition(type, lastCompetition);
                    pauseForRotationUpdate = true;
                }
                pauseForRotationUpdate = await this.createNewCompetitions(
                    type,
                    lastCompetition,
                    votesExist,
                    pauseForRotationUpdate
                );
                if (pauseForRotationUpdate) cycleUpdated = true;

                overallNearestEndTime = await this.getNearestFutureCompetition(
                    type,
                    overallNearestEndTime
                );
            }

            await this.finalizeRotation(
                overallNearestEndTime,
                pauseForRotationUpdate
            );

            if (cycleUpdated) {
                const ongoingEvents = await db.getAll(`
                SELECT event_id
                FROM bingo_state
                WHERE state = 'ongoing'
              `);
                for (const { event_id } of ongoingEvents) {
                    if (!event_id) continue;
                    await refreshBingoInfoEmbed(event_id, this.client);
                }
            }
        } catch (err) {
            logger.error(`❌ Error in startNextCompetitionCycle: ${err.message}`);
        }
    }

    async checkIfVotesExist(competitionId) {
        const votes = await db.getOne(
            'SELECT COUNT(*) AS count FROM votes WHERE competition_id = ?',
            [competitionId]
        );
        return votes && votes.count > 0;
    }

    async getChannelId(type) {
        let channelKey;
        if (type === 'SOTW') {
            channelKey = 'sotw_channel';
        } else if (type === 'BOTW') {
            channelKey = 'botw_channel';
        } else {
            logger.info(`⚠️ Unknown competition type: ${type}.`);
            return;
        }
        const row = await db.guild.getOne(
            'SELECT channel_id FROM ensured_channels WHERE channel_key = ?',
            [channelKey]
        );
        if (!row) {
            logger.info(
                `⚠️ No channel_id is configured in ensured_channels for ${channelKey}.`
            );
            return;
        }
        const channelId = row.channel_id;
        const channel = await this.client.channels.fetch(channelId);
        return channel;
    }

    async createNewCompetitions(
        type,
        lastCompetition,
        votesExist,
        pauseForRotationUpdate
    ) {

        if (this.pendingCreations[type]) {
            logger.info(
                `ℹ️ Creation already pending for ${type}. Skipping duplicate creation.`
            );
            return pauseForRotationUpdate;
        }

        this.pendingCreations[type] = true;
        const channel = await this.getChannelId(type);

        try {
            const queuedCompetitions = await db.getAll(
                'SELECT * FROM competition_queue WHERE type = ? ORDER BY queued_at ASC',
                [type]
            );
            if (!votesExist && queuedCompetitions.length === 0) {
                logger.info(
                    `ℹ️ No votes and no queued competitions for \`${type}\`. Creating a random competition.`
                );
                await purgeChannel(channel);
                await this.createDefaultCompetitions(type);
            } else if (queuedCompetitions.length > 0) {

                for (const comp of queuedCompetitions) {
                    await purgeChannel(channel);
                    await this.createCompetitionFromQueue(comp);
                    logger.info(
                        `✅ **Created:** Competition from queue: \`${comp.competition_id}\` (${type}).`
                    );
                }
                await db.runQuery('DELETE FROM competition_queue WHERE type = ?', [
                    type,
                ]);
            } else {

                return pauseForRotationUpdate;
            }
        } catch (err) {
            logger.error(
                `❌ Error in creating new competition for ${type}: ${err.message}`
            );
        } finally {

            this.pendingCreations[type] = false;
        }
        return true;
    }

    async checkOngoingCompetitions(type, now) {
        const existingCompetitions = await db.getAll(
            'SELECT * FROM competitions WHERE type = ? AND ends_at > ?',
            [type, now]
        );
        if (existingCompetitions.length > 0) {
            logger.info(
                `ℹ️ **Info:** Skipping new \`${type}\` competition creation as active competitions exist.`
            );
            return new Date(existingCompetitions[0].ends_at);
        }
        return null;
    }

    async processEndedCompetitions(type) {
        const now = new Date().toISOString();
        const endedCompetitions = await db.getAll(
            `
        SELECT * FROM competitions 
        WHERE ends_at <= ? AND type = ? AND final_leaderboard_sent = 0
    `,
            [now, type]
        );
        for (const competition of endedCompetitions) {
            await recordCompetitionWinner(competition);
            await updateFinalLeaderboard(competition, this.client);
            await updateAllTimeLeaderboard(this.client);
            await db.runQuery(
                'UPDATE competitions SET final_leaderboard_sent = 1 WHERE competition_id = ?',
                [competition.competition_id]
            );
            logger.info(
                `📢 **Final Leaderboard:** Sent for competition ID \`${competition.competition_id}\`.`
            );
        }
    }

    async processLastCompetition(type, lastCompetition) {
        const channel = await this.getChannelId(type);
        await purgeChannel(channel);
        await this.createCompetitionFromVote(lastCompetition);
    }

    async getNearestFutureCompetition(type, overallNearestEndTime) {
        const newActiveCompetitions = await db.getAll(
            'SELECT * FROM competitions WHERE type = ? AND ends_at > ? ORDER BY ends_at ASC',
            [type, new Date().toISOString()]
        );
        if (newActiveCompetitions.length > 0) {
            return this.updateNearestEndTime(
                overallNearestEndTime,
                new Date(newActiveCompetitions[0].ends_at)
            );
        }
        return overallNearestEndTime;
    }

    updateNearestEndTime(currentNearest, newEndDate) {
        return !currentNearest || newEndDate < currentNearest
            ? newEndDate
            : currentNearest;
    }

    async finalizeRotation(overallNearestEndTime, pauseForRotationUpdate) {
        logger.info('✅ **Success:** Next competition cycle setup completed.');

        if (pauseForRotationUpdate) {
            await sleep(15000);
        }
        await this.updateCompetitionData();
        if (overallNearestEndTime) {
            for (const key of this.scheduledJobs.keys()) {
                if (key.startsWith('rotation-')) {
                    this.scheduledJobs.get(key).cancel();
                    this.scheduledJobs.delete(key);
                    logger.info(`🧹 Cleared previous rotation job: ${key}`);
                }
            }

            const rotationTime = new Date(overallNearestEndTime);
            const comps = await db.getAll(
    'SELECT competition_id, ends_at FROM competitions WHERE ends_at >= ? ORDER BY ends_at ASC',
    [new Date().toISOString()]
);

            if (!comps) {
                logger.warn(`⚠️ No competition found ending at ${rotationTime.toISOString()}. Rotation not scheduled.`);
                return;
            }
            for (const comp of comps) {
            const jobKey = `rotation-${comp.competition_id}`;
            const endTime = new Date(comp.ends_at);

            scheduleRotation(
                endTime,
                () => this.startNextCompetitionCycle(),
                this.scheduledJobs,
                jobKey
            );

            const readableTime = `<t:${Math.floor(endTime.getTime() / 1000)}:f>`;
            logger.info(`📆 Scheduled new rotation for ${jobKey} at ${readableTime}.`);
            logger.info(`🗂️ Total scheduled jobs after rotation finalize: ${this.scheduledJobs.size}`);

        }


            await migrateEndedCompetitions();
        } else {
            logger.info(
                'ℹ️ **Info:** No active or scheduled competitions found. Rotation not scheduled.'
            );
        }
    }

    async updateCompetitionData() {
        try {
            await updateActiveCompetitionEmbed('SOTW', db, this.client, constants);
            await updateActiveCompetitionEmbed('BOTW', db, this.client, constants);
        } catch (err) {
            logger.error(`❌ Error in updateCompetitionData: ${err.message}`);
        }
    }

    async createDefaultCompetitions(type) {
        try {
            const randomSkill = await this.getRandomMetric('Skill');
            const randomBoss = await this.getRandomMetric('Boss');
            const now = new Date();
            const startsAt = new Date(now.getTime() + 10000);
            const rotationWeeksResult = await db.getOne(
                'SELECT value FROM config WHERE key = ?',
                ['rotation_period_weeks']
            );
            const rotationWeeks = rotationWeeksResult
                ? parseInt(rotationWeeksResult.value, 10)
                : 1;
            const endsAt = calculateEndDate(rotationWeeks);
            if (type === 'SOTW') {
                logger.info(
                    `🎲 Creating SOTW competition for metric \`${randomSkill}\`.`
                );
                await createCompetition(
                    womclient,
                    db,
                    'SOTW',
                    randomSkill,
                    startsAt,
                    endsAt,
                    constants
                );
            } else if (type === 'BOTW') {
                logger.info(
                    `🎲 Creating BOTW competition for metric \`${randomBoss}\`.`
                );
                await createCompetition(
                    womclient,
                    db,
                    'BOTW',
                    randomBoss,
                    startsAt,
                    endsAt,
                    constants
                );
            }
        } catch (err) {
            logger.error(`❌ Error createDefaultCompetitions: ${err.message}`);
        }
    }

    async createCompetitionFromQueue(competition) {
        try {
            const { type, metric } = competition;
            const now = new Date();
            const startsAt = new Date(now.getTime() + 10000);
            const rotationWeeksResult = await db.getOne(
                'SELECT value FROM config WHERE key = ?',
                ['rotation_period_weeks']
            );
            const rotationWeeks = rotationWeeksResult
                ? parseInt(rotationWeeksResult.value, 10)
                : 1;
            const endsAt = calculateEndDate(rotationWeeks);
            await createCompetition(
                womclient,
                db,
                type,
                metric,
                startsAt,
                endsAt,
                constants
            );
        } catch (err) {
            logger.error(`❌ Error createCompetitionFromQueue: ${err.message}`);
        }
    }

    async scheduleRotationsOnStartup() {
        try {
            await scheduleRotationsOnStartup(
                db,
                () => this.startNextCompetitionCycle(),
                constants,
                this.scheduledJobs,
                womclient
            );
        } catch (err) {
            logger.error(`❌ Error scheduling rotations on startup: ${err.message}`);
        }
    }

    async createCompetitionFromVote(competition) {
        const now = new Date();
        if (new Date(competition.ends_at) > now) {
            logger.warn(
                `🚫 **Warning:** Competition ID \`${competition.competition_id}\` has not ended yet. Skipping vote processing.`
            );
            return;
        }
        logger.info(
            `🔍 Checking vote results for \`${competition.type}\` competition ID \`${competition.competition_id}\`...`
        );
        let winningMetric = await tallyVotesAndRecordWinner(competition);
        if (!winningMetric) {
            logger.info(
                `ℹ️ No votes recorded for competition ID \`${competition.competition_id}\`. Checking queued competitions.`
            );
            const queuedCompetition = await db.getOne(
                'SELECT * FROM competition_queue WHERE type = ? ORDER BY queued_at ASC LIMIT 1',
                [competition.type]
            );
            if (queuedCompetition) {
                logger.info(
                    `✅ Using queued \`${competition.type}\` competition: \`${queuedCompetition.metric}\`.`
                );
                await db.runQuery('DELETE FROM competition_queue WHERE idx = ?', [
                    queuedCompetition.idx,
                ]);
                winningMetric = queuedCompetition.metric;
            } else {
                logger.info(
                    `ℹ️ No queued competitions found for \`${competition.type}\`. Creating a default competition.`
                );
                winningMetric = await this.getRandomMetric(competition.type);
            }
        }
        const newType =
      competition.type && competition.type.toUpperCase() === 'SOTW'
          ? 'SOTW'
          : 'BOTW';
        const startsAt = new Date(now.getTime() + 10000);
        const rotationWeeksResult = await db.getOne(
            'SELECT value FROM config WHERE key = ?',
            ['rotation_period_weeks']
        );
        const rotationWeeks =
      rotationWeeksResult && !isNaN(parseInt(rotationWeeksResult.value, 10))
          ? parseInt(rotationWeeksResult.value, 10)
          : 1;
        const endsAt = calculateEndDate(rotationWeeks);
        await createCompetition(
            womclient,
            db,
            newType,
            winningMetric,
            startsAt,
            endsAt,
            constants
        );
        logger.info(
            `🏆 New \`${newType}\` competition created successfully with metric \`${winningMetric}\`.`
        );
    }

    async getRandomMetric(type) {
        try {
            const lastComp = await db.getOne(
                'SELECT metric FROM competitions WHERE type = ? ORDER BY ends_at DESC LIMIT 1',
                [type === 'Skill' ? 'SOTW' : 'BOTW']
            );
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
            const chosen = results[Math.floor(Math.random() * results.length)].name;
            logger.info(`🎲 Selected random ${type} metric: \`${chosen}\`.`);
            return chosen;
        } catch (err) {
            logger.error(`⚠️ getRandomMetric error: ${err.message}`);
            throw err;
        }
    }

    async handleVote(interaction) {
        const discordId = interaction.user.id;
        const selectedOption = interaction.values[0];
        let competitionType = '';
        const sotwChannel = await this.getChannelId('SOTW');
        const botwChannel = await this.getChannelId('BOTW');
        if (sotwChannel && interaction.channelId === sotwChannel.id) {
            competitionType = 'SOTW';
        } else if (botwChannel && interaction.channelId === botwChannel.id) {
            competitionType = 'BOTW';
        }
        try {
            const validRegistration = await db.getOne(
                `
                    SELECT r.*, cm.player_id AS clan_player_id
                    FROM registered_rsn AS r
                    INNER JOIN clan_members AS cm 
                    ON r.player_id = cm.player_id
                    AND LOWER(r.rsn) = LOWER(cm.rsn)
                    WHERE r.discord_id = ?
                `,
                [discordId]
            );
            if (!validRegistration) {
                return interaction.reply({
                    content:
            '🚫 **Error:** You must be a registered clan member to vote.',
                    flags: 64,
                });
            }
            const currentTime = new Date().toISOString();
            const competition = await db.getOne(
                `
    SELECT *
    FROM competitions
    WHERE type = ?
      AND starts_at <= ?
      AND ends_at >= ?
    `,
                [competitionType, currentTime, currentTime]
            );
            if (!competition) {
                return interaction.reply({
                    content:
            '🚫 **Error:** No active competition found. Please try again later.',
                    flags: 64,
                });
            }
            const existingVote = await db.getOne(
                `
        SELECT *
        FROM votes
        WHERE discord_id=? AND competition_id=?
      `,
                [discordId, competition.competition_id]
            );
            if (existingVote) {
                return interaction.reply({
                    content: '🚫 **Notice:** You have already voted in this competition.',
                    flags: 64,
                });
            }
            await db.runQuery(
                `
        INSERT INTO votes (discord_id, competition_id, vote_choice)
        VALUES (?, ?, ?)
      `,
                [discordId, competition.competition_id, selectedOption]
            );
            await interaction.reply({
                content: `✅ **Success!** Your vote for **\`${selectedOption
                    .toLowerCase()
                    .split('_')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}\`** has been recorded. Thank you!`,
                flags: 64,
            });
            if (competition.message_id) {
                const channel = await this.getChannelId(competitionType);
                if (channel) {
                    try {
                        const message = await channel.messages.fetch(
                            competition.message_id
                        );
                        if (message) {
                            const dropdown = await buildPollDropdown(competitionType, db);
                            await message.edit({ components: [dropdown] });
                            logger.info(
                                `✅ Updated poll dropdown for \`${competitionType}\` after a vote.`
                            );
                        }
                    } catch (err) {
                        logger.error(
                            `❌ Error updating dropdown after vote: ${err.message}`
                        );
                    }
                }
            }
        } catch (err) {
            logger.error(
                `❌ Error handleVote for user \`${discordId}\`: ${err.message}`
            );
            return interaction.reply({
                content:
          '❌ **Error:** There was an error processing your vote. Please try again later.',
                flags: 64,
            });
        }
    }
}
module.exports = CompetitionService;
