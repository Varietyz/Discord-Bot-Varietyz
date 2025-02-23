const {
    guild: { getOne, runQuery },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
module.exports = {
    name: 'roleDelete',
    once: false,
    async execute(role) {
        try {
            logger.info(`🗑️ [RoleDelete] Role "${role.name}" (ID: ${role.id}) was deleted from guild: ${role.guild.name}`);
            await runQuery('DELETE FROM guild_roles WHERE role_id = ?', [role.id]);
            logger.info(`🗑️ [Database] Removed role "${role.name}" (ID: ${role.id}) from the database.`);
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['role_logs']);
            if (!logChannelData) return;
            const logChannel = role.guild.channels.cache.get(logChannelData.channel_id);
            if (!logChannel) return;
            let executor = 'Unknown User';
            try {
                const fetchedLogs = await role.guild.fetchAuditLogs({
                    type: AuditLogEvent.RoleDelete,
                    limit: 5,
                });
                const logEntry = fetchedLogs.entries.find((entry) => entry.target.id === role.id);
                if (logEntry) {
                    executor = `<@${logEntry.executor.id}>`;
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for role deletion: ${auditError.message}`);
            }
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('🗑️ Role Deleted')
                .addFields({ name: '📌 Role Name', value: `\`${role.name}\``, inline: true }, { name: '🔑 Role ID', value: `\`${role.id}\``, inline: true }, { name: '🛠 Deleted By', value: executor, inline: false })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged role deletion: ${role.name}`);
        } catch (error) {
            logger.error(`❌ Error logging role deletion: ${error.message}`);
        }
    },
};