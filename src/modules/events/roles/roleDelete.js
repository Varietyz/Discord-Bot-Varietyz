// src/modules/events/roleDelete.js

const { getOne, runQuery } = require('../../utils/dbUtils');
const logger = require('../../utils/logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'roleDelete',
    once: false,
    /**
     * Triggered when a role is deleted.
     * @param role - The role that was deleted.
     */
    async execute(role) {
        try {
            logger.info(`🗑️ [RoleDelete] Role "${role.name}" (ID: ${role.id}) was deleted from guild: ${role.guild.name}`);

            // ✅ Remove role from the database
            await runQuery('DELETE FROM guild_roles WHERE role_id = ?', [role.id]);
            logger.info(`🗑️ [Database] Removed role "${role.name}" (ID: ${role.id}) from the database.`);

            // 🔍 Fetch the logging channel from the database
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['role_logs']);
            if (!logChannelData) return;

            const logChannel = role.guild.channels.cache.get(logChannelData.channel_id);
            if (!logChannel) return;

            // 🔍 **Retrieve the action performer from the audit logs**
            let executor = 'Unknown User';
            try {
                const fetchedLogs = await role.guild.fetchAuditLogs({
                    type: AuditLogEvent.RoleDelete,
                    limit: 5,
                });

                const logEntry = fetchedLogs.entries.find((entry) => entry.target.id === role.id);
                if (logEntry) {
                    executor = `<@${logEntry.executor.id}>`; // Mention the user
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for role deletion: ${auditError.message}`);
            }

            // 🛠️ Construct Embed
            const embed = new EmbedBuilder()
                .setColor(0xff0000) // Red for deletions
                .setTitle('🗑️ Role Deleted')
                .addFields({ name: '📌 Role Name', value: `\`${role.name}\``, inline: true }, { name: '🔑 Role ID', value: `\`${role.id}\``, inline: true }, { name: '🛠 Deleted By', value: executor, inline: false })
                .setTimestamp();

            // 🔍 Send the log message
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged role deletion: ${role.name}`);
        } catch (error) {
            logger.error(`❌ Error logging role deletion: ${error.message}`);
        }
    },
};
