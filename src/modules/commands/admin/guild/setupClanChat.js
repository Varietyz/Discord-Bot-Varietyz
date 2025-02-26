const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const db = require('../../../utils/essentials/dbUtils');
const path = require('path');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup_clanchat')
        .setDescription('ADMIN: Set up or change the Clan Chat channel and ensure the webhook.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption((option) => option.setName('channel').setDescription('Select a channel to set as the Clan Chat').setRequired(true).addChannelTypes(ChannelType.GuildAnnouncement, ChannelType.GuildText)),
    async execute(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: 64 });
            }
            await db.runQuery('DELETE FROM modal_tracking WHERE registered_by = ? AND modal_key = ?', [interaction.user.id, 'open_register_clanchat_modal']);
            const newChannel = interaction.options.getChannel('channel');
            const channelRow = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['clanchat_channel']);
            const currentChannelId = channelRow?.channel_id || null;
            if (currentChannelId === newChannel.id) {
                return interaction.editReply({
                    content: `⚠️ **${newChannel.name}** is already set as the Clan Chat channel.`,
                });
            }
            let oldWebhookRow = null;
            if (currentChannelId) {
                oldWebhookRow = await db.guild.getOne('SELECT webhook_id, webhook_url FROM guild_webhooks WHERE webhook_key = ? AND channel_id = ?', ['webhook_osrs_clan_chat', currentChannelId]);
            }
            if (oldWebhookRow) {
                const confirmDeleteButton = new ButtonBuilder().setCustomId('confirm_delete_webhook').setLabel('✅ Continue (Move Webhook)').setStyle(ButtonStyle.Danger);
                const skipDeleteButton = new ButtonBuilder().setCustomId('skip_delete_webhook').setLabel('❌ Skip (Cancel Setup)').setStyle(ButtonStyle.Secondary);
                const buttonRow = new ActionRowBuilder().addComponents(confirmDeleteButton, skipDeleteButton);
                const confirmEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Move Old Webhook?')
                    .setDescription(
                        `An existing webhook was found for the <#${currentChannelId}> channel.\n\n` +
                            '**If you choose "Continue (Move Webhook)",** the webhook will be edited to target the new channel.\n\n' +
                            '**If you choose "Skip (Cancel Setup)",** no changes will be made at all.',
                    )
                    .setColor(0xffcc00)
                    .setTimestamp();
                const replyMsg = await interaction.editReply({
                    embeds: [confirmEmbed],
                    components: [buttonRow],
                    flags: 64,
                });
                const collector = replyMsg.createMessageComponentCollector({
                    max: 1,
                    time: 15000,
                });
                collector.on('collect', async (btnInt) => {
                    if (btnInt.user.id !== interaction.user.id) {
                        return btnInt.reply({
                            content: '⚠️ You are not authorized to make this decision.',
                            flags: 64,
                        });
                    }
                    if (btnInt.customId === 'confirm_delete_webhook') {
                        await btnInt.reply({
                            content: '✅ Moving the webhook to the new channel...',
                            flags: 64,
                        });
                        await finalizeClanChatSetup(interaction, newChannel, currentChannelId, oldWebhookRow, true);
                    } else {
                        await btnInt.reply({
                            content: '❌ Setup canceled. No changes were made.',
                            flags: 64,
                        });
                    }
                });
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        await interaction.editReply({
                            content: '❌ Setup timed out. No changes were made.',
                            embeds: [],
                            components: [],
                        });
                    }
                });
            } else {
                await finalizeClanChatSetup(interaction, newChannel, currentChannelId, null, false);
            }
        } catch (error) {
            logger.error(`Error in setup_clanchat command: ${error.message}`);
            await interaction.editReply({
                content: '❌ Error updating Clan Chat. Please check the logs.',
                components: [],
            });
        }
    },
};
/**
 *
 * @param interaction
 * @param newChannel
 * @param currentChannelId
 * @param oldWebhookRow
 * @param moveOldWebhook
 */
async function finalizeClanChatSetup(interaction, newChannel, currentChannelId, oldWebhookRow, moveOldWebhook) {
    if (currentChannelId) {
        await db.guild.runQuery('UPDATE ensured_channels SET channel_id = ? WHERE channel_key = ?', [newChannel.id, 'clanchat_channel']);
    } else {
        await db.guild.runQuery('INSERT INTO ensured_channels (channel_key, channel_id) VALUES (?, ?)', ['clanchat_channel', newChannel.id]);
    }
    logger.info(`Updated Clan Chat channel to: ${newChannel.name} (${newChannel.id})`);
    let webhook;
    if (moveOldWebhook && oldWebhookRow) {
        const oldChannel = interaction.guild.channels.cache.get(currentChannelId);
        if (!oldChannel) {
            throw new Error(`Could not find old channel ${currentChannelId} in cache to move webhook.`);
        }
        const oldWebhooks = await oldChannel.fetchWebhooks();
        const oldWebhook = oldWebhooks.get(oldWebhookRow.webhook_id);
        if (!oldWebhook) {
            throw new Error(`Old webhook not found in old channel. ID=${oldWebhookRow.webhook_id}`);
        }
        webhook = await oldWebhook.edit({
            channel: newChannel.id,
            reason: 'Moving Clan Chat webhook to new channel',
        });
        logger.info(`Moved existing webhook ${webhook.id} to new channel ${newChannel.id}`);
    } else {
        const avatarRow = await db.image.getOne('SELECT file_path FROM hook_avatars WHERE file_name = ?', ['cc_webhook_avatar']);
        const avatarPath = avatarRow ? path.join(__dirname, '../../../../../', avatarRow.file_path) : null;
        webhook = await newChannel.createWebhook({
            name: '💬OSRS | Clan Chat',
            avatar: avatarPath,
            reason: 'Auto-generated Clan Chat webhook',
        });
        logger.info(`Created new Clan Chat webhook: ${webhook.name} (${webhook.id})`);
    }
    await db.guild.runQuery(
        `INSERT INTO guild_webhooks (webhook_key, webhook_id, webhook_url, channel_id, webhook_name)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(webhook_key)
         DO UPDATE SET
            webhook_id   = excluded.webhook_id,
            webhook_url  = excluded.webhook_url,
            channel_id   = excluded.channel_id,
            webhook_name = excluded.webhook_name`,
        ['webhook_osrs_clan_chat', webhook.id, webhook.url, newChannel.id, webhook.name],
    );
    logger.info(`Upserted Clan Chat webhook ${webhook.id} for channel ${newChannel.id}`);
    if (oldWebhookRow) {
        await db.runQuery(
            `UPDATE clanchat_config
             SET channel_id = ?, webhook_url = ?
             WHERE channel_id = ? OR webhook_url = ?`,
            [newChannel.id, webhook.url, currentChannelId, oldWebhookRow.webhook_url],
        );
        logger.info(`Updated clanchat_config to use new channel_id=${newChannel.id} & webhook_url=${webhook.url}`);
    }
    const registerButton = new ButtonBuilder().setCustomId('open_register_clanchat_modal').setLabel('New Registry (Optional)').setStyle(ButtonStyle.Primary);
    const buttonRow = new ActionRowBuilder().addComponents(registerButton);
    const embed = new EmbedBuilder()
        .setTitle('✅ ClanChat Moved Channels')
        .setDescription(
            `The Clan Chat channel has been updated to **<#${newChannel.id}>**.\n\n` +
                (moveOldWebhook ? 'The existing webhook has been moved to the new channel.' : 'A new webhook has been created in this channel.') +
                '\n\nClick the button below if you need to register a new secret key and clan name',
        )
        .setColor(0x3498db)
        .setTimestamp();
    await interaction.editReply({
        content: '',
        embeds: [embed],
        components: [buttonRow],
    });
}
