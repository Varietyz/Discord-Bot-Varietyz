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

const db = require('../modules/utils/dbUtils');
const logger = require('../modules/utils/logger');
const { MetricProps } = require('@wise-old-man/utils');

/**
 * Determines the type of a MetricProp based on its properties.
 *
 * Checks if the given property object has the characteristic keys that identify it as a Skill or a Boss.
 *
 * @function determinePropType
 * @param {Object} prop - The property object from MetricProps.
 * @returns {string|null} Returns `'Skill'` if the property has an `isCombat` key, `'Boss'` if it has both `minimumValue` and `isMembers` keys, otherwise returns `null`.
 *
 * @example
 * const propType = determinePropType(MetricProps.Attack);
 * // propType might be 'Skill'
 */
const determinePropType = (prop) => {
    // Use Object.prototype.hasOwnProperty.call to safely check properties
    if (Object.prototype.hasOwnProperty.call(prop, 'isCombat')) {
        return 'Skill';
    } else if (Object.prototype.hasOwnProperty.call(prop, 'minimumValue') && Object.prototype.hasOwnProperty.call(prop, 'isMembers')) {
        return 'Boss';
    }
    return null; // Exclude if not Skill or Boss
};

/**
 * Populates the `skills_bosses` table with data from MetricProps.
 *
 * Iterates over all properties in the MetricProps object to extract Skills and Bosses.
 * It skips ActivityProperties and ComputedMetricProperties, and inserts new entries
 * into the database if they do not already exist. The insertion is performed within a transaction
 * to ensure atomicity.
 *
 * @async
 * @function populateSkillsBosses
 * @returns {Promise<void>} Resolves when the migration completes successfully.
 *
 * @example
 * // Run this migration script to update the skills_bosses table:
 * await populateSkillsBosses();
 */
const populateSkillsBosses = async () => {
    try {
        // Start a transaction to ensure atomicity and improve performance.
        await db.runQuery('BEGIN TRANSACTION;');

        // Fetch existing entries to prevent duplicates.
        const existing = await db.getAll('SELECT name, type FROM skills_bosses');
        const existingSet = new Set(existing.map((entry) => `${entry.name}:${entry.type}`));

        let insertedCount = 0;
        let excludedCount = 0;

        // Iterate over MetricProps to extract skills and bosses.
        for (const [key, value] of Object.entries(MetricProps)) {
            const type = determinePropType(value);

            if (!type) {
                // Skip properties that are not Skills or Bosses.
                logger.info(`Excluded Property (${key}): Not a Skill or Boss`);
                excludedCount += 1;
                continue;
            }

            if (!existingSet.has(`${key}:${type}`)) {
                // Prepare the INSERT statement.
                const insertQuery = 'INSERT INTO skills_bosses (name, type) VALUES (?, ?);';
                const params = [key, type];

                // Execute the INSERT statement.
                await db.runQuery(insertQuery, params);

                logger.info(`Inserted ${type}: ${key}`);
                insertedCount += 1;

                // Add to existingSet to prevent duplicate inserts within the same run.
                existingSet.add(`${key}:${type}`);
            }
        }

        // Commit the transaction after all inserts.
        await db.runQuery('COMMIT;');

        logger.info(`Migration completed successfully. Inserted: ${insertedCount}, Excluded: ${excludedCount}`);
    } catch (error) {
        // Rollback the transaction in case of any errors.
        await db.runQuery('ROLLBACK;');
        logger.error(`Error populating skills_bosses table: ${error.message}`);
    }
};

module.exports = populateSkillsBosses;
