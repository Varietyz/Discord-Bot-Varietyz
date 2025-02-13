// src/modules/events/memberBoost.js

const {
    guild: { getOne, runQuery },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'memberBoost',
    once: false,

    /**
     * Triggered when a member boosts the server.
     * @param member - The member who boosted the server.
     */
    async execute(member) {
        if (!member.guild) {
            logger.warn('⚠️ [MemberBoost] No guild found for boost event.');
            return;
        }

        try {
            logger.info(`🚀 [MemberBoost] ${member.user.tag} boosted the server!`);

            // 🔍 Fetch the correct log channel for boosts
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['boost_logs']);
            if (!logChannelData) {
                logger.warn('⚠️ No log channel found for "boost_logs" in database.');
                return;
            }

            const logChannel = await member.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) {
                logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                return;
            }

            // 🏆 **Check Boost Streak**
            const boostSince = member.premiumSince ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>` : '`Unknown`';
            const boostStreak = member.premiumSince ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:D>` : '`No Streak`';

            // 🔍 **Retrieve who granted the boost from audit logs**
            let boostedBy = '`Unknown`';
            try {
                const fetchedLogs = await member.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberUpdate,
                    limit: 5,
                });

                const boostLog = fetchedLogs.entries.find((entry) => entry.target.id === member.id && entry.changes.some((change) => change.key === 'premium_since'));

                if (boostLog) {
                    boostedBy = `<@${boostLog.executor.id}>`;
                    logger.info(`✅ Detected boost by: ${boostedBy}`);
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for boost event: ${auditError.message}`);
            }

            // 🎖️ **Track Boosts in DB**
            await runQuery(
                `INSERT INTO guild_members (user_id, username) VALUES (?, ?) 
                 ON CONFLICT(user_id) DO UPDATE SET username = excluded.username`,
                [member.id, member.user.username],
            );

            // 🛠️ **Build Embed**
            const embed = new EmbedBuilder()
                .setColor(0xf47fff) // Purple for boosts
                .setTitle('🚀 Member Boosted the Server!')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .addFields(
                    { name: '👤 Member', value: `<@${member.id}> (${member.user.tag})`, inline: false },
                    { name: '🎖️ Boost Streak', value: boostStreak, inline: true },
                    { name: '📅 Boosted Since', value: boostSince, inline: true },
                    { name: '🎁 Boosted By', value: boostedBy, inline: false },
                )
                .setFooter({ text: `User ID: ${member.id}` })
                .setTimestamp();

            // 📌 **Send the embed to the correct log channel**
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged server boost by ${member.user.tag}`);
        } catch (error) {
            logger.error(`❌ Error logging member boost: ${error.message}`);
        }
    },
};
