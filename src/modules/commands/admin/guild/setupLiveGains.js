const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
const { ensureLiveGainsCategory } = require('../../../utils/essentials/ensureLiveGainsCategory');

async function ensureWebhookAssignment(compType, channel, guild) {
    try {
        const webhookMapping = {
            clanchat_channel: { key: 'webhook_osrs_clan_chat', name: '💬OSRS | Clan Chat' },
            clue_scrolls_channel: { key: 'webhook_osrs_clue_scroll_completed', name: '📜OSRS | Clue scroll completed' },
            collection_log_channel: { key: 'webhook_osrs_collectable_registered', name: '📖OSRS | Collectable registered' },
            deaths_channel: { key: 'webhook_osrs_deceased', name: '💀OSRS | Deceased' },
            levels_channel: { key: 'webhook_osrs_level_achieved', name: '📊OSRS | Level achieved' },
            drops_channel: { key: 'webhook_osrs_received_drop', name: '💰OSRS | Received drop' },
            pets_channel: { key: 'webhook_osrs_adopted_a_pet', name: '🐶OSRS | Adopted a pet' },
            quests_channel: { key: 'webhook_osrs_quest_completed', name: '🧭OSRS | Quest completed' },
        };
        const desired = webhookMapping[compType];
        if (!desired) return logger.warn(`⚠️ No webhook mapping found for ${compType}`);
        if (!channel.permissionsFor(guild.client.user).has(PermissionsBitField.Flags.ManageWebhooks)) {
            logger.warn(`⚠️ Missing Manage Webhooks permission in channel ${channel.id}`);
            return;
        }
        let webhook;
        const dbWebhook = await db.guild.getOne('SELECT webhook_id, webhook_url, channel_id FROM guild_webhooks WHERE webhook_key = ?', [desired.key]);
        const channelWebhooks = await channel.fetchWebhooks();
        const correctWebhook = channelWebhooks.find((w) => w.url === dbWebhook?.webhook_url);
        if (dbWebhook && dbWebhook.channel_id !== channel.id) {
            logger.info(`🔄 Reassigning webhook ${dbWebhook.webhook_id} from channel ${dbWebhook.channel_id} to ${channel.id}`);
            try {
                const oldChannel = guild.channels.cache.get(dbWebhook.channel_id);
                if (oldChannel) {
                    const oldWebhooks = await oldChannel.fetchWebhooks();
                    const existingWebhook = oldWebhooks.get(dbWebhook.webhook_id);
                    if (existingWebhook) {
                        webhook = await existingWebhook.edit({
                            channel: channel.id,
                            reason: 'Reassigning webhook to correct channel',
                        });
                        logger.info(`✅ Successfully moved webhook ${webhook.id} to channel ${channel.id}`);
                    }
                }
            } catch (err) {
                logger.warn(`⚠️ Failed to move existing webhook: ${err.message}`);
            }
        }
        if (!webhook && correctWebhook) {
            webhook = correctWebhook;
            logger.info(`✅ Found existing webhook ${webhook.id} already in the correct channel.`);
        }
        if (!webhook) {
            webhook = await channel.createWebhook({
                name: desired.name,
                avatar: guild.client.user.displayAvatarURL(),
            });
            logger.info(`✅ Created new webhook ${webhook.name} in channel #${channel.name} (ID: ${channel.id})`);
        }
        await db.guild.runQuery(
            `INSERT INTO guild_webhooks (webhook_key, webhook_id, webhook_url, channel_id)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(webhook_key) DO UPDATE
             SET webhook_id = excluded.webhook_id,
                 webhook_url = excluded.webhook_url,
                 channel_id = excluded.channel_id`,
            [desired.key, webhook.id, webhook.url, channel.id],
        );
        logger.info(`📌 Webhook ${webhook.id} successfully linked to key ${desired.key} in channel ${channel.id}`);
        if (compType === 'clanchat_channel') {
            try {
                await db.runQuery(
                    `UPDATE clanchat_config
                     SET channel_id = ?, webhook_url = ?`,
                    [channel.id, webhook.url],
                );
                logger.info(`✅ clanchat_config updated with channel ${channel.id} and webhook ${webhook.url}`);
            } catch (updateError) {
                logger.error(`❌ Failed to update clanchat_config: ${updateError.message}`);
            }
        }
    } catch (error) {
        logger.error(`❌ Error ensuring webhook assignment for ${compType}: ${error.message}`);
    }
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('live_gains')
        .setDescription('ADMIN: Manage Live-gains channels')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand((subcommand) =>
            subcommand
                .setName('change')
                .setDescription('ADMIN: Assign a setup channel.')
                .addStringOption((option) => option.setName('assign').setDescription('Assign the channel\'s type.').setRequired(true).setAutocomplete(true))
                .addChannelOption((option) => option.setName('channel').setDescription('The Discord channel to assign.').setRequired(true)),
        )
        .addSubcommand((subcommand) => subcommand.setName('list').setDescription('ADMIN: View all assigned basic channels.'))
        .addSubcommand((subcommand) => subcommand.setName('setup').setDescription('ADMIN: Automatically generate all basic channels.'))
        .addSubcommand((subcommand) => subcommand.setName('remove_all').setDescription('ADMIN: Remove all basic channels and clear database entries.')),
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'change') {
                const compType = interaction.options.getString('assign');
                const channel = interaction.options.getChannel('channel');
                if (!channel || !channel.isTextBased()) {
                    return await interaction.reply({
                        content: '❌ **Invalid Channel:** Please select a text-based channel.',
                        flags: 64,
                    });
                }
                const channelRow = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', [compType]);
                const currentChannelId = channelRow?.channel_id || null;
                if (currentChannelId === channel.id) {
                    return await interaction.reply({
                        content: `⚠️ **${channel.name}** is already set for \`${compType}\`.`,
                        flags: 64,
                    });
                }
                await db.guild.runQuery('INSERT INTO ensured_channels (channel_key, channel_id) VALUES (?, ?) ON CONFLICT(channel_key) DO UPDATE SET channel_id = ?', [compType, channel.id, channel.id]);
                await ensureWebhookAssignment(compType, channel, interaction.guild);
                logger.info(`✅ Channel for '${compType}' set to #${channel.name} (${channel.id}).`);
                if (compType === 'clanchat_channel') {
                    const registerButton = new ButtonBuilder().setCustomId('open_register_clanchat_modal').setLabel('New Registry (Optional)').setStyle(ButtonStyle.Primary);
                    const buttonRow = new ActionRowBuilder().addComponents(registerButton);
                    return await interaction.reply({
                        content: `✅ **Success:** The channel for \`${compType}\` has been updated to <#${channel.id}>.\n\nClick the button below if you need to register a new secret key and clan name.`,
                        components: [buttonRow],
                        flags: 64,
                    });
                } else {
                    return await interaction.reply({
                        content: `✅ **Success:** The channel for \`${compType}\` has been updated to <#${channel.id}>.`,
                        flags: 64,
                    });
                }
            } else if (subcommand === 'list') {
                const logChannels = await db.guild.getAll('SELECT channel_key, channel_id FROM ensured_channels');
                if (logChannels.length === 0) {
                    return await interaction.reply({
                        content: '📜 **No basic channels are currently assigned.** Use `/live_gains set` to configure them.',
                        flags: 64,
                    });
                }
                const embed = new EmbedBuilder()
                    .setTitle('📋 Assigned Live Gain Channels')
                    .setColor(0x3498db)
                    .setDescription(logChannels.map((row) => `🔹 **\`${row.channel_key}\`** → <#${row.channel_id}>`).join('\n'))
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], flags: 64 });
            } else if (subcommand === 'setup') {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: 64 });
                }
                try {
                    await ensureLiveGainsCategory(interaction.guild);
                    const assignedChannels = await db.guild.getAll('SELECT channel_key, channel_id FROM ensured_channels');
                    for (const { channel_key, channel_id } of assignedChannels) {
                        const channel = interaction.guild.channels.cache.get(channel_id);
                        if (channel) {
                            await ensureWebhookAssignment(channel_key, channel, interaction.guild);
                        }
                    }
                    logger.info('✅ Successfully generated basic channels.');
                    return await interaction.editReply({
                        content: '✅ **Success:** Competition channels have been generated successfully.',
                    });
                } catch (error) {
                    logger.error(`❌ Error generating basic channels: ${error.message}`);
                    return await interaction.editReply({
                        content: '❌ **Error:** Failed to generate basic channels. Please check the logs for details.',
                    });
                }
            } else if (subcommand === 'remove_all') {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: 64 });
                }
                try {
                    const logChannels = await db.guild.getAll('SELECT channel_id FROM ensured_channels');
                    const loggingCategory = interaction.guild.channels.cache.find((ch) => ch.type === ChannelType.GuildCategory && ch.name === '🌐 ‣ LIVE GAINS');
                    if (logChannels.length === 0 && !loggingCategory) {
                        return await interaction.editReply({
                            content: '📜 **No basic channels or categories exist to remove.',
                        });
                    }
                    for (const { channel_id } of logChannels) {
                        const channelToDelete = interaction.guild.channels.cache.get(channel_id);
                        if (channelToDelete) {
                            await channelToDelete.delete().catch((err) => logger.warn(`⚠️ Failed to delete channel ${channelToDelete.id}: ${err.message}`));
                        }
                    }
                    await db.guild.runQuery('DELETE FROM ensured_channels');
                    if (loggingCategory) {
                        await loggingCategory.delete().catch((err) => logger.warn(`⚠️ Failed to delete logging category: ${err.message}`));
                    }
                    logger.info('🗑️ Successfully removed all basic channels and the category.');
                    return await interaction.editReply({
                        content: '🗑️ **Success:** All basic channels and the category have been removed, and the database has been cleared.',
                    });
                } catch (error) {
                    logger.error(`❌ Error removing basic channels: ${error.message}`);
                    return await interaction.editReply({
                        content: '❌ **Error:** Failed to remove basic channels. Please check the logs for details.',
                    });
                }
            }
        } catch (error) {
            logger.error(`❌ Error executing /live_gains command: ${error.message}`);
            return await interaction.reply({
                content: '❌ **Error:** An error occurred while processing your request.',
                flags: 64,
            });
        }
    },
    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);
            if (focusedOption.name === 'assign') {
                const compTypes = ['clanchat_channel', 'clue_scrolls_channel', 'collection_log_channel', 'deaths_channel', 'levels_channel', 'drops_channel', 'pets_channel', 'quests_channel'];
                const filtered = compTypes.filter((type) => type.toLowerCase().includes(focusedOption.value.toLowerCase()));
                return await interaction.respond(filtered.map((type) => ({ name: type, value: type })).slice(0, 25));
            }
            if (focusedOption.name === 'channel') {
                if (!interaction.guild) return await interaction.respond([]);
                const suggestions = interaction.guild.channels.cache.filter((ch) => ch.isTextBased() && ch.name.toLowerCase().includes(focusedOption.value.toLowerCase())).map((ch) => ({ name: ch.name, value: ch.id }));
                return await interaction.respond(suggestions.slice(0, 25));
            }
            return await interaction.respond([]);
        } catch (error) {
            logger.error(`❌ Error in autocomplete for /live_gains: ${error.message}`);
            return await interaction.respond([]);
        }
    },
};
