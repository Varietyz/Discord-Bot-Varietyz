/* eslint-disable jsdoc/require-returns */
const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const {
    guild: { runQuery, getAll },
} = require('../../../utils/essentials/dbUtils');
const { formatCustomEmoji } = require('../../../utils/helpers/formatCustomEmoji');

//
// Helper: Normalize a name using our cleaning rules and ensuring uniqueness using a local set.
//
/**
 *
 * @param name
 * @param type
 * @param existingKeys
 */
function getUniqueKey(name, type, existingKeys) {
    // Clean up the name: lower-case, remove unwanted characters, convert spaces/hyphens to underscores.
    const cleanName = name
        .toLowerCase()
        .replace(/[^a-z0-9\s_]/gi, '') // Allow letters, numbers, spaces, underscores.
        .replace(/[-\s]+/g, '_') // Convert spaces and hyphens to underscores.
        .replace(/^_+|_+$/g, ''); // Trim leading/trailing underscores.
    const baseKey = `${type}_${cleanName}`;
    let uniqueKey = baseKey;
    let suffix = 1;

    // If the key already exists in our local set, append a numeric suffix until unique.
    while (existingKeys.has(uniqueKey)) {
        uniqueKey = `${baseKey}_${suffix}`;
        suffix++;
        // Prevent exceeding Discord’s 32-character limit.
        if (uniqueKey.length > 32) {
            uniqueKey = `${baseKey.slice(0, 29)}_${suffix}`;
        }
    }
    existingKeys.add(uniqueKey);
    return uniqueKey;
}

/**
 * Deletes database entries for roles, channels, emojis, members, or webhooks that no longer exist.
 * @param {Set<string>} existingIds - The current list of Discord IDs for the given item.
 * @param {string} table - The database table name.
 * @param {string} idColumn - The column name containing the Discord ID.
 */
async function cleanupDeletedItems(existingIds, table, idColumn) {
    const storedItems = await getAll(`SELECT ${idColumn} FROM ${table}`);
    for (const item of storedItems) {
        if (!existingIds.has(item[idColumn])) {
            await runQuery(`DELETE FROM ${table} WHERE ${idColumn} = ?`, [item[idColumn]]);
            logger.info(`🗑️ Removed ${idColumn} ${item[idColumn]} from ${table} (no longer exists in Discord).`);
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder().setName('admin_initialize_guild').setDescription('Fetch, store, and clean up all relevant server data for the bot.').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        try {
            // Defer reply (ephemeral)
            await interaction.deferReply({ flags: 64 });

            const startTime = Date.now();
            const guild = interaction.guild;
            if (!guild) {
                return await interaction.reply({
                    content: '❌ **Error:** This command must be run in a server.',
                    flags: 64,
                });
            }

            logger.info(`🔄 Fetching and cleaning server data for guild: ${guild.name} (${guild.id})`);

            // ============================
            // ✅ FETCH & STORE CHANNELS
            // ============================
            const existingChannelRows = await getAll('SELECT channel_key FROM guild_channels');
            const existingChannelKeys = new Set(existingChannelRows.map((row) => row.channel_key));
            const channels = [];
            // Process channels sequentially.
            for (const channel of guild.channels.cache.values()) {
                const channelKey = getUniqueKey(channel.name, 'channel', existingChannelKeys);
                channels.push({
                    id: channel.id,
                    name: channel.name,
                    key: channelKey,
                    type: channel.type,
                    category: channel.parent?.name || 'uncategorized',
                    // Using the @everyone role to compute channel permissions.
                    permissions: channel.permissionsFor(guild.roles.everyone)?.bitfield.toString() || '0',
                });
            }
            // Insert/Update channels.
            for (const channel of channels) {
                await runQuery(
                    `INSERT INTO guild_channels (channel_id, channel_key, name, type, category, permissions)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON CONFLICT(channel_id) DO UPDATE SET channel_key = excluded.channel_key, name = excluded.name, type = excluded.type, category = excluded.category, permissions = excluded.permissions`,
                    [channel.id, channel.key, channel.name, channel.type, channel.category, channel.permissions],
                );
            }
            logger.info(`📌 Stored ${channels.length} channels.`);

            // ============================
            // ✅ FETCH & STORE ROLES
            // ============================
            const existingRoleRows = await getAll('SELECT role_key FROM guild_roles');
            const existingRoleKeys = new Set(existingRoleRows.map((row) => row.role_key));
            const roles = [];
            // Process roles sequentially.
            for (const role of guild.roles.cache.values()) {
                const roleKey = getUniqueKey(role.name, 'role', existingRoleKeys);
                roles.push({
                    id: role.id,
                    key: roleKey,
                    permissions: role.permissions.bitfield.toString(),
                });
            }
            for (const role of roles) {
                await runQuery(
                    `INSERT INTO guild_roles (role_id, role_key, permissions) VALUES (?, ?, ?)
                     ON CONFLICT(role_id) DO UPDATE SET role_key = excluded.role_key, permissions = excluded.permissions`,
                    [role.id, role.key, role.permissions],
                );
            }
            logger.info(`🔑 Stored ${roles.length} roles & permissions.`);

            // ============================
            // ✅ FETCH & STORE EMOJIS
            // ============================
            const existingEmojiRows = await getAll('SELECT emoji_key FROM guild_emojis');
            const existingEmojiKeys = new Set(existingEmojiRows.map((row) => row.emoji_key));
            const emojis = [];
            // Process emojis sequentially.
            for (const emoji of guild.emojis.cache.values()) {
                const emojiKey = getUniqueKey(emoji.name, 'emoji', existingEmojiKeys);
                emojis.push({
                    id: emoji.id,
                    key: emojiKey, // For the `emoji_key` column.
                    name: emoji.name, // The original name goes to `emoji_name`.
                    format: formatCustomEmoji(emoji),
                    animated: emoji.animated ? 1 : 0,
                });
            }
            for (const emoji of emojis) {
                await runQuery(
                    `INSERT INTO guild_emojis (emoji_id, emoji_key, emoji_name, emoji_format, animated) VALUES (?, ?, ?, ?, ?)
                     ON CONFLICT(emoji_id) DO UPDATE SET emoji_key = excluded.emoji_key, emoji_name = excluded.emoji_name, emoji_format = excluded.emoji_format, animated = excluded.animated`,
                    [emoji.id, emoji.key, emoji.name, emoji.format, emoji.animated],
                );
            }
            logger.info(`😃 Stored ${emojis.length} emojis.`);

            // ============================
            // ✅ FETCH & STORE MEMBERS
            // ============================
            // Ensure all members are fetched.
            await guild.members.fetch();
            // For members, simply use the original username (no normalization is applied).
            const members = Array.from(guild.members.cache.values()).map((member) => ({
                id: member.id,
                username: member.user.username,
            }));
            for (const member of members) {
                await runQuery(
                    `INSERT INTO guild_members (user_id, username) VALUES (?, ?)
                     ON CONFLICT(user_id) DO UPDATE SET username = excluded.username`,
                    [member.id, member.username],
                );
            }
            logger.info(`👥 Stored ${members.length} members.`);

            // ============================
            // ✅ FETCH & STORE WEBHOOKS
            // ============================
            const existingWebhookRows = await getAll('SELECT webhook_key FROM guild_webhooks');
            const existingWebhookKeys = new Set(existingWebhookRows.map((row) => row.webhook_key));
            const webhookEntries = [];
            const webhooks = await guild.fetchWebhooks();
            // Process webhooks sequentially.
            for (const webhook of webhooks.values()) {
                // Fallback to guild name if webhook.name is not set.
                const nameToUse = webhook.name || guild.name;
                const webhookKey = getUniqueKey(nameToUse, 'webhook', existingWebhookKeys);
                webhookEntries.push({
                    id: webhook.id, // The actual Discord webhook ID.
                    key: webhookKey, // Normalized key stored in webhook_key.
                    name: webhook.name || guild.name,
                    url: webhook.url,
                    channelId: webhook.channelId || null,
                });
            }
            for (const webhook of webhookEntries) {
                await runQuery(
                    `INSERT INTO guild_webhooks (webhook_key, webhook_id, webhook_name, webhook_url, channel_id) VALUES (?, ?, ?, ?, ?)
                     ON CONFLICT(webhook_key) DO UPDATE SET webhook_id = excluded.webhook_id, webhook_name = excluded.webhook_name, webhook_url = excluded.webhook_url, channel_id = excluded.channel_id`,
                    [webhook.key, webhook.id, webhook.name, webhook.url, webhook.channelId],
                );
            }
            logger.info(`📡 Stored ${webhookEntries.length} webhooks.`);

            // ============================
            // ✅ CLEANUP DELETED ITEMS
            // ============================
            await cleanupDeletedItems(new Set(channels.map((c) => c.id)), 'guild_channels', 'channel_id');
            await cleanupDeletedItems(new Set(roles.map((r) => r.id)), 'guild_roles', 'role_id');
            await cleanupDeletedItems(new Set(emojis.map((e) => e.id)), 'guild_emojis', 'emoji_id');
            await cleanupDeletedItems(new Set(members.map((m) => m.id)), 'guild_members', 'user_id');
            // For webhooks, check against the Discord webhook ID stored in webhook_id.
            await cleanupDeletedItems(new Set(webhookEntries.map((w) => w.id)), 'guild_webhooks', 'webhook_id');

            // ============================
            // ✅ SEND CONFIRMATION EMBED
            // ============================
            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('✅ Server Data Initialized & Cleaned')
                .setDescription(
                    `All important server data has been successfully **collected and updated**! 🎉  

This ensures that the bot has **up-to-date information** about channels, roles, members, emojis, and webhooks.  

🔹 *If you've added or removed anything recently, it's now reflected in the bot's database.*`,
                )
                .addFields(
                    { name: '📌 Channels', value: `**\`${channels.length}\`**`, inline: true },
                    { name: '🔑 Roles', value: `**\`${roles.length}\`**`, inline: true },
                    { name: '😃 Emojis', value: `**\`${emojis.length}\`**`, inline: true },
                    { name: '👥 Members', value: `**\`${members.length}\`**`, inline: true },
                    { name: '🔗 Webhooks', value: `**\`${webhookEntries.length}\`**`, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            const executionTime = Date.now() - startTime;
            logger.info(`✅ Execution completed in ${executionTime}ms, cleanup done.`);
        } catch (error) {
            logger.error(`❌ Error executing /admin_initialize_guild: ${error.message}`);
            // Optionally, you can send an error message to the interaction here.
        }
    },
};
