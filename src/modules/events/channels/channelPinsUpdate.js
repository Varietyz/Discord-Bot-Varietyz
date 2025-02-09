const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/dbUtils');
const logger = require('../../utils/logger');

module.exports = {
    name: 'channelPinsUpdate',
    once: false,

    /**
     * Triggered when the pinned messages in a channel are updated.
     * @param channel - The channel where pins were updated.
     */
    async execute(channel) {
        if (!channel.guild) return;

        try {
            logger.info(`📌 [ChannelPinsUpdate] Pins updated in channel "${channel.name}" (ID: ${channel.id})`);

            // 🔍 Fetch the correct log channel for pin updates
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['channel_logs']);
            if (!logChannelData) return;

            const logChannel = await channel.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 🕵️ Fetch audit logs to determine who updated the pins
            logger.info('🔎 Checking audit logs for pin changes...');
            await new Promise((resolve) => setTimeout(resolve, 3000)); // ⏳ Wait 3 seconds for logs to update

            const fetchedLogs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.MessagePin,
                limit: 5,
            });

            const pinLog = fetchedLogs.entries.find((entry) => entry.extra.channel.id === channel.id && Date.now() - entry.createdTimestamp < 10000);

            let changedBy = '`Unknown`';
            if (pinLog) {
                changedBy = `<@${pinLog.executor.id}>`; // Mention the user
                logger.info(`📌 Pin change detected by: ${changedBy}`);
            } else {
                logger.warn(`⚠️ No audit log entry found for pin update in "${channel.name}"`);
            }

            // 🚨 **Detect whether a message was pinned or unpinned**
            let actionType = '📌 **Message Pinned**';
            try {
                const pinnedMessages = await channel.messages.fetchPinned().catch(() => null);
                if (pinnedMessages && pinnedMessages.size < 50) {
                    actionType = '📌 **Message Unpinned**'; // If there are fewer than 50 pinned messages, assume one was removed
                }
            } catch (fetchError) {
                logger.warn(`⚠️ Unable to fetch pinned messages: ${fetchError.message}`);
            }

            // 📌 Build the embed for logging
            const embed = new EmbedBuilder()
                .setColor(0xf1c40f) // Yellow for pin updates
                .setTitle(actionType)
                .addFields({ name: '📢 Channel', value: `<#${channel.id}>`, inline: true }, { name: '📁 Category', value: channel.parent?.name || '`Uncategorized`', inline: true }, { name: '🛠 Changed By', value: changedBy, inline: false })
                .setFooter({ text: `Channel ID: ${channel.id}` })
                .setTimestamp();

            // 📤 Send the embed to the log channel
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged pin update in "${channel.name}".`);
        } catch (error) {
            logger.error(`❌ Error logging pin update: ${error.message}`);
        }
    },
};
