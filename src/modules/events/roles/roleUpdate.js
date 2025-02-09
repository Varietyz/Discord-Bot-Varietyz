// src/modules/events/roleUpdate.js

const { getOne, runQuery } = require('../../utils/dbUtils');
const logger = require('../../utils/logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { normalizeKey } = require('../../utils/normalizeKey');

module.exports = {
    name: 'roleUpdate',
    once: false,
    /**
     * Triggered when a role is updated.
     * @param oldRole - The role before the update.
     * @param newRole - The role after the update.
     */
    async execute(oldRole, newRole) {
        try {
            // ⏳ **Ignore updates for newly created roles**
            const roleCreatedTimestamp = newRole.createdTimestamp;
            if (Date.now() - roleCreatedTimestamp < 30000) {
                // 30-second threshold
                logger.info(`⚠️ [RoleUpdate] Ignoring update for recently created role: "${newRole.name}" (ID: ${newRole.id})`);
                return;
            }

            // ✅ Normalize role name for database storage
            const existingKeys = new Set();
            const roleKey = normalizeKey(newRole.name, 'role', existingKeys);

            // ✅ Detect changes
            const changes = [];
            if (oldRole.name !== newRole.name) changes.push(`📛 **Name:** *\`${oldRole.name}\`* → **\`${newRole.name}\`**`);
            if (oldRole.color !== newRole.color) changes.push(`🎨 **Color:** *\`#${oldRole.color.toString(16).padStart(6, '0')}\`* → **\`#${newRole.color.toString(16).padStart(6, '0')}\`**`);
            if (oldRole.mentionable !== newRole.mentionable) changes.push(`📢 **Mentionable:** ${newRole.mentionable ? '*`❌ No`* → **`✅ Yes`**' : '*`✅ Yes`* → **`❌ No`**'}`);
            if (oldRole.hoist !== newRole.hoist) changes.push(`👁 **Hoisted:** ${newRole.hoist ? '*`❌ No`* → **`✅ Yes`**' : '*`✅ Yes`* → **`❌ No`**'}`);
            if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push('**`⚙️ Permissions Updated`**');

            if (changes.length === 0) {
                logger.info(`ℹ️ [RoleUpdate] No significant changes detected for role: "${newRole.name}"`);
                return;
            }

            // ✅ Update the role in the database
            await runQuery('UPDATE guild_roles SET role_key = ?, permissions = ? WHERE role_id = ?', [
                roleKey,
                parseInt(newRole.permissions.bitfield.toString(), 10) || 0, // Store as INTEGER
                newRole.id,
            ]);

            logger.info(`✏️ [RoleUpdate] Role "${newRole.name}" (ID: ${newRole.id}) was updated in guild: ${newRole.guild.name}`);

            // 🔍 Fetch the logging channel from the database
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['role_logs']);
            if (!logChannelData) return;

            const logChannel = newRole.guild.channels.cache.get(logChannelData.channel_id);
            if (!logChannel) return;

            // 🏆 Role Properties
            const mentionable = newRole.mentionable ? '`✅ Yes`' : '`❌ No`';
            const hoist = newRole.hoist ? '`✅ Yes`' : '`❌ No`';
            const roleColor = newRole.color ? `#${newRole.color.toString(16).padStart(6, '0')}` : '`Default`';
            const position = `\`#${newRole.position}\``;

            // 🔍 **Retrieve the action performer from the audit logs**
            let executor = 'Unknown User';
            try {
                const fetchedLogs = await newRole.guild.fetchAuditLogs({
                    type: AuditLogEvent.RoleUpdate,
                    limit: 5,
                });

                const logEntry = fetchedLogs.entries.find((entry) => entry.target.id === newRole.id);
                if (logEntry) {
                    executor = `<@${logEntry.executor.id}>`; // Mention the user
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for role update: ${auditError.message}`);
            }

            // 🛠️ Construct Embed
            const embed = new EmbedBuilder()
                .setColor(newRole.color || 0xe67e22) // Use role color if available, else orange
                .setTitle('✏️ Role Updated')
                .addFields(
                    { name: '\u200b', value: changes.join('\n'), inline: false },
                    { name: '\u200b', value: '\u200b', inline: false },
                    { name: '📌 Role', value: `<@&${newRole.id}>`, inline: true },
                    { name: '🔑 Role Key', value: `\`${roleKey}\``, inline: true },
                    { name: '👁️ Hoisted', value: hoist, inline: true },
                    { name: '📢 Mentionable', value: mentionable, inline: true },
                    { name: '🎨 Color', value: `\`${roleColor}\``, inline: true },
                    { name: '📊 Position', value: position, inline: true },
                    { name: '🛠 Changed By', value: executor, inline: false },
                )
                .setTimestamp();

            // 🔍 Send the log message
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged role update: ${newRole.name}`);
        } catch (error) {
            logger.error(`❌ Error logging role update: ${error.message}`);
        }
    },
};
