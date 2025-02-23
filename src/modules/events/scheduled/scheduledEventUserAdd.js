const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
module.exports = {
    name: 'guildScheduledEventUserAdd',
    once: false,
    async execute(event, user) {
        if (!event.guild) return;
        try {
            logger.info(`✅ [ScheduledEventUserAdd] ${user.tag} joined scheduled event "${event.name}".`);
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['event_logs']);
            if (!logChannelData) return;
            const logChannel = await event.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('📅 Event RSVP Added')
                .addFields(
                    { name: '📌 Event Name', value: `\`${event.name}\``, inline: false },
                    { name: '👤 User', value: `<@${user.id}> (${user.tag})`, inline: true },
                    { name: '🕒 Event Time', value: `<t:${Math.floor(event.scheduledStartTimestamp / 1000)}:F>`, inline: true },
                )
                .setFooter({ text: `Event ID: ${event.id} | User ID: ${user.id}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged RSVP for ${user.tag} to event "${event.name}".`);
        } catch (error) {
            logger.error(`❌ Error logging event RSVP: ${error.message}`);
        }
    },
};