const { EmbedBuilder } = require('discord.js');
const { getOne } = require('../../utils/dbUtils');
const logger = require('../../utils/logger');

module.exports = {
    name: 'guildScheduledEventUserRemove',
    once: false,

    /**
     * Triggered when a user removes their RSVP from a scheduled event.
     * @param event - The scheduled event.
     * @param user - The user who left the event.
     */
    async execute(event, user) {
        if (!event.guild) return;

        try {
            logger.info(`❌ [ScheduledEventUserRemove] ${user.tag} removed RSVP from scheduled event "${event.name}".`);

            // 🔍 Fetch log channel from database
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['event_logs']);
            if (!logChannelData) return;

            const logChannel = await event.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 📌 Build Embed
            const embed = new EmbedBuilder()
                .setColor(0xff0000) // Red for leaving
                .setTitle('📅 Event RSVP Removed')
                .addFields(
                    { name: '📌 Event Name', value: `\`${event.name}\``, inline: false },
                    { name: '👤 User', value: `<@${user.id}> (${user.tag})`, inline: true },
                    { name: '🕒 Event Time', value: `<t:${Math.floor(event.scheduledStartTimestamp / 1000)}:F>`, inline: true },
                )
                .setFooter({ text: `Event ID: ${event.id} | User ID: ${user.id}` })
                .setTimestamp();

            // 📤 Send log message
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged RSVP removal for ${user.tag} from event "${event.name}".`);
        } catch (error) {
            logger.error(`❌ Error logging event RSVP removal: ${error.message}`);
        }
    },
};
