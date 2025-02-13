const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');

module.exports = {
    name: 'channelPinsUpdate',
    once: false,

    /**
     * Triggered when a message is pinned in a channel.
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

            // 🕵️ Fetch pinned messages after change
            const updatedPinnedMessages = await channel.messages.fetchPinned().catch(() => null);

            // Wait for audit logs to update
            logger.info('🔎 Checking audit logs for pin changes...');
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // 🔍 Fetch audit logs for pin actions
            let changedBy = '`Unknown`';
            let pinLog = null;
            try {
                const fetchedLogs = await channel.guild.fetchAuditLogs({
                    type: AuditLogEvent.MessagePin,
                    limit: 5,
                });

                pinLog = fetchedLogs.entries.find(
                    (entry) => entry.extra.channel.id === channel.id && Date.now() - entry.createdTimestamp < 15000, // Extended to 15s
                );

                if (pinLog) {
                    changedBy = `<@${pinLog.executor.id}>`;
                    logger.info(`📌 Pin action detected by: ${changedBy}`);
                } else {
                    logger.warn(`⚠️ No audit log entry found for pin update in "${channel.name}". Assuming self-pin.`);
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for pin update: ${auditError.message}`);
            }

            // 🕵️ Identify the most recently pinned message
            let messageDetails = '`Unknown Message`';
            let authorTag = '`Unknown`';
            let messageUrl = '`No Link Available`';
            let threadDetails = '`N/A`';

            if (updatedPinnedMessages && updatedPinnedMessages.size > 0) {
                const lastMessage = Array.from(updatedPinnedMessages.values()).pop();
                if (lastMessage) {
                    messageDetails = lastMessage.content ? `\`${lastMessage.content.slice(0, 100)}\`` : '`[Embed/Attachment]`';
                    authorTag = lastMessage.author ? `<@${lastMessage.author.id}>` : '`Unknown`';
                    messageUrl = `${lastMessage.url}`;

                    if (lastMessage.channel.isThread()) {
                        threadDetails = `🧵 **Thread:** <#${lastMessage.channel.id}> \`${lastMessage.channel.name}\``;
                    }
                }
            }

            // 📌 Build the embed for logging
            const embed = new EmbedBuilder(); // Yellow for pin events
            if (changedBy === '`Unknown`') {
                embed.setTitle('📌 **Pin Removed**').setColor(0xff0000);
            } else {
                embed.setTitle('📌 **Message Pinned**').setColor(0x00ff00);
            }
            embed.addFields(
                { name: '📢 Channel', value: `<#${channel.id}> \`${channel.name}\``, inline: true },
                { name: '📁 Category', value: channel.parent?.name || '`Uncategorized`', inline: true },
                { name: '👤 Message Author', value: authorTag, inline: true },
                { name: '📌 Pinned Message', value: messageDetails, inline: false },
                { name: '🔗 Message Link', value: messageUrl, inline: false },
            );
            if (changedBy !== '`Unknown`') embed.addFields({ name: '🛠 Changed By', value: changedBy, inline: false });
            if (threadDetails !== '`N/A`') embed.addFields({ name: '🧵 Thread Info', value: threadDetails, inline: false });
            embed.setFooter({ text: `Channel ID: ${channel.id}` }).setTimestamp();

            // 📤 Send the embed to the log channel
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged pin update in "${channel.name}".`);
        } catch (error) {
            logger.error(`❌ Error logging pin update: ${error.message}`);
        }
    },
};
