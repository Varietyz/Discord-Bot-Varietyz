const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne, runQuery },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
module.exports = {
    name: 'guildScheduledEventUpdate',
    once: false,
    async execute(oldEvent, newEvent) {
        if (!newEvent.guild) return;
        try {
            logger.info(`✏️ [ScheduledEventUpdate] Scheduled event "${oldEvent.name}" was updated.`);
            const changes = [];
            if (oldEvent.name !== newEvent.name) changes.push(`📛 **Name:** \`${oldEvent.name}\` → **\`${newEvent.name}\`**`);
            if (oldEvent.description !== newEvent.description) changes.push(`📜 **Description Changed**\n\`\`\`${oldEvent.description}\`\`\`\nto\n\`\`\`${newEvent.description}\`\`\``);
            if (oldEvent.scheduledStartTimestamp !== newEvent.scheduledStartTimestamp) {
                changes.push(`🕒 **Start Time Changed:** <t:${Math.floor(newEvent.scheduledStartTimestamp / 1000)}:F>`);
            }
            if (changes.length === 0) return;
            await runQuery('UPDATE guild_events SET name = ?, description = ?, start_time = ? WHERE event_id = ?', [newEvent.name, newEvent.description || 'No description', newEvent.scheduledStartTimestamp, newEvent.id]);
            const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['event_logs']);
            if (!logChannelData) return;
            const logChannel = await newEvent.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            const embed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle('✏️ Scheduled Event Updated')
                .addFields({ name: '📌 Event Name', value: `\`${oldEvent.name}\` → **\`${newEvent.name}\`**`, inline: false }, { name: '🔄 Changes', value: changes.join('\n'), inline: false })
                .setFooter({ text: `Event ID: ${newEvent.id}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged scheduled event update: "${newEvent.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging scheduled event update: ${error.message}`);
        }
    },
};
