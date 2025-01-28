/* eslint-disable no-unused-vars */
// @ts-nocheck
// src/migrations/populateSkillsBosses.js

const db = require('../modules/utils/dbUtils');
const logger = require('../modules/utils/logger');
const { MetricProps } = require('@wise-old-man/utils');

/**
 * Determines the type of a MetricProp based on its properties.
 * @param {object} prop - The property object from MetricProps.
 * @returns {string|null} - Returns 'Skill' or 'Boss' if identified, otherwise null.
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
 * Populates the skills_bosses table with data from MetricProps,
 * excluding ActivityProperties and ComputedMetricProperties.
 */
const populateSkillsBosses = async () => {
    try {
        // Start a transaction to ensure atomicity and improve performance
        await db.runQuery('BEGIN TRANSACTION;');

        // Fetch existing entries to prevent duplicates
        const existing = await db.getAll('SELECT name, type FROM skills_bosses');
        const existingSet = new Set(existing.map((entry) => `${entry.name}:${entry.type}`));

        let insertedCount = 0;
        let excludedCount = 0;

        // Iterate over MetricProps to extract skills and bosses
        for (const [key, value] of Object.entries(MetricProps)) {
            const type = determinePropType(value);

            if (!type) {
                // Skip ActivityProperties and ComputedMetricProperties
                logger.info(`Excluded Property (${key}): Not a Skill or Boss`);
                excludedCount += 1;
                continue;
            }

            if (!existingSet.has(`${key}:${type}`)) {
                // Prepare the INSERT statement
                const insertQuery = 'INSERT INTO skills_bosses (name, type) VALUES (?, ?);';
                const params = [key, type];

                // Execute the INSERT statement
                await db.runQuery(insertQuery, params);

                logger.info(`Inserted ${type}: ${key}`);
                insertedCount += 1;

                // Optionally, add to existingSet to prevent duplicate inserts within the same run
                existingSet.add(`${key}:${type}`);
            }
        }

        // Commit the transaction after all inserts
        await db.runQuery('COMMIT;');

        logger.info(`Migration completed successfully. Inserted: ${insertedCount}, Excluded: ${excludedCount}`);
    } catch (error) {
        // Rollback the transaction in case of any errors
        await db.runQuery('ROLLBACK;');
        logger.error(`Error populating skills_bosses table: ${error.message}`);
    }
};

module.exports = populateSkillsBosses;
