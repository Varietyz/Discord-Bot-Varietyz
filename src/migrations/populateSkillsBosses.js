/* eslint-disable no-unused-vars */
// @ts-nocheck
/**
 * @fileoverview
 * **Populate Skills & Bosses Migration** ⚙️
 *
 * This script populates the `skills_bosses` table in the database using data from
 * the `MetricProps` object provided by the `@wise-old-man/utils` package.
 * It extracts only Skill and Boss properties (excluding ActivityProperties and ComputedMetricProperties)
 * and inserts them into the table if they do not already exist.
 *
 * ---
 *
 * **Core Features:**
 * - Determines whether a MetricProp is a Skill or a Boss.
 * - Inserts new entries into the `skills_bosses` table within a transaction for atomicity.
 * - Prevents duplicate entries by checking existing records.
 *
 * **External Dependencies:**
 * - **SQLite**: For executing SQL queries.
 * - **Logger**: For logging migration progress and errors.
 * - **@wise-old-man/utils**: Provides the `MetricProps` object.
 *
 * @module src/migrations/populateSkillsBosses
 */

const { EmbedBuilder } = require('discord.js');
const db = require('../modules/utils/essentials/dbUtils');
const logger = require('../modules/utils/essentials/logger');
const { MetricProps } = require('@wise-old-man/utils');

/**
 * 🎯 **Determines the Property Type**
 *
 * Checks if the given property object from MetricProps is a Skill or a Boss.
 * - Returns `'Skill'` if the property contains an `isCombat` key.
 * - Returns `'Boss'` if the property has both `minimumValue` and `isMembers` keys.
 * - Otherwise, returns `null`.
 *
 * @function determinePropType
 * @param {Object} prop - The property object from MetricProps.
 * @returns {string|null} The determined type: `'Skill'`, `'Boss'`, or `null`.
 *
 * @example
 * const propType = determinePropType(MetricProps.Attack);
 * // propType might be 'Skill'
 */
const determinePropType = (prop) => {
    if (Object.prototype.hasOwnProperty.call(prop, 'isCombat')) {
        return 'Skill';
    } else if (Object.prototype.hasOwnProperty.call(prop, 'minimumValue') && Object.prototype.hasOwnProperty.call(prop, 'isMembers')) {
        return 'Boss';
    }
    return null;
};

/**
 * 🎯 **Populates the `skills_bosses` Table**
 *
 * Iterates over all properties in the MetricProps object to extract Skills and Bosses.
 * It skips properties that are not Skills or Bosses (e.g., ActivityProperties and ComputedMetricProperties)
 * and inserts new entries into the database if they do not already exist.
 * The insertion is performed within a transaction to ensure atomicity.
 *
 * @param client
 * @async
 * @function populateSkillsBosses
 * @returns {Promise<void>} Resolves when the migration completes successfully.
 *
 * @example
 * // Run this migration script to update the skills_bosses table:
 * await populateSkillsBosses();
 */
const populateSkillsBosses = async (client) => {
    try {
        await db.runQuery('BEGIN TRANSACTION;');

        const existing = await db.getAll('SELECT name, type FROM skills_bosses');
        const existingSet = new Set(existing.map((entry) => `${entry.name}:${entry.type}`));

        let insertedCount = 0;
        let excludedCount = 0;
        const insertedActivities = [];

        for (const [key, value] of Object.entries(MetricProps)) {
            const type = determinePropType(value);

            if (!type) {
                logger.info(`⚠️ Excluded Property (${key}): Not a Skill or Boss`);
                excludedCount += 1;
                continue;
            }

            if (!existingSet.has(`${key}:${type}`)) {
                const insertQuery = 'INSERT INTO skills_bosses (name, type) VALUES (?, ?);';
                const params = [key, type];

                await db.runQuery(insertQuery, params);

                logger.info(`✅ Inserted ${type}: ${key}`);
                insertedCount += 1;
                existingSet.add(`${key}:${type}`);

                insertedActivities.push(`${key} (${type})`);
            }
        }

        await db.runQuery('COMMIT;');

        logger.info(`🎉 Migration completed successfully. Inserted: ${insertedCount}, Excluded: ${excludedCount}`);
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
                            .setTitle('🔑 Skills & Bosses Database Updated')
                            .setDescription(`Inserted the following Skills & Bosses:\n\`\`\`\n${insertedActivities.join('\n')}\n\`\`\``)
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
        logger.error(`❌ Error populating skills_bosses table: ${error.message}`);
    }
};

module.exports = populateSkillsBosses;
