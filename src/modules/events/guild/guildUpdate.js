const logger = require('../../utils/essentials/logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
module.exports = {
    name: 'guildUpdate',
    once: false,
    async execute(oldGuild, newGuild, client) {
        try {
            const changes = [];
            if (oldGuild.name !== newGuild.name) {
                changes.push(`📛 **Name Changed**\n\`${oldGuild.name}\` → **\`${newGuild.name}\`**`);
            }
            if (oldGuild.icon !== newGuild.icon) {
                changes.push('🖼 **Icon Updated:**');
            }
            if (oldGuild.banner !== newGuild.banner) {
                changes.push('🎨 **Banner Updated:**');
            }
            if (oldGuild.splash !== newGuild.splash) {
                changes.push('🌊 **Splash Image Updated:**');
            }
            if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
                changes.push(`🔗 **Vanity URL:**\n\`${oldGuild.vanityURLCode || 'None'}\` → **\`${newGuild.vanityURLCode || 'None'}\`**`);
            }
            if (oldGuild.features.length !== newGuild.features.length) {
                changes.push('💎 **Server Features Updated**');
            }
            if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
                changes.push('💤 **AFK Channel Updated:**');
            }
            if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
                changes.push(`⏳ **AFK Timeout:**\n\`${oldGuild.afkTimeout / 60} min\` → **\`${newGuild.afkTimeout / 60} min\`**`);
            }
            if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
                changes.push('📢 **System Channel Updated:**');
            }
            if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
                changes.push(`🚨 **Explicit Content Filter:**\n\`${oldGuild.explicitContentFilter}\` → **\`${newGuild.explicitContentFilter}\`**`);
            }
            if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
                changes.push(`✅ **Verification Level:**\n\`${oldGuild.verificationLevel}\` → **\`${newGuild.verificationLevel}\`**`);
            }

            if (changes.length === 0) {
                changes.push('ℹ️ **Changes detected, but nothing significant or impactful.**');
                return;
            }
            const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['server_logs']);
            if (!logChannelData) return;
            const logChannel = await client.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            let executor = 'Unknown User';
            try {
                const fetchedLogs = await newGuild.fetchAuditLogs({
                    type: AuditLogEvent.GuildUpdate,
                    limit: 5,
                });
                const logEntry = fetchedLogs.entries.first();
                if (logEntry) {
                    executor = `<@${logEntry.executor.id}>`;
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for guild update: ${auditError.message}`);
            }
            const bannerUrl = newGuild.bannerURL({ size: 1024 }) || null;
            const splashUrl = newGuild.splashURL({ size: 1024 }) || null;
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('🔄 Server Updated')
                .addFields({ name: '\u200b', value: changes.join('\n'), inline: false }, { name: '🛠 Changed By', value: executor, inline: false })
                .setTimestamp();
            if (bannerUrl && oldGuild.banner !== newGuild.banner) embed.setImage(bannerUrl);
            if (splashUrl && oldGuild.splash !== newGuild.splash) {
                embed.addFields({ name: '🌊 New Splash Image', value: `[View Image](${splashUrl})`, inline: false });
            }
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged server update: ${newGuild.name}`);
        } catch (error) {
            logger.error(`❌ Error logging server update: ${error.message}`);
        }
    },
};
