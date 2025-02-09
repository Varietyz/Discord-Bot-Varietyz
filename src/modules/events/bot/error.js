// src/modules/events/bot/error.js

const logger = require('../../utils/logger');
const { EmbedBuilder, WebhookClient } = require('discord.js');
const {
    guild: { getOne, getAll, runQuery },
} = require('../../utils/dbUtils');

module.exports = {
    name: 'error',
    once: false,
    /**
     * Handles errors emitted by the client.
     *
     * @param {Error} error - The error object.
     * @param client - The Discord client instance.
     */
    async execute(error, client) {
        logger.error(`❌ Bot Error: ${error.message}`);

        const ERROR_TRACK_TIME = 1800; // 30 minutes
        const ERROR_ALERT_THRESHOLD = 5; // Trigger webhook if error occurs 5+ times

        // Fetch webhook URL and management role ID from the database.
        const webhookData = await getOne('SELECT webhook_url FROM guild_webhooks WHERE webhook_name = ?', ['webhook_critical_state']);
        if (!webhookData || !webhookData.webhook_url) {
            logger.warn('⚠️ No webhook URL found for critical errors, please create a webhook integration in your staff channel & name it **```Critical State```**.\nOnce you have do that, critical alerts will be sent to the channel of choice.');
            return;
        }
        const webhookURL = webhookData.webhook_url;

        const roleData = await getOne('SELECT role_id FROM guild_roles WHERE role_key = ?', ['role_owner']);
        if (!roleData || !roleData.role_id) {
            logger.warn('⚠️ No management role ID found in database.');
            return;
        }
        const managementRoleID = roleData.role_id;

        // Ensure error_logs table exists.
        await runQuery(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        error_message TEXT NOT NULL,
        error_stack TEXT,
        occurrences INTEGER DEFAULT 1,
        last_occurred TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reported INTEGER DEFAULT 0
      )
    `);

        // Check if this error occurred recently.
        const existingError = await getOne(`SELECT * FROM error_logs WHERE error_message = ? AND last_occurred > DATETIME('now', '-${ERROR_TRACK_TIME} seconds')`, [error.message]);

        if (existingError) {
            // Update the error record.
            await runQuery('UPDATE error_logs SET occurrences = occurrences + 1, last_occurred = CURRENT_TIMESTAMP WHERE id = ?', [existingError.id]);
        } else {
            // Insert a new error record.
            await runQuery('INSERT INTO error_logs (error_message, error_stack) VALUES (?, ?)', [error.message, error.stack || null]);
        }

        // Fetch unreported database errors.
        const dbErrors = await getAll('SELECT * FROM error_logs WHERE reported = 0');

        // Fetch the log channel data from the database.
        const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['bot_logs']);
        if (!logChannelData) {
            logger.warn('⚠️ No log channel found in database. Ensure the "bot_logs" entry exists.');
            return;
        }

        // Attempt to fetch the Discord channel.
        const logChannel = await client.channels.fetch(logChannelData.channel_id).catch((err) => {
            logger.warn(`⚠️ Could not fetch log channel: ${err.message}`);
            return null;
        });
        if (!logChannel) {
            logger.warn(`⚠️ Log channel ID ${logChannelData.channel_id} is invalid or missing permissions.`);
            return;
        }

        // Create an embed for the error.
        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('❌ Bot Error Detected')
            .setDescription(`\`\`\`${error.stack || error.message}\`\`\``)
            .addFields({ name: 'Occurrences', value: existingError ? `${existingError.occurrences + 1}` : '1', inline: true }, { name: 'Last Occurred', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true })
            .setTimestamp();

        // Mention management if the error is severe.
        const managementMention = existingError && existingError.occurrences >= 3 ? `<@&${managementRoleID}>` : '';

        await logChannel.send({ content: managementMention, embeds: [embed] });
        logger.info(`📋 Logged error in bot_logs. Occurrences: ${existingError ? existingError.occurrences + 1 : 1}`);

        // Report all unreported database errors.
        for (const dbError of dbErrors) {
            const dbEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('📂 Database Error Logged')
                .setDescription(`\`\`\`${dbError.error_message}\`\`\``)
                .addFields(
                    {
                        name: 'Stack Trace',
                        value: dbError.error_stack ? `\`\`\`${dbError.error_stack}\`\`\`` : '`No stack trace available`',
                        inline: false,
                    },
                    { name: 'Occurrences', value: `${dbError.occurrences}`, inline: true },
                    {
                        name: 'Last Occurred',
                        value: `<t:${Math.floor(new Date(dbError.last_occurred).getTime() / 1000)}:R>`,
                        inline: true,
                    },
                )
                .setTimestamp();

            await logChannel.send({ embeds: [dbEmbed] });
            // Mark the error as reported.
            await runQuery('UPDATE error_logs SET reported = 1 WHERE id = ?', [dbError.id]);
        }

        // If the error is urgent, send a webhook alert.
        if (existingError && existingError.occurrences >= ERROR_ALERT_THRESHOLD) {
            const webhookClient = new WebhookClient({ url: webhookURL });
            const webhookEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🚨 URGENT BOT ERROR')
                .setDescription(`**Error Message:**\n\`\`\`${error.message}\`\`\``)
                .addFields({ name: 'Occurrences', value: `${existingError.occurrences + 1}`, inline: true }, { name: 'Last Occurred', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true })
                .setFooter({ text: 'Immediate attention required!' })
                .setTimestamp();

            await webhookClient
                .send({
                    content: `<@&${managementRoleID}> ⚠️ Urgent bot failure detected!`,
                    embeds: [webhookEmbed],
                })
                .catch((err) => logger.warn(`⚠️ Failed to send webhook alert: ${err.message}`));

            logger.warn('🚨 Sent webhook alert for urgent error.');
        }
    },
};
