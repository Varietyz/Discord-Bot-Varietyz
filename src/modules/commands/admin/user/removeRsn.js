const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const { runQuery, getAll } = require('../../../utils/essentials/dbUtils');
const { normalizeRsn } = require('../../../utils/normalizing/normalizeRsn');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_remove_rsn')
        .setDescription('ADMIN: Remove a registered RSN from a guild member.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption((option) => option.setName('target').setDescription('The guild member whose RSN you want to remove.').setRequired(true).setAutocomplete(true))
        .addStringOption((option) => option.setName('rsn').setDescription('The RSN to remove.').setRequired(true).setAutocomplete(true)),
    async execute(interaction) {
        try {
            const targetInput = interaction.options.getString('target');
            const rsnInput = interaction.options.getString('rsn');
            const guild = interaction.guild;
            if (!guild) {
                return await interaction.reply({
                    content: '❌ **Error:** This command can only be used within a guild.',
                    flags: 64,
                });
            }
            const targetUser = await guild.members.fetch(targetInput).catch(() => null);
            if (!targetUser) {
                return await interaction.reply({
                    content: '❌ **Error:** The specified target user could not be found. Please check the input.',
                    flags: 64,
                });
            }
            const targetUserID = targetUser.id;
            logger.info(`👮 Admin \`${interaction.user.id}\` initiated RSN removal for user \`${targetUserID}\`: "\`${rsnInput}\`"`);
            const userRSns = await getAll('SELECT rsn FROM registered_rsn WHERE discord_id = ?', [targetUserID]);
            if (!userRSns.length) {
                return await interaction.reply({
                    content: `⚠️ <@${targetUserID}> has no registered RSNs.`,
                    flags: 64,
                });
            }
            const normalizedUserRSns = userRSns.map((row) => normalizeRsn(row.rsn));
            const normalizedRsnInput = normalizeRsn(rsnInput);
            if (!normalizedUserRSns.includes(normalizedRsnInput)) {
                return await interaction.reply({
                    content: `⚠️ **Notice:** The RSN \`${rsnInput}\` is not registered for <@${targetUserID}>.`,
                    flags: 64,
                });
            }
            const confirmationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_remove_rsn').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_remove_rsn').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
            );
            await interaction.reply({
                content: `⚠️ **Confirmation Required**\nAre you sure you want to remove the RSN \`${rsnInput}\` from <@${targetUserID}>?`,
                components: [confirmationRow],
                flags: 64,
            });
            const filter = (i) => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 15000,
                max: 1,
            });
            collector.on('collect', async (i) => {
                if (i.customId === 'confirm_remove_rsn') {
                    await runQuery(
                        `
                        DELETE FROM registered_rsn
                        WHERE discord_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
                        `,
                        [targetUserID, normalizedRsnInput],
                    );
                    logger.info(`✅ RSN "\`${rsnInput}\`" removed from user \`${targetUserID}\` by admin \`${interaction.user.id}\`.`);
                    const removalEmbed = new EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle('❌ RSN Removed')
                        .setDescription(`Your RuneScape Name \`${rsnInput}\` has been removed from our records. ⚠️\n\nThis action was performed by: <@${interaction.user.id}>`)
                        .setFooter({ text: 'Varietyz Bot' })
                        .setTimestamp();
                    await targetUser.send({ embeds: [removalEmbed] }).catch(() => {
                        logger.warn(`⚠️ Failed to send RSN removal DM to user \`${targetUserID}\`.`);
                    });
                    await i.update({
                        content: `✅ **Success:** The RSN \`${rsnInput}\` has been successfully removed from <@${targetUserID}>.`,
                        components: [],
                        flags: 64,
                    });
                } else {
                    await i.update({
                        content: '❌ **Canceled:** RSN removal has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });
            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await interaction.editReply({
                        content: '⌛ **Timeout:** Confirmation timed out. RSN removal has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });
        } catch (error) {
            logger.error(`❌ Error executing /admin_remove_rsn command: ${error.message}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ **Error:** An error occurred while processing the command. Please try again later.',
                    flags: 64,
                });
            } else {
                await interaction.reply({
                    content: '❌ **Error:** An error occurred while processing the command. Please try again later.',
                    flags: 64,
                });
            }
        }
    },
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        try {
            if (focusedOption.name === 'target') {
                const input = focusedOption.value.toLowerCase();
                const rsnUsers = await getAll('SELECT DISTINCT discord_id FROM registered_rsn', []);
                const userIds = rsnUsers.map((row) => row.discord_id);
                const guild = interaction.guild;
                if (!guild) return await interaction.respond([]);
                const members = await guild.members.fetch({ user: userIds }).catch(() => new Map());
                const choices = await Promise.all(
                    Array.from(members.values()).map(async (member) => {
                        const discordId = member.user.id;
                        const username = member.user.username.toLowerCase();
                        const discriminator = member.user.discriminator.toLowerCase();
                        const tag = `${member.user.username}#${member.user.discriminator}`.toLowerCase();
                        const rsns = await getAll('SELECT rsn FROM registered_rsn WHERE discord_id = ?', [discordId]);
                        const normalizedRsns = rsns.map((row) => ({
                            original: row.rsn,
                            normalized: normalizeRsn(row.rsn),
                        }));
                        const matchingRsns = normalizedRsns.filter((rsn) => rsn.normalized.includes(input));
                        const rsnDisplay = matchingRsns.length > 0 ? matchingRsns.map((rsn) => rsn.original).join(', ') : 'No RSN matches';
                        if (username.includes(input) || discriminator.includes(input) || tag.includes(input) || discordId.includes(input) || matchingRsns.length > 0) {
                            return {
                                name: `${rsnDisplay} (${discordId}) - ${member.user.username}`,
                                value: discordId,
                            };
                        }
                        return null;
                    }),
                );
                await interaction.respond(choices.filter(Boolean).slice(0, 25));
            } else if (focusedOption.name === 'rsn') {
                const targetUserID = interaction.options.getString('target');
                if (!targetUserID) {
                    return await interaction.respond([]);
                }
                const rsnInput = focusedOption.value;
                const normalizedInput = normalizeRsn(rsnInput);
                const rsnsResult = await getAll(
                    `
                    SELECT rsn 
                    FROM registered_rsn 
                    WHERE discord_id = ? 
                    AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) LIKE ?`,
                    [targetUserID, `%${normalizedInput}%`],
                );
                const choices = rsnsResult.map((row) => ({
                    name: row.rsn,
                    value: row.rsn,
                }));
                await interaction.respond(choices.slice(0, 25));
            }
        } catch (error) {
            logger.error(`❌ Error in autocomplete for /admin_remove_rsn: ${error.message}`);
            await interaction.respond([]);
        }
    },
};