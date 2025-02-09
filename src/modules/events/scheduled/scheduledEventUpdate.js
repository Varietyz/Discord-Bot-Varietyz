const { EmbedBuilder } = require('discord.js');
const { getOne, runQuery } = require('../../utils/dbUtils');
const logger = require('../../utils/logger');

module.exports = {
    name: 'guildScheduledEventUpdate',
    once: false,

    /**
     * Triggered when a scheduled event is updated.
     * @param oldEvent - The event before the update.
     * @param newEvent - The event after the update.
     */
    async execute(oldEvent, newEvent) {
        if (!newEvent.guild) return;

        try {
            logger.info(`✏️ [ScheduledEventUpdate] Scheduled event "${oldEvent.name}" was updated.`);

            const changes = [];
            if (oldEvent.name !== newEvent.name) changes.push(`📛 **Name:** \`${oldEvent.name}\` → **\`${newEvent.name}\`**`);
            if (oldEvent.description !== newEvent.description) changes.push('📜 **Description Changed**');
            if (oldEvent.scheduledStartTimestamp !== newEvent.scheduledStartTimestamp) {
                changes.push(`🕒 **Start Time Changed:** <t:${Math.floor(newEvent.scheduledStartTimestamp / 1000)}:F>`);
            }

            if (changes.length === 0) return; // No relevant changes

            // 📌 **Update event in the database**
            await runQuery('UPDATE guild_events SET name = ?, description = ?, start_time = ? WHERE event_id = ?', [newEvent.name, newEvent.description || 'No description', newEvent.scheduledStartTimestamp, newEvent.id]);

            // 🔍 **Fetch log channel from database**
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['event_logs']);
            if (!logChannelData) return;

            const logChannel = await newEvent.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 📌 **Build Embed**
            const embed = new EmbedBuilder()
                .setColor(0xe67e22) // Orange for updates
                .setTitle('✏️ Scheduled Event Updated')
                .addFields({ name: '📌 Event Name', value: `\`${oldEvent.name}\` → **\`${newEvent.name}\`**`, inline: false }, { name: '🔄 Changes', value: changes.join('\n'), inline: false })
                .setFooter({ text: `Event ID: ${newEvent.id}` })
                .setTimestamp();

            // 📤 **Send log message**
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged scheduled event update: "${newEvent.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging scheduled event update: ${error.message}`);
        }
    },
};
