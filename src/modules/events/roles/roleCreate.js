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
            const client = role.guild.client;
            client.setMaxListeners(Math.max(client.getMaxListeners() || 10, 15)); // Adjust listener limits safely

            // Using a WeakSet to prevent duplicate listeners
            if (!client.activeRoleListeners) client.activeRoleListeners = new WeakSet();
            if (client.activeRoleListeners.has(role)) return; // Avoid duplicate processing
            client.activeRoleListeners.add(role);

            logger.info(`⏳ Waiting 15 seconds for updates before logging role creation: "${role.name}" (ID: ${role.id}) in guild: ${role.guild.name}`);

            let updatedRole = role;
            let roleDeleted = false;
            const timeoutDuration = 15000; // Reduce wait time to 15 seconds

            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    logger.warn(`⚠️ No updates detected for role "${role.name}" (ID: ${role.id}). Logging creation.`);
                    resolve(updatedRole);
                }, timeoutDuration);

                const updateListener = (oldRole, newRole) => {
                    if (newRole.id === role.id) {
                        clearTimeout(timeout);
                        client.off(Events.GuildRoleUpdate, updateListener);
                        client.off(Events.GuildRoleDelete, deleteListener);
                        updatedRole = newRole;
                        resolve(updatedRole);
                    }
                };

                const deleteListener = (deletedRole) => {
                    if (deletedRole.id === role.id) {
                        clearTimeout(timeout);
                        client.off(Events.GuildRoleUpdate, updateListener);
                        client.off(Events.GuildRoleDelete, deleteListener);
                        roleDeleted = true;
                        logger.warn(`🗑️ Role "${role.name}" (ID: ${role.id}) was deleted before logging.`);
                        resolve(null);
                    }
                };

                client.on(Events.GuildRoleUpdate, updateListener);
                client.on(Events.GuildRoleDelete, deleteListener);
            });

            if (roleDeleted || !updatedRole) return;
            client.activeRoleListeners.delete(role); // Cleanup WeakSet

            const baseKey = await normalizeKey(updatedRole.name, 'role', { guild: { getAll } });

            await runQuery(
                `INSERT INTO guild_roles (role_key, role_id, permissions) VALUES (?, ?, ?)
                 ON CONFLICT(role_id) DO UPDATE SET role_key = excluded.role_key, permissions = excluded.permissions`,
                [baseKey, updatedRole.id, parseInt(updatedRole.permissions.bitfield.toString(), 10) || 0],
            );

            logger.info(`🆕 [RoleCreate] Role "${updatedRole.name}" (ID: ${updatedRole.id}) created in guild: ${updatedRole.guild.name}`);

            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['role_logs']);
            if (!logChannelData) return;
            const logChannel = updatedRole.guild.channels.cache.get(logChannelData.channel_id);
            if (!logChannel) return;

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

            const mentionable = updatedRole.mentionable ? '`✅ Yes`' : '`❌ No`';
            const hoist = updatedRole.hoist ? '`✅ Yes`' : '`❌ No`';
            const roleColor = updatedRole.color ? `#${updatedRole.color.toString(16).padStart(6, '0')}` : '`Default`';
            const position = `\`#${updatedRole.position}\``;

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

            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged new role creation: ${updatedRole.name}`);
        } catch (error) {
            logger.error(`❌ Error logging role creation: ${error.message}`);
        }
    },
};
