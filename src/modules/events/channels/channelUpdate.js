const { EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
const {
    guild: { getOne, runQuery },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');

const CHANNEL_TYPES = {
    [ChannelType.GuildText]: '📃 Text Channel',
    [ChannelType.GuildVoice]: '🔊 Voice Channel',
    [ChannelType.GuildCategory]: '📂 Category',
    [ChannelType.GuildAnnouncement]: '📢 Announcement Channel',
    [ChannelType.GuildStageVoice]: '🎙 Stage Channel',
    [ChannelType.GuildForum]: '📝 Forum Channel',
    [ChannelType.GuildMedia]: '📷 Media Channel',
    [ChannelType.GuildDirectory]: '📜 Server Directory',
    [ChannelType.AnnouncementThread]: '📢 Announcement Thread',
    [ChannelType.PublicThread]: '💬 Public Thread',
    [ChannelType.PrivateThread]: '🔒 Private Thread',
};

module.exports = {
    name: 'channelUpdate',
    once: false,

    /**
     * Triggered when a channel is updated.
     * @param oldChannel - The channel before the update.
     * @param newChannel - The channel after the update.
     */
    async execute(oldChannel, newChannel) {
        if (!newChannel.guild) return;

        try {
            // 🔍 Fetch existing `channel_key` from the database (STATIC, should NOT change)
            const existingChannel = await getOne('SELECT channel_key FROM guild_channels WHERE channel_id = ?', [newChannel.id]);
            if (!existingChannel) {
                logger.warn(`⚠️ No existing channel found for ID: ${newChannel.id}, skipping update.`);
                return;
            }
            const logKey = existingChannel.channel_key; // ✅ **Static channel key**
            logger.info(`🔍 [ChannelUpdate] Static channel key retained: ${logKey}`);

            // 🔄 Detect changes in channel properties
            const changes = [];
            if (oldChannel.name !== newChannel.name) {
                changes.push(`📛 **Name:** \`${oldChannel.name}\` → <#${newChannel.id}> \`${newChannel.name}\``);
            }
            if (oldChannel.topic !== newChannel.topic) {
                const oldTopic = oldChannel.topic || '`None`';
                const newTopic = newChannel.topic || '`None`';
                changes.push(`📝 **Topic:** ${oldTopic} → **${newTopic}**`);
            }
            if (oldChannel.nsfw !== newChannel.nsfw) {
                changes.push(`🔞 **NSFW Enabled:** ${oldChannel.nsfw ? '`✅ Yes` → **`❌ No`**' : '`❌ No` → **`✅ Yes`**'}`);
            }
            if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
                changes.push(`⏳ **Slow Mode:** \`${oldChannel.rateLimitPerUser || '0'}s\` → **\`${newChannel.rateLimitPerUser || '0'}s\`**`);
            }
            if (oldChannel.parentId !== newChannel.parentId) {
                const oldCategory = oldChannel.parent?.name || '`None`';
                const newCategory = newChannel.parent?.name || '`None`';
                changes.push(`📂 **Category:** ${oldCategory} → **${newCategory}**`);
            }

            // Exit early if no actual changes (avoids spam).
            if (changes.length === 0) return;

            logger.info(`🔄 [ChannelUpdate] Channel updated: "${oldChannel.name}" → "${newChannel.name}" in guild: ${newChannel.guild.name}`);

            // 🔍 Fetch log channel from database.
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['channel_logs']);
            if (!logChannelData) return;

            const logChannel = await newChannel.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) {
                logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                return;
            }

            // 🔍 Fetch audit logs for the initiator.
            logger.info('🔎 Checking audit logs for channel updates...');
            await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds for logs to update

            let updatedBy = '`Unknown`';
            try {
                const fetchedLogs = await newChannel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate, limit: 5 });
                const updateLog = fetchedLogs.entries.find(
                    (entry) => entry.target.id === newChannel.id && Date.now() - entry.createdTimestamp < 10000, // Checking within 10 seconds
                );

                if (updateLog) {
                    updatedBy = `<@${updateLog.executor.id}>`; // Mention the user who updated
                    logger.info(`🔄 Channel updated by: ${updatedBy}`);

                    // ✅ Skip logging if the update was done by the excluded user
                    if (updateLog.executor.id === '1172933457010245762') {
                        logger.info(`🚫 Skipping log: Channel update by excluded user <@${updateLog.executor.id}>.`);
                        return;
                    }
                } else {
                    logger.warn(`⚠️ No audit log entry found for channel update: "${newChannel.name}"`);
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for channel update: ${auditError.message}`);
            }

            // 🔍 Check for `ensuredChannelKey` from `setup_channels`, `log_channels`, or `comp_channels`
            let ensuredChannelKey = null;
            const setupChannel = await getOne('SELECT setup_key FROM setup_channels WHERE channel_id = ?', [newChannel.id]);
            const logChannelEntry = await getOne('SELECT log_key FROM log_channels WHERE channel_id = ?', [newChannel.id]);
            const compChannel = await getOne('SELECT comp_key FROM comp_channels WHERE channel_id = ?', [newChannel.id]);

            if (setupChannel) ensuredChannelKey = setupChannel.setup_key;
            else if (logChannelEntry) ensuredChannelKey = logChannelEntry.log_key;
            else if (compChannel) ensuredChannelKey = compChannel.comp_key;

            // ✅ **Update `guild_channels`, ensuring `channel_key` remains static**
            await runQuery(
                `UPDATE guild_channels 
                 SET name = ?, type = ?, category = ?, permissions = ? 
                 WHERE channel_id = ?`,
                [newChannel.name, newChannel.type, newChannel.parent?.name || 'general', newChannel.permissionsFor(newChannel.guild.roles.everyone)?.bitfield.toString() || '0', newChannel.id],
            );

            // 🛠️ **Construct Embed for Logging**
            const channelTypeName = CHANNEL_TYPES[newChannel.type] || '❓ Unknown Type';

            const embed = new EmbedBuilder()
                .setColor(0xe67e22) // Orange for updates.
                .setTitle('🔄 Channel Updated')
                .addFields(
                    { name: '🏷️ Channel', value: `<#${newChannel.id}> \`${newChannel.name}\``, inline: true },
                    { name: '📁 Category', value: `\`${newChannel.parent?.name || 'Uncategorized'}\``, inline: true },
                    { name: '🔑 Generated Channel Key', value: `\`${logKey}\``, inline: true },
                );

            if (ensuredChannelKey) {
                embed.addFields({ name: ':closed_lock_with_key: Static Key', value: `\`${ensuredChannelKey}\``, inline: true });
            }

            embed
                .addFields({ name: '🔍 Channel Type', value: `\`${channelTypeName}\``, inline: true }, { name: '🛠 Updated By', value: updatedBy, inline: true }, { name: '🔄 Changes', value: changes.join('\n'), inline: false })
                .setFooter({ text: `Channel ID: ${newChannel.id}` })
                .setTimestamp();

            // 📌 Send the embed to the log channel.
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged channel update: "${newChannel.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging channel update: ${error.message}`);
        }
    },
};
