const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, EmbedBuilder, PermissionsBitField } = require('discord.js');

const logger = require('../../../utils/essentials/logger');
const db = require('../../../utils/essentials/dbUtils');
const { ensureAllChannels } = require('../../../utils/essentials/ensureChannels');

const { getOne, getAll, runQuery } = db.guild;

const liveGainsMapping = {
    clanchat_channel: { key: 'webhook_osrs_clan_chat', name: '💬OSRS | Clan Chat' },
    clue_scrolls_channel: { key: 'webhook_osrs_clue_scroll_completed', name: '📜OSRS | Clue scroll completed' },
    collection_log_channel: { key: 'webhook_osrs_collectable_registered', name: '📖OSRS | Collectable registered' },
    deaths_channel: { key: 'webhook_osrs_deceased', name: '💀OSRS | Deceased' },
    levels_channel: { key: 'webhook_osrs_level_achieved', name: '📊OSRS | Level achieved' },
    drops_channel: { key: 'webhook_osrs_received_drop', name: '💰OSRS | Received drop' },
    pets_channel: { key: 'webhook_osrs_adopted_a_pet', name: '🐶OSRS | Adopted a pet' },
    quests_channel: { key: 'webhook_osrs_quest_completed', name: '🧭OSRS | Quest completed' },
};

async function ensureWebhookAssignment(guild, channelKey, channel) {
    try {
        const desired = liveGainsMapping[channelKey];
        if (!desired) return; 

        if (!channel.permissionsFor(guild.client.user)?.has(PermissionsBitField.Flags.ManageWebhooks)) {
            logger.warn(`⚠️ Bot lacks ManageWebhooks in #${channel.name}`);
            return;
        }

        const existing = await getOne('SELECT webhook_id, webhook_url, channel_id FROM guild_webhooks WHERE webhook_key = ?', [desired.key]);

        const whs = await channel.fetchWebhooks();
        let webhook = existing ? whs.find((w) => w.url === existing.webhook_url) : null;

        if (!webhook && existing?.channel_id && existing.channel_id !== channel.id) {
            const oldChan = guild.channels.cache.get(existing.channel_id);
            if (oldChan) {
                const oldWHs = await oldChan.fetchWebhooks();
                const oldW = oldWHs.get(existing.webhook_id);
                if (oldW) {
                    try {
                        webhook = await oldW.edit({
                            channel: channel.id,
                            reason: 'Reassigning live gains webhook',
                        });
                        logger.info(`✅ Moved webhook ${webhook.id} to #${channel.name}`);
                    } catch (err) {
                        logger.warn(`⚠️ Could not move webhook: ${err.message}`);
                    }
                }
            }
        }

        if (!webhook) {
            webhook = await channel.createWebhook({
                name: desired.name,
                avatar: guild.client.user.displayAvatarURL(),
            });
            logger.info(`✅ Created webhook in #${channel.name}`);
        }

        await runQuery(
            `INSERT INTO guild_webhooks (webhook_key, webhook_id, webhook_url, channel_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(webhook_key) DO UPDATE
         SET webhook_id = excluded.webhook_id,
             webhook_url = excluded.webhook_url,
             channel_id = excluded.channel_id`,
            [desired.key, webhook.id, webhook.url, channel.id],
        );

        if (channelKey === 'clanchat_channel') {
            await db.runQuery('UPDATE clanchat_config SET channel_id = ?, webhook_url = ?', [channel.id, webhook.url]);
            logger.info(`✅ Updated clanchat_config to #${channel.name}`);
        }
    } catch (error) {
        logger.error(`❌ Error ensuring webhook for ${channelKey}: ${error.message}`);
    }
}

const categories = {
    basic: ['clan_members_channel', 'name_change_channel', 'auto_roles_channel', 'activity_voice_channel'],
    bingo: ['bingo_notification_channel', 'bingo_card_channel', 'bingo_leaderboard_channel', 'bingo_patterns_channel'],
    competition: ['top_10_channel', 'results_channel', 'botw_channel', 'sotw_channel', 'notif_channel'],
    live_gains: ['clanchat_channel', 'clue_scrolls_channel', 'collection_log_channel', 'deaths_channel', 'levels_channel', 'drops_channel', 'pets_channel', 'quests_channel'],
    logging: [
        'transcripts',
        'moderation_logs',
        'message_logs',
        'member_logs',
        'role_logs',
        'server_logs',
        'channel_logs',
        'voice_logs',
        'invite_logs',
        'thread_logs',
        'reacted_logs',
        'event_logs',
        'stage_logs',
        'boost_logs',
        'bot_logs',
        'database_logs',
        'critical_alerts',
    ],
};

const allKeys = Object.values(categories).flat();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channels')
        .setDescription('ADMIN: Unified channel management (setup, remove, change, list).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand((sub) =>
            sub
                .setName('setup')
                .setDescription('Create missing channels for a specific category or all.')
                .addStringOption((opt) => opt.setName('category').setDescription('Which category (basic/bingo/competition/live_gains/logging) or "all"?').setRequired(true).setAutocomplete(true)),
        )

        .addSubcommand((sub) =>
            sub
                .setName('remove_all')
                .setDescription('Delete channels (and DB entries) for a category or all.')
                .addStringOption((opt) => opt.setName('category').setDescription('Which category or "all"?').setRequired(true).setAutocomplete(true)),
        )

        .addSubcommand((sub) =>
            sub
                .setName('change')
                .setDescription('Manually assign a channel to a particular key.')
                .addStringOption((opt) => opt.setName('key').setDescription('Channel key.').setRequired(true).setAutocomplete(true))
                .addChannelOption((opt) => opt.setName('channel').setDescription('Which channel to assign?').setRequired(true)),
        )

        .addSubcommand((sub) =>
            sub
                .setName('list')
                .setDescription('List all assigned channels (optionally by category).')
                .addStringOption((opt) => opt.setName('category').setDescription('Which category or empty for all?').setRequired(false).setAutocomplete(true)),
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand(true);

        try {
            if (subcommand === 'setup') {

                await interaction.deferReply({ flags: 64 });
                const category = interaction.options.getString('category', true);

                if (category === 'all') {
                    await ensureAllChannels(interaction.guild);

                    for (const key of categories.live_gains) {
                        const row = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', [key]);
                        if (row) {
                            const ch = interaction.guild.channels.cache.get(row.channel_id);
                            if (ch) await ensureWebhookAssignment(interaction.guild, key, ch);
                        }
                    }
                    return interaction.editReply('✅ Created **all** channels from config.');
                }

                await ensureAllChannels(interaction.guild);

                if (category === 'live_gains') {
                    for (const key of categories.live_gains) {
                        const row = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', [key]);
                        if (row) {
                            const ch = interaction.guild.channels.cache.get(row.channel_id);
                            if (ch) await ensureWebhookAssignment(interaction.guild, key, ch);
                        }
                    }
                }

                return interaction.editReply(`✅ Setup complete for category: **${category}**.`);
            } else if (subcommand === 'remove_all') {
                await interaction.deferReply({ flags: 64 });
                const category = interaction.options.getString('category', true);

                if (category === 'all') {

                    const rows = await getAll('SELECT channel_id FROM ensured_channels');
                    for (const { channel_id } of rows) {
                        const c = interaction.guild.channels.cache.get(channel_id);
                        if (c) {
                            await c.delete().catch((err) => logger.warn(`Delete fail (#${c.id}): ${err.message}`));
                        }
                    }
                    await runQuery('DELETE FROM ensured_channels');
                    return interaction.editReply('🗑️ Removed **all** ensured channels + DB records.');
                }

                const catKeys = categories[category];
                if (!catKeys) {
                    return interaction.editReply(`❌ Unknown category \`${category}\``);
                }

                for (const key of catKeys) {
                    const row = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', [key]);
                    if (!row) continue;
                    const ch = interaction.guild.channels.cache.get(row.channel_id);
                    if (ch) {
                        await ch.delete().catch((err) => logger.warn(`Delete fail (#${ch.id}): ${err.message}`));
                    }
                    await runQuery('DELETE FROM ensured_channels WHERE channel_key = ?', [key]);
                }
                return interaction.editReply(`🗑️ Removed all channels in category: **${category}** + DB records.`);
            } else if (subcommand === 'change') {
                const key = interaction.options.getString('key', true);
                const channel = interaction.options.getChannel('channel', true);

                if (!channel.isTextBased()) {
                    return interaction.reply({
                        content: '❌ Please pick a text-based channel.',
                        flags: 64,
                    });
                }

                await runQuery(
                    `INSERT INTO ensured_channels (channel_key, channel_id)
           VALUES (?, ?)
           ON CONFLICT(channel_key) DO UPDATE SET channel_id = excluded.channel_id`,
                    [key, channel.id],
                );

                if (categories.live_gains.includes(key)) {
                    await ensureWebhookAssignment(interaction.guild, key, channel);
                }

                return interaction.reply({
                    content: `✅ Reassigned \`${key}\` → <#${channel.id}>.`,
                    flags: 64,
                });
            } else if (subcommand === 'list') {
                const category = interaction.options.getString('category');
                const allRows = await getAll('SELECT channel_key, channel_id FROM ensured_channels ORDER BY channel_key');
                if (allRows.length === 0) {
                    return interaction.reply({ content: 'No channels assigned yet.', flags: 64 });
                }

                let filtered = allRows;
                if (category && categories[category]) {
                    const catKeys = categories[category];
                    filtered = allRows.filter((r) => catKeys.includes(r.channel_key));
                    if (filtered.length === 0) {
                        return interaction.reply({
                            content: `No assigned channels found for category \`${category}\`.`,
                            flags: 64,
                        });
                    }
                }

                const lines = filtered.map((r) => `• **\`${r.channel_key}\`** → <#${r.channel_id}>`);
                const embed = new EmbedBuilder()
                    .setTitle(`Assigned Channels${category ? ` (${category})` : ''}`)
                    .setDescription(lines.join('\n'))
                    .setColor(0x3498db);

                return interaction.reply({ embeds: [embed], flags: 64 });
            }
        } catch (err) {
            logger.error(`❌ /channels ${subcommand} error: ${err.message}`);
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({
                    content: `❌ Error: ${err.message}`,
                    flags: 64,
                });
            } else {
                return interaction.editReply({
                    content: `❌ Error: ${err.message}`,
                });
            }
        }
    },

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        const value = focused.value.toLowerCase();

        if (focused.name === 'category') {
            const catChoices = Object.keys(categories).concat(['all']);
            const filtered = catChoices.filter((c) => c.toLowerCase().includes(value));
            return interaction.respond(filtered.map((c) => ({ name: c, value: c })));
        }

        if (focused.name === 'key') {
            const filtered = allKeys.filter((k) => k.toLowerCase().includes(value));
            return interaction.respond(filtered.map((k) => ({ name: k, value: k })));
        }

        return interaction.respond([]);
    },
};
