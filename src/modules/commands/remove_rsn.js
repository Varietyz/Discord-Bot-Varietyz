// @ts-nocheck
/**
 * @fileoverview Defines the `/remove_rsn` slash command for the Varietyz Bot.
 * This command allows users to remove up to three registered RuneScape Names (RSNs) from their account.
 * It includes validation, rate limiting, database interactions, and an autocomplete feature for RSN suggestions.
 *
 * Core Features:
 * - Removes up to three RSNs from the user's account.
 * - Rate limiting to prevent command abuse.
 * - Confirmation prompt before RSN removal.
 * - Autocomplete for RSN suggestions based on user input.
 * - Database updates to ensure successful removal of RSNs.
 *
 * External Dependencies:
 * - **Discord.js**: For handling slash commands, creating buttons, and managing interactive components.
 * - **SQLite**: For managing registered RSN data in the database.
 *
 * @module modules/commands/remove_rsn
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../utils/logger');
const { runQuery, getAll } = require('../utils/dbUtils'); // Importing dbUtils functions
const { normalizeRsn } = require('../utils/normalizeRsn'); // Importing normalizeRsn function

const RATE_LIMIT = 5;
const RATE_LIMIT_DURATION = 60 * 1000;
const rateLimitMap = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove_rsn')
        .setDescription('Remove up to three registered RSNs from your list')
        .addStringOption((option) => option.setName('1st').setDescription('The first RSN you want to remove').setRequired(true).setAutocomplete(true))
        .addStringOption((option) => option.setName('2nd').setDescription('The second RSN you want to remove (optional)').setAutocomplete(true))
        .addStringOption((option) => option.setName('3rd').setDescription('The third RSN you want to remove (optional)').setAutocomplete(true)),

    /**
     * Executes the `/remove_rsn` command, allowing users to remove up to three RSNs from their account.
     * Handles validation, rate limiting, database interactions, and user feedback.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the command execution.
     * @returns {Promise<void>} Resolves when the command has been fully executed.
     */
    async execute(interaction) {
        try {
            const rsnsToRemove = [interaction.options.getString('3rd'), interaction.options.getString('2nd'), interaction.options.getString('1st')].filter(Boolean); // Filter out null/undefined values

            const userID = interaction.user.id;
            const currentTime = Date.now();
            const userData = rateLimitMap.get(userID) || {
                count: 0,
                firstRequest: currentTime,
            };

            if (currentTime - userData.firstRequest < RATE_LIMIT_DURATION) {
                if (userData.count >= RATE_LIMIT) {
                    const retryAfter = Math.ceil((RATE_LIMIT_DURATION - (currentTime - userData.firstRequest)) / 1000);
                    return await interaction.reply({
                        content: `🚫 You're using this command too frequently. Please wait \`${retryAfter}\` second(s) before trying again. ⏳`,
                        flags: 64,
                    });
                }
                userData.count += 1;
            } else {
                userData.count = 1;
                userData.firstRequest = currentTime;
            }

            rateLimitMap.set(userID, userData);

            setTimeout(() => rateLimitMap.delete(userID), RATE_LIMIT_DURATION);

            logger.info(`User ${userID} attempting to remove RSNs: ${rsnsToRemove.join(', ')}`);

            const userRSNs = await getAll('SELECT rsn FROM registered_rsn WHERE user_id = ?', [userID]);

            if (!userRSNs.length) {
                return await interaction.reply({
                    content: '⚠️ You have no registered RSNs. Please register an RSN first to use this command. 📝',
                    flags: 64,
                });
            }

            const normalizedUserRSNs = userRSNs.map((row) => normalizeRsn(row.rsn));

            const validRSNs = rsnsToRemove.filter((rsn) => normalizedUserRSNs.includes(normalizeRsn(rsn)));

            if (validRSNs.length === 0) {
                return await interaction.reply({
                    content: '⚠️ None of the provided RSNs were found in your account. Please check and try again.',
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
                        await runQuery('DELETE FROM registered_rsn WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, \'-\', \' \'), \'_\', \' \')) = ?', [userID, normalizeRsn(rsn)]);
                    }

                    logger.info(`User ${userID} successfully removed RSNs: ${validRSNs.join(', ')}`);
                    await i.update({
                        content: `✅ The following RSNs have been successfully removed from your account:\n${validRSNs.map((rsn) => `- \`${rsn}\``).join('\n')}`,
                        components: [],
                        flags: 64,
                    });
                } else if (i.customId === 'cancel_removersn') {
                    await i.update({
                        content: '❌ RSN removal has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await interaction.editReply({
                        content: '⌛ Confirmation timed out. RSN removal has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });
        } catch (error) {
            logger.error(`Error executing /removersn command: ${error.message}`);
            await interaction.reply({
                content: '❌ An error occurred while processing your request. Please try again later. 🛠️',
                flags: 64,
            });
        }
    },

    /**
     * Handles the autocomplete functionality for RSN options in the `/remove_rsn` command.
     *
     * @async
     * @function autocomplete
     * @param {Discord.AutocompleteInteraction} interaction - The interaction object for the autocomplete event.
     * @returns {Promise<void>} Resolves when autocomplete suggestions have been sent.
     */
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const userID = interaction.user.id;

        try {
            const normalizedInput = normalizeRsn(focusedOption.value);
            const rsnsResult = await getAll('SELECT rsn FROM registered_rsn WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, \'-\', \' \'), \'_\', \' \')) LIKE ?', [userID, `%${normalizedInput}%`]);

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
            logger.error(`Error in autocomplete for /remove_rsn: ${error.message}`);
            await interaction.respond([]);
        }
    },
};
