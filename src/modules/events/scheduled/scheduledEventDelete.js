const { EmbedBuilder } = require('discord.js');
const { getOne, runQuery } = require('../../utils/dbUtils');
const logger = require('../../utils/logger');

module.exports = {
    name: 'guildScheduledEventDelete',
    once: false,

    /**
     * Triggered when a scheduled event is deleted.
     * @param event - The deleted scheduled event.
     */
    async execute(event) {
        if (!event.guild) return;

        try {
            logger.info(`🗑️ [ScheduledEventDelete] Scheduled event "${event.name}" was deleted.`);

            // 📌 **Delete event from the database**
            await runQuery('DELETE FROM guild_events WHERE event_id = ?', [event.id]);

            // 🔍 **Fetch log channel from database**
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['event_logs']);
            if (!logChannelData) return;

            const logChannel = await event.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 📌 **Build Embed**
            const embed = new EmbedBuilder()
                .setColor(0xff0000) // Red for deletions
                .setTitle('🗑️ Scheduled Event Deleted')
                .addFields({ name: '📌 Event Name', value: `\`${event.name}\``, inline: false }, { name: '📜 Description', value: event.description || '`No description provided`', inline: false })
                .setFooter({ text: `Event ID: ${event.id}` })
                .setTimestamp();

            // 📤 **Send log message**
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged scheduled event deletion: "${event.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging scheduled event deletion: ${error.message}`);
        }
    },
};
