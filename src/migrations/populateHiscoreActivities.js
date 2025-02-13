/* eslint-disable no-unused-vars */
// @ts-nocheck
/**
 * @fileoverview
 * **Populate Hiscore Activities Migration** ⚙️
 *
 * This script populates the `hiscore_activities` table in the database using data from
 * the `MetricProps` object provided by the `@wise-old-man/utils` package.
 * It inserts all properties that are not Skills or Bosses (excluding 'ehp' and 'ehb')
 * as hiscore activities with a fixed type "Activity".
 *
 * @module src/migrations/populateHiscoreActivities
 */

const { EmbedBuilder } = require('discord.js');
const db = require('../modules/utils/essentials/dbUtils');
const logger = require('../modules/utils/essentials/logger');
const { MetricProps } = require('@wise-old-man/utils');

/**
 * Determines the property type.
 * Returns 'Skill' if the property has an "isCombat" key,
 * 'Boss' if it has both "minimumValue" and "isMembers", or null otherwise.
 *
 * @param {Object} prop - A property object from MetricProps.
 * @returns {string|null} 'Skill', 'Boss', or null.
 */
const determinePropType = (prop) => {
    if (Object.prototype.hasOwnProperty.call(prop, 'minimumValue') && !Object.prototype.hasOwnProperty.call(prop, 'isMembers')) {
        return 'Activity';
    }
    return null;
};

const populateHiscoreActivities = async (client) => {
    try {
        await db.runQuery('BEGIN TRANSACTION;');

        const existing = await db.getAll('SELECT name, type FROM hiscores_activities');
        const existingSet = new Set(existing.map((entry) => `${entry.name}:${entry.type}`));

        let insertedCount = 0;
        let excludedCount = 0;
        const insertedActivities = []; // Accumulate inserted activity strings here

        for (const [key, value] of Object.entries(MetricProps)) {
            const type = determinePropType(value);

            if (!type) {
                logger.info(`⚠️ Excluded Property (${key}): Not an Activity`);
                excludedCount += 1;
                continue;
            }

            if (!existingSet.has(`${key}:${type}`)) {
                const insertQuery = 'INSERT INTO hiscores_activities (name, type) VALUES (?, ?);';
                const params = [key, type];

                await db.runQuery(insertQuery, params);

                logger.info(`✅ Inserted ${type}: ${key}`);
                insertedCount += 1;
                existingSet.add(`${key}:${type}`);

                // Add this inserted activity to our summary array.
                insertedActivities.push(`${key}`);
            }
        }

        await db.runQuery('COMMIT;');

        logger.info(`🎉 Migration completed successfully. Inserted: ${insertedCount} activities, Excluded: ${excludedCount} properties.`);

        // Send one message with a summary of all inserted activities.
        if (insertedActivities.length > 0) {
            try {
                // Use the guild database for logging.
                const logChannelData = await db.guild.getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['database_logs']);
                if (!logChannelData) {
                    logger.warn('⚠️ No log channel found for "database_logs" in the logging database.');
                } else {
                    const logChannel = await client.channels.fetch(logChannelData.channel_id).catch(() => null);
                    if (!logChannel) {
                        logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                    } else {
                        // Build one embed that maps all inserted activities.
                        const embed = new EmbedBuilder()
                            .setColor(0xffa500) // Orange for updates
                            .setTitle('🔑 Hiscores Database Updated')
                            .setDescription(`Inserted the following activities:\n\`\`\`\n${insertedActivities.join('\n')}\n\`\`\``)
                            .setFooter({ text: 'Update complete' })
                            .setTimestamp();

                        await logChannel.send({ embeds: [embed] });
                    }
                }
            } catch (logErr) {
                logger.error(`Error logging key update: ${logErr.message}`);
            }
        }
    } catch (error) {
        await db.runQuery('ROLLBACK;');
        logger.error(`❌ Error populating hiscores_activities table: ${error.message}`);
    }
};

module.exports = populateHiscoreActivities;
