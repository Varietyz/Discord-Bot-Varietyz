const {
    guild: { getOne, runQuery, getAll },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { normalizeKey } = require('../../utils/normalizing/normalizeKey');
module.exports = {
    name: 'roleUpdate',
    once: false,
    async execute(oldRole, newRole) {
        try {
            const roleCreatedTimestamp = newRole.createdTimestamp;
            if (Date.now() - roleCreatedTimestamp < 30000) {
                logger.info(`⚠️ [RoleUpdate] Ignoring update for recently created role: "${newRole.name}" (ID: ${newRole.id})`);
                return;
            }
            const changes = [];
            if (oldRole.name !== newRole.name) changes.push(`📛 **Name:** *\`${oldRole.name}\`* → **\`${newRole.name}\`**`);
            if (oldRole.color !== newRole.color) {
                const oldColor = oldRole.color ? `#${oldRole.color.toString(16).padStart(6, '0')}` : '`Default`';
                const newColor = newRole.color ? `#${newRole.color.toString(16).padStart(6, '0')}` : '`Default`';
                changes.push(`🎨 **Color:** *\`${oldColor}\`* → **\`${newColor}\`**`);
            }
            if (oldRole.mentionable !== newRole.mentionable) changes.push(`📢 **Mentionable:** ${oldRole.mentionable ? '*`✅ Yes`*' : '*`❌ No`*'} → ${newRole.mentionable ? '**`✅ Yes`**' : '**`❌ No`**'}`);
            if (oldRole.hoist !== newRole.hoist) changes.push(`👁 **Hoisted:** ${oldRole.hoist ? '*`✅ Yes`*' : '*`❌ No`*'} → ${newRole.hoist ? '**`✅ Yes`**' : '**`❌ No`**'}`);
            if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push('**`⚙️ Permissions Updated`**');

            if (changes.length === 0) {
                logger.info(`ℹ️ [RoleUpdate] No significant changes detected for role: "${newRole.name}"`);
                return;
            }
            const roleRecord = await getOne('SELECT role_key FROM guild_roles WHERE role_id = ?', [newRole.id]);
            let roleKey;
            if (roleRecord && roleRecord.role_key) {
                roleKey = roleRecord.role_key;
            } else {
                roleKey = await normalizeKey(newRole.name, 'role', { getAll });
            }
            await runQuery(
                `UPDATE guild_roles 
                 SET permissions = ? 
                 WHERE role_id = ?`,
                [parseInt(newRole.permissions.bitfield.toString(), 10) || 0, newRole.id],
            );
            logger.info(`✏️ [RoleUpdate] Role "${newRole.name}" (ID: ${newRole.id}) updated in guild: ${newRole.guild.name}`);
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['role_logs']);
            if (!logChannelData) return;
            const logChannel = newRole.guild.channels.cache.get(logChannelData.channel_id);
            if (!logChannel) return;
            let executor = 'Unknown User';
            try {
                const fetchedLogs = await newRole.guild.fetchAuditLogs({
                    type: AuditLogEvent.RoleUpdate,
                    limit: 5,
                });
                const logEntry = fetchedLogs.entries.find((entry) => entry.target.id === newRole.id);
                if (logEntry) {
                    executor = `<@${logEntry.executor.id}>`;
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for role update: ${auditError.message}`);
            }
            const mentionable = newRole.mentionable ? '`✅ Yes`' : '`❌ No`';
            const hoist = newRole.hoist ? '`✅ Yes`' : '`❌ No`';
            const roleColor = newRole.color ? `#${newRole.color.toString(16).padStart(6, '0')}` : '`Default`';
            const position = `\`#${newRole.position}\``;
            const embed = new EmbedBuilder()
                .setColor(newRole.color || 0xe67e22)
                .setTitle('✏️ Role Updated')
                .addFields(
                    { name: '\u200b', value: changes.join('\n'), inline: false },
                    { name: '📌 Role', value: `<@&${newRole.id}>`, inline: true },
                    { name: '🔑 Role Key', value: `\`${roleKey}\``, inline: true },
                    { name: '👁️ Hoisted', value: hoist, inline: true },
                    { name: '📢 Mentionable', value: mentionable, inline: true },
                    { name: '🎨 Color', value: `\`${roleColor}\``, inline: true },
                    { name: '📊 Position', value: position, inline: true },
                    { name: '🛠 Changed By', value: executor, inline: false },
                )
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged role update: ${newRole.name}`);
        } catch (error) {
            logger.error(`❌ Error logging role update: ${error.message}`);
        }
    },
};