// src/modules/events/guildMemberRemove.js

const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { recentBans } = require('../guild/guildBanAdd'); // Import recentBans set

module.exports = {
    name: 'guildMemberRemove',
    once: false,

    /**
     * Called when a member leaves or is removed from the guild.
     * @param member - The guild member who left or was removed.
     */
    async execute(member) {
        if (!member.guild) {
            logger.warn('⚠️ No guild found for member removal.');
            return;
        }

        // 🛑 Skip logging if the user was recently banned
        if (recentBans.has(member.id)) {
            logger.info(`⏳ Skipping "left the server" log for ${member.user.tag} (was banned).`);
            return;
        }

        try {
            // 🔍 Fetch the correct log channel for member removals
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['member_logs']);
            if (!logChannelData) {
                logger.warn('⚠️ No log channel found for "member_logs" in database.');
                return;
            }

            const logChannel = await member.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) {
                logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                return;
            }

            // 🕵️ Fetch audit logs with a delay to check for kicks
            logger.info('🔎 Checking audit logs for kicks...');
            await new Promise((resolve) => setTimeout(resolve, 3000)); // ⏳ Wait 3 seconds for logs to update

            const fetchedLogs = await member.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberKick,
                limit: 5,
            });

            const kickLog = fetchedLogs.entries.find((entry) => entry.target.id === member.id && Date.now() - entry.createdTimestamp < 10000);

            let removalType = '🚪 **Left the Server**';
            let removedBy = '`Unknown`';
            let reason = '`No reason provided`';

            if (kickLog) {
                removalType = '🦵 **Kicked from Server**';
                removedBy = `<@${kickLog.executor.id}>`;
                reason = kickLog.reason ? `\`${kickLog.reason}\`` : '`No reason provided`';
                logger.info(`👮 Detected KICK by ${removedBy} for reason: ${reason}`);
            } else {
                logger.info(`🚪 ${member.user.tag} left the server.`);
            }

            // 🛠️ Build the embed
            const embed = new EmbedBuilder()
                .setColor(kickLog ? 0xe67e22 : 0x3498db) // Orange for kicks, Blue for normal leaves
                .setTitle(`${removalType}`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .addFields({ name: '👤 Member', value: `<@${member.id}> (${member.user.tag})`, inline: false }, { name: '📅 Joined At', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true });

            if (kickLog) {
                embed.addFields({ name: '👮 Removed By', value: removedBy, inline: true }, { name: '📝 Reason', value: reason, inline: false });
            }

            embed.setFooter({ text: `User ID: ${member.id}` }).setTimestamp();

            // 📌 Send the embed to the correct log channel
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged member removal: ${member.user.tag} (${removalType}).`);
        } catch (error) {
            logger.error(`❌ Error logging member removal: ${error.message}`);
        }
    },
};
