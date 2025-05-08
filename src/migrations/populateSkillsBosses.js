const { EmbedBuilder } = require('discord.js');
const db = require('../modules/utils/essentials/dbUtils');
const logger = require('../modules/utils/essentials/logger');
const { MetricProps } = require('@wise-old-man/utils');
const determinePropType = (prop) => {
    if (Object.prototype.hasOwnProperty.call(prop, 'isCombat')) {
        return 'Skill';
    } else if (Object.prototype.hasOwnProperty.call(prop, 'minimumValue') && Object.prototype.hasOwnProperty.call(prop, 'isMembers')) {
        return 'Boss';
    }
    return null;
};
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
                const logChannelData = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['database_logs']);
                if (!logChannelData) {
                    logger.warn('⚠️ No log channel found for "database_logs" in the logging database.');
                } else {
                    const logChannel = await client.channels.fetch(logChannelData.channel_id).catch(() => null);
                    if (!logChannel) {
                        logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                    } else {
                        const embed = new EmbedBuilder()
                            .setColor(0xffa500)
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
