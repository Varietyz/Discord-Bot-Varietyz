// src/modules/events/roleCreate.js

const {
    guild: { getOne, runQuery, getAll },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder, Events, AuditLogEvent } = require('discord.js');
const { normalizeKey } = require('../../utils/normalizing/normalizeKey');

module.exports = {
    name: 'roleCreate',
    once: false,

    /**
     * Triggered when a new role is created.
     * @param role - The role that was created.
     */
    async execute(role) {
        try {
            logger.info(`⏳ Waiting 1 minute for updates before logging role creation: "${role.name}" (ID: ${role.id}) in guild: ${role.guild.name}`);

            let updatedRole = role;
            let roleDeleted = false;
            const timeoutDuration = 60000; // 1-minute timeout

            // Wait for up to 1 minute to catch any role updates or deletions.
            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    logger.warn(`⚠️ [RoleCreate] No updates detected for role "${role.name}" (ID: ${role.id}). Logging creation.`);
                    resolve(updatedRole);
                }, timeoutDuration);

                const updateListener = (oldRole, newRole) => {
                    if (newRole.id === role.id) {
                        clearTimeout(timeout);
                        role.guild.client.off(Events.GuildRoleUpdate, updateListener);
                        role.guild.client.off(Events.GuildRoleDelete, deleteListener);
                        updatedRole = newRole;
                        resolve(updatedRole);
                    }
                };

                const deleteListener = (deletedRole) => {
                    if (deletedRole.id === role.id) {
                        clearTimeout(timeout);
                        role.guild.client.off(Events.GuildRoleUpdate, updateListener);
                        role.guild.client.off(Events.GuildRoleDelete, deleteListener);
                        roleDeleted = true;
                        logger.warn(`🗑️ Role "${role.name}" (ID: ${role.id}) was deleted before logging.`);
                        resolve(null);
                    }
                };

                role.guild.client.on(Events.GuildRoleUpdate, updateListener);
                role.guild.client.on(Events.GuildRoleDelete, deleteListener);
            });

            // If the role was deleted or is no longer available, stop processing.
            if (roleDeleted || !updatedRole) return;

            // Generate a unique role key.
            // IMPORTANT: We pass { guild: { getAll } } so that normalizeKey can use db.guild.getAll(...)
            const baseKey = await normalizeKey(updatedRole.name, 'role', { guild: { getAll } });

            // Insert (or update) the role into the database.
            await runQuery(
                `INSERT INTO guild_roles (role_key, role_id, permissions) VALUES (?, ?, ?)
                 ON CONFLICT(role_id) DO UPDATE SET role_key = excluded.role_key, permissions = excluded.permissions`,
                [baseKey, updatedRole.id, parseInt(updatedRole.permissions.bitfield.toString(), 10) || 0],
            );

            logger.info(`🆕 [RoleCreate] Role "${updatedRole.name}" (ID: ${updatedRole.id}) was created in guild: ${updatedRole.guild.name}`);

            // Retrieve the logging channel for roles.
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['role_logs']);
            if (!logChannelData) return;
            const logChannel = updatedRole.guild.channels.cache.get(logChannelData.channel_id);
            if (!logChannel) return;

            // Retrieve the action performer from the audit logs.
            let executor = 'Unknown User';
            try {
                const fetchedLogs = await updatedRole.guild.fetchAuditLogs({
                    type: AuditLogEvent.RoleCreate,
                    limit: 5,
                });
                const logEntry = fetchedLogs.entries.find((entry) => entry.target.id === updatedRole.id);
                if (logEntry) {
                    executor = `<@${logEntry.executor.id}>`;
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for role creation: ${auditError.message}`);
            }

            // Prepare role properties for the embed.
            const mentionable = updatedRole.mentionable ? '`✅ Yes`' : '`❌ No`';
            const hoist = updatedRole.hoist ? '`✅ Yes`' : '`❌ No`';
            const roleColor = updatedRole.color ? `#${updatedRole.color.toString(16).padStart(6, '0')}` : '`Default`';
            const position = `\`#${updatedRole.position}\``;

            // Construct the embed message.
            const embed = new EmbedBuilder()
                .setColor(updatedRole.color || 0x2ecc71)
                .setTitle('🔑 New Role Created')
                .addFields(
                    { name: '📌 Role', value: `<@&${updatedRole.id}>`, inline: true },
                    { name: '🔑 Role Key', value: `\`${baseKey}\``, inline: true },
                    { name: '👁️ Hoisted', value: hoist, inline: true },
                    { name: '📢 Mentionable', value: mentionable, inline: true },
                    { name: '🎨 Color', value: `\`${roleColor}\``, inline: true },
                    { name: '📊 Position', value: position, inline: true },
                    { name: '🛠 Created By', value: executor, inline: false },
                )
                .setTimestamp();

            // Send the log embed.
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged new role creation: ${updatedRole.name}`);
        } catch (error) {
            logger.error(`❌ Error logging role creation: ${error.message}`);
        }
    },
};
