const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
module.exports = {
    name: 'guildScheduledEventUserRemove',
    once: false,
    async execute(event, user) {
        if (!event.guild) return;
        try {
            logger.info(`❌ [ScheduledEventUserRemove] ${user.tag} removed RSVP from scheduled event "${event.name}".`);
            const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['event_logs']);
            if (!logChannelData) return;
            const logChannel = await event.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('📅 Event RSVP Removed')
                .addFields(
                    { name: '📌 Event Name', value: `\`${event.name}\``, inline: false },
                    { name: '👤 User', value: `<@${user.id}> (${user.tag})`, inline: true },
                    { name: '🕒 Event Time', value: `<t:${Math.floor(event.scheduledStartTimestamp / 1000)}:F>`, inline: true },
                )
                .setFooter({ text: `Event ID: ${event.id} | User ID: ${user.id}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged RSVP removal for ${user.tag} from event "${event.name}".`);
        } catch (error) {
            logger.error(`❌ Error logging event RSVP removal: ${error.message}`);
        }
    },
};
