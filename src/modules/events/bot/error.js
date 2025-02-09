const logger = require('../../utils/logger');
const { EmbedBuilder, WebhookClient } = require('discord.js');
const { getOne, runQuery } = require('../../utils/dbUtils');

module.exports = {
    name: 'error',
    once: false,
    async execute(error, client) {
        logger.error(`❌ Bot Error: ${error.message}`);

        const MANAGEMENT_ROLE_ID = 'YOUR_MANAGEMENT_ROLE_ID'; // Replace with actual role ID
        const ERROR_TRACK_TIME = 1800; // 30 minutes to prevent spam
        const ERROR_ALERT_THRESHOLD = 5; // Trigger webhook if error occurs 5+ times
        const WEBHOOK_URL = 'YOUR_DISCORD_WEBHOOK_URL'; // Replace with your webhook URL

        // ✅ Ensure error table exists
        await runQuery(`
            CREATE TABLE IF NOT EXISTS error_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                error_message TEXT NOT NULL,
                error_stack TEXT,
                occurrences INTEGER DEFAULT 1,
                last_occurred TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ✅ Check if this error occurred recently
        const existingError = await getOne(`SELECT * FROM error_logs WHERE error_message = ? AND last_occurred > DATETIME('now', '-${ERROR_TRACK_TIME} seconds')`, [error.message]);

        if (existingError) {
            // ✅ Update existing record
            await runQuery('UPDATE error_logs SET occurrences = occurrences + 1, last_occurred = CURRENT_TIMESTAMP WHERE id = ?', [existingError.id]);
        } else {
            // ✅ Insert new error into DB
            await runQuery('INSERT INTO error_logs (error_message, error_stack) VALUES (?, ?)', [error.message, error.stack || null]);
        }

        // ✅ Fetch log channel
        const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['bot_logs']);
        if (!logChannelData) return;

        const logChannel = await client.channels.fetch(logChannelData.channel_id).catch((err) => {
            logger.warn(`⚠️ Could not fetch log channel: ${err.message}`);
            return null;
        });

        if (!logChannel) return;

        // ✅ Create Error Embed
        const embed = new EmbedBuilder()
            .setColor(0xe74c3c) // Red for errors
            .setTitle('❌ Bot Error')
            .setDescription(`\`\`\`${error.stack || error.message}\`\`\``)
            .addFields({ name: 'Occurrences', value: existingError ? `${existingError.occurrences + 1}` : '1', inline: true }, { name: 'Last Occurred', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true })
            .setTimestamp();

        // ✅ Mention Management if the error is critical
        const managementMention = existingError && existingError.occurrences >= 3 ? `<@&${MANAGEMENT_ROLE_ID}>` : '';

        await logChannel.send({ content: managementMention, embeds: [embed] });

        logger.info(`📋 Logged error in bot_logs. Occurrences: ${existingError ? existingError.occurrences + 1 : 1}`);

        // ✅ Send Webhook Alert for Urgent Errors
        if (existingError && existingError.occurrences >= ERROR_ALERT_THRESHOLD) {
            const webhookClient = new WebhookClient({ url: WEBHOOK_URL });

            const webhookEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🚨 URGENT BOT ERROR')
                .setDescription(`**Error Message:**\n\`\`\`${error.message}\`\`\``)
                .addFields({ name: 'Occurrences', value: `${existingError.occurrences + 1}`, inline: true }, { name: 'Last Occurred', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true })
                .setFooter({ text: 'Immediate attention required!' })
                .setTimestamp();

            await webhookClient.send({ content: `<@&${MANAGEMENT_ROLE_ID}> ⚠️ Urgent bot failure detected!`, embeds: [webhookEmbed] }).catch((err) => logger.warn(`⚠️ Failed to send webhook alert: ${err.message}`));

            logger.warn('🚨 Sent webhook alert for urgent error.');
        }
    },
};
