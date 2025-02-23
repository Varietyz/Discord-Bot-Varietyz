const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/essentials/logger');
const { runQuery, getAll } = require('../../utils/essentials/dbUtils');
const { normalizeRsn } = require('../../utils/normalizing/normalizeRsn');
const RATE_LIMIT = 5;
const RATE_LIMIT_DURATION = 60 * 1000;
const rateLimitMap = new Map();
module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove_rsn')
        .setDescription('Remove up to three registered RSNs from your account')
        .addStringOption((option) => option.setName('1st').setDescription('The first RSN you want to remove').setRequired(true).setAutocomplete(true))
        .addStringOption((option) => option.setName('2nd').setDescription('The second RSN you want to remove (optional)').setAutocomplete(true))
        .addStringOption((option) => option.setName('3rd').setDescription('The third RSN you want to remove (optional)').setAutocomplete(true)),
    async execute(interaction) {
        try {
            const rsnsToRemove = [interaction.options.getString('3rd'), interaction.options.getString('2nd'), interaction.options.getString('1st')].filter(Boolean);
            const discordID = interaction.user.id;
            const currentTime = Date.now();
            const userData = rateLimitMap.get(discordID) || { count: 0, firstRequest: currentTime };
            if (currentTime - userData.firstRequest < RATE_LIMIT_DURATION) {
                if (userData.count >= RATE_LIMIT) {
                    const retryAfter = Math.ceil((RATE_LIMIT_DURATION - (currentTime - userData.firstRequest)) / 1000);
                    return await interaction.reply({
                        content: `🚫 **Rate Limit:** You're using this command too frequently. Please wait \`${retryAfter}\` second(s) before trying again. ⏳`,
                        flags: 64,
                    });
                }
                userData.count += 1;
            } else {
                userData.count = 1;
                userData.firstRequest = currentTime;
            }
            rateLimitMap.set(discordID, userData);
            setTimeout(() => rateLimitMap.delete(discordID), RATE_LIMIT_DURATION);
            logger.info(`🔍 User \`${discordID}\` attempting to remove RSNs: \`${rsnsToRemove.join(', ')}\`.`);
            const userRSNs = await getAll('SELECT rsn FROM registered_rsn WHERE discord_id = ?', [discordID]);
            if (!userRSNs.length) {
                return await interaction.reply({
                    content: '⚠️ **Notice:** You have no registered RSNs. Please register an RSN first to use this command. 📝',
                    flags: 64,
                });
            }
            const normalizedUserRSNs = userRSNs.map((row) => normalizeRsn(row.rsn));
            const validRSNs = rsnsToRemove.filter((rsn) => normalizedUserRSNs.includes(normalizeRsn(rsn)));
            if (validRSNs.length === 0) {
                return await interaction.reply({
                    content: '⚠️ **Notice:** None of the provided RSNs were found in your account. Please check your input and try again.',
                    flags: 64,
                });
            }
            const confirmationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_removersn').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_removersn').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
            );
            await interaction.reply({
                content: `⚠️ **Confirmation Required**\nYou are about to remove the following RSNs from your account:\n${validRSNs.map((rsn) => `- \`${rsn}\``).join('\n')}\n\nClick **Confirm** to proceed or **Cancel** to abort.`,
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
                if (i.customId === 'confirm_removersn') {
                    for (const rsn of validRSNs) {
                        await runQuery('DELETE FROM registered_rsn WHERE discord_id = ? AND LOWER(REPLACE(REPLACE(rsn, \'-\', \' \'), \'_\', \' \')) = ?', [discordID, normalizeRsn(rsn)]);
                    }
                    logger.info(`✅ User \`${discordID}\` successfully removed RSNs: \`${validRSNs.join(', ')}\`.`);
                    await i.update({
                        content: `✅ **Success:** The following RSNs have been removed from your account:\n${validRSNs.map((rsn) => `- \`${rsn}\``).join('\n')}`,
                        components: [],
                        flags: 64,
                    });
                } else if (i.customId === 'cancel_removersn') {
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
            logger.error(`❌ Error executing /remove_rsn command: ${error.message}`);
            await interaction.reply({
                content: '❌ **Error:** An error occurred while processing your request. Please try again later. 🛠️',
                flags: 64,
            });
        }
    },
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const discordID = interaction.user.id;
        try {
            const normalizedInput = normalizeRsn(focusedOption.value);
            const rsnsResult = await getAll('SELECT rsn FROM registered_rsn WHERE discord_id = ? AND LOWER(REPLACE(REPLACE(rsn, \'-\', \' \'), \'_\', \' \')) LIKE ?', [discordID, `%${normalizedInput}%`]);
            const choices = rsnsResult.map((row) => ({
                name: row.rsn,
                value: row.rsn,
            }));
            if (focusedOption.name === '1st') {
                await interaction.respond(choices.slice(0, 25));
            } else if (focusedOption.name === '2nd') {
                const firstRsn = interaction.options.getString('1st');
                const filteredChoices = choices.filter((choice) => choice.value !== firstRsn);
                await interaction.respond(filteredChoices.slice(0, 25));
            } else if (focusedOption.name === '3rd') {
                const firstRsn = interaction.options.getString('1st');
                const secondRsn = interaction.options.getString('2nd');
                const filteredChoices = choices.filter((choice) => choice.value !== firstRsn && choice.value !== secondRsn);
                await interaction.respond(filteredChoices.slice(0, 25));
            }
        } catch (error) {
            logger.error(`❌ Error in autocomplete for /remove_rsn: ${error.message}`);
            await interaction.respond([]);
        }
    },
};