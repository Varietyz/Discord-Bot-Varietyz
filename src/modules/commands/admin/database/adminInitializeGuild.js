/* eslint-disable jsdoc/require-returns */
const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/logger');
const {
    guild: { runQuery, getAll },
} = require('../../../utils/dbUtils');
const { normalizeKey } = require('../../../utils/normalizeKey');
const { formatCustomEmoji } = require('../../../utils/formatCustomEmoji');

/**
 * Deletes database entries for roles, channels, emojis, and members that no longer exist.
 * @param {Set} existingIds - The current list of IDs from Discord.
 * @param {string} table - The database table name.
 * @param {string} idColumn - The column name of the ID to check.
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
            const existingKeys = new Set();

            // ✅ Fetch & Store Channels
            const channels = guild.channels.cache.map((channel) => ({
                id: channel.id,
                name: channel.name,
                key: normalizeKey(channel.name, 'channel', existingKeys),
                type: channel.type,
                category: channel.parent?.name || 'uncategorized',
                permissions: channel.permissionsFor(guild.roles.everyone)?.bitfield.toString() || '0',
            }));

            for (const channel of channels) {
                await runQuery(
                    `INSERT INTO guild_channels (channel_id, channel_key, name, type, category, permissions) VALUES (?, ?, ?, ?, ?, ?) 
                     ON CONFLICT(channel_id) DO UPDATE SET channel_key = excluded.channel_key, name = excluded.name, type = excluded.type, category = excluded.category, permissions = excluded.permissions`,
                    [channel.id, channel.key, channel.name, channel.type, channel.category, channel.permissions],
                );
            }
            logger.info(`📌 Stored ${channels.length} channels.`);

            // ✅ Fetch & Store Roles
            const roles = guild.roles.cache.map((role) => ({
                id: role.id,
                key: normalizeKey(role.name, 'role', existingKeys),
                permissions: role.permissions.bitfield.toString(),
            }));

            for (const role of roles) {
                await runQuery(
                    `INSERT INTO guild_roles (role_id, role_key, permissions) VALUES (?, ?, ?) 
                     ON CONFLICT(role_id) DO UPDATE SET role_key = excluded.role_key, permissions = excluded.permissions`,
                    [role.id, role.key, role.permissions],
                );
            }
            logger.info(`🔑 Stored ${roles.length} roles & permissions.`);

            // ✅ Fetch & Store Emojis
            const emojis = guild.emojis.cache.map((emoji) => ({
                id: emoji.id,
                name: normalizeKey(emoji.name, 'emoji', existingKeys),
                format: formatCustomEmoji(emoji),
                animated: emoji.animated ? 1 : 0,
            }));

            for (const emoji of emojis) {
                await runQuery(
                    `INSERT INTO guild_emojis (emoji_id, emoji_name, emoji_format, animated) VALUES (?, ?, ?, ?) 
                     ON CONFLICT(emoji_id) DO UPDATE SET emoji_name = excluded.emoji_name, emoji_format = excluded.emoji_format`,
                    [emoji.id, emoji.name, emoji.format, emoji.animated],
                );
            }
            logger.info(`😃 Stored ${emojis.length} emojis.`);

            // ✅ Fetch & Store Members
            await guild.members.fetch();
            const members = guild.members.cache.map((member) => ({
                id: member.id,
                username: normalizeKey(member.user.username, 'member', existingKeys),
            }));

            for (const member of members) {
                await runQuery(
                    `INSERT INTO guild_members (user_id, username) VALUES (?, ?) 
                     ON CONFLICT(user_id) DO UPDATE SET username = excluded.username`,
                    [member.id, member.username],
                );
            }
            logger.info(`👥 Stored ${members.length} members.`);

            // ✅ Fetch & Store Webhooks
            // ✅ Fetch & Store Webhooks
            const webhooks = await guild.fetchWebhooks();

            // Fetch existing webhook names to prevent duplicates
            const existingWebhookNames = new Set((await getAll('SELECT webhook_name FROM guild_webhooks WHERE channel_id = ?', [guild.id]))?.map((row) => row.webhook_name) || []);

            // Normalize webhook names and store them
            const webhookEntries = webhooks.map((webhook) => {
                const webhookName = webhook.name ? normalizeKey(webhook.name, 'webhook', existingWebhookNames) : normalizeKey(guild.name, 'webhook', existingWebhookNames); // If no name, use the guild name

                return {
                    id: webhook.id,
                    name: webhookName,
                    url: webhook.url,
                    channelId: webhook.channelId || 'Unknown',
                };
            });

            for (const webhook of webhookEntries) {
                await runQuery(
                    `INSERT INTO guild_webhooks (webhook_key, webhook_name, webhook_url, channel_id) VALUES (?, ?, ?, ?) 
         ON CONFLICT(webhook_key) DO UPDATE SET webhook_name = excluded.webhook_name, webhook_url = excluded.webhook_url, channel_id = excluded.channel_id`,
                    [webhook.id, webhook.name, webhook.url, webhook.channelId],
                );
            }
            logger.info(`📡 Stored ${webhookEntries.length} webhooks.`);

            // ✅ Cleanup Deleted Items
            await cleanupDeletedItems(new Set(channels.map((c) => c.id)), 'guild_channels', 'channel_id');
            await cleanupDeletedItems(new Set(roles.map((r) => r.id)), 'guild_roles', 'role_id');
            await cleanupDeletedItems(new Set(emojis.map((e) => e.id)), 'guild_emojis', 'emoji_id');
            await cleanupDeletedItems(new Set(members.map((m) => m.id)), 'guild_members', 'user_id');
            await cleanupDeletedItems(new Set(webhookEntries.map((w) => w.id)), 'guild_webhooks', 'webhook_key');

            // ✅ Send Confirmation Embed
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
        }
    },
};
