// @ts-nocheck
/**
 * @fileoverview Defines the `/removersn` slash command for the Varietyz Bot.
 * This command allows users to remove up to three registered RuneScape Names (RSNs) from their account.
 * It includes validation, rate limiting, database interactions, and an autocomplete feature for RSN suggestions.
 *
 * @module modules/commands/removersn
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const { runQuery, getAll } = require('../../utils/dbUtils'); // Importing dbUtils functions
const { normalizeRsn } = require('../../utils/normalizeRsn'); // Importing normalizeRsn function

// Rate Limiting Configuration
const RATE_LIMIT = 5; // Maximum number of allowed attempts
const RATE_LIMIT_DURATION = 60 * 1000; // Time window in milliseconds (e.g., 1 minute)
const rateLimitMap = new Map(); // Map to track user requests

/**
 * Defines the `/remove_rsn` slash command using Discord's SlashCommandBuilder.
 *
 * @constant {SlashCommandBuilder}
 * @example
 * // This command can be registered with Discord's API
 * const removersnCommand = module.exports.data;
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove_rsn')
        .setDescription('Remove up to three registered RSNs from your list')
        .addStringOption((option) =>
            option
                .setName('1st')
                .setDescription('The first RSN you want to remove')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption((option) =>
            option
                .setName('2nd')
                .setDescription('The second RSN you want to remove (optional)')
                .setAutocomplete(true)
        )
        .addStringOption((option) =>
            option
                .setName('3rd')
                .setDescription('The third RSN you want to remove (optional)')
                .setAutocomplete(true)
        ),

    /**
     * Executes the `/removersn` command, allowing users to remove up to three RSNs from their account.
     * It handles validation, rate limiting, database interactions, and provides feedback to the user.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the command execution.
     * @returns {Promise<void>} - Resolves when the command has been executed.
     * @example
     * // Handler in your bot's command execution logic
     * if (commandName === 'remove_rsn') {
     * await commands.removersn.execute(interaction);
     * }
     */
    async execute(interaction) {
        try {
            // Extract RSNs to remove from the interaction options
            const rsnsToRemove = [
                interaction.options.getString('3rd'),
                interaction.options.getString('2nd'),
                interaction.options.getString('1st')
            ].filter(Boolean); // Filter out null/undefined values

            const userID = interaction.user.id;
            const currentTime = Date.now();
            const userData = rateLimitMap.get(userID) || {
                count: 0,
                firstRequest: currentTime
            };

            // Rate Limiting Check
            if (currentTime - userData.firstRequest < RATE_LIMIT_DURATION) {
                if (userData.count >= RATE_LIMIT) {
                    const retryAfter = Math.ceil(
                        (RATE_LIMIT_DURATION -
                            (currentTime - userData.firstRequest)) /
                            1000
                    );
                    return await interaction.reply({
                        content: `🚫 You're using this command too frequently. Please wait \`${retryAfter}\` second(s) before trying again. ⏳`,
                        flags: 64
                    });
                }
                userData.count += 1;
            } else {
                userData.count = 1;
                userData.firstRequest = currentTime;
            }

            rateLimitMap.set(userID, userData);

            // Schedule removal of the user's rate limit data after RATE_LIMIT_DURATION
            setTimeout(() => rateLimitMap.delete(userID), RATE_LIMIT_DURATION);

            logger.info(
                `User ${userID} attempting to remove RSNs: ${rsnsToRemove.join(', ')}`
            );

            // Fetch all RSNs registered to the user
            const userRSNs = await getAll(
                'SELECT rsn FROM registered_rsn WHERE user_id = ?',
                [userID]
            );

            // If no RSNs are registered, inform the user
            if (!userRSNs.length) {
                return await interaction.reply({
                    content:
                        '⚠️ You have no registered RSNs. Please register an RSN first to use this command. 📝',
                    flags: 64
                });
            }

            const normalizedUserRSNs = userRSNs.map((row) =>
                normalizeRsn(row.rsn)
            );

            // Filter RSNs that are valid for removal
            const validRSNs = rsnsToRemove.filter((rsn) =>
                normalizedUserRSNs.includes(normalizeRsn(rsn))
            );

            if (validRSNs.length === 0) {
                return await interaction.reply({
                    content:
                        '⚠️ None of the provided RSNs were found in your account. Please check and try again.',
                    flags: 64
                });
            }

            // Confirmation prompt
            const confirmationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_removersn')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_removersn')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({
                content: `⚠️ **Confirmation Required**\nYou are about to remove the following RSNs from your account:\n${validRSNs.map((rsn) => `- \`${rsn}\``).join('\n')}\n\nClick **Confirm** to proceed or **Cancel** to abort.`,
                components: [confirmationRow],
                flags: 64
            });

            const filter = (i) => i.user.id === interaction.user.id;
            const collector =
                interaction.channel.createMessageComponentCollector({
                    filter,
                    time: 15000,
                    max: 1
                });

            collector.on('collect', async (i) => {
                if (i.customId === 'confirm_removersn') {
                    // Proceed with RSN removal
                    for (const rsn of validRSNs) {
                        await runQuery(
                            'DELETE FROM registered_rsn WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, \'-\', \' \'), \'_\', \' \')) = ?',
                            [userID, normalizeRsn(rsn)]
                        );
                    }

                    logger.info(
                        `User ${userID} successfully removed RSNs: ${validRSNs.join(', ')}`
                    );
                    await i.update({
                        content: `✅ The following RSNs have been successfully removed from your account:\n${validRSNs.map((rsn) => `- \`${rsn}\``).join('\n')}`,
                        components: [],
                        flags: 64
                    });
                } else if (i.customId === 'cancel_removersn') {
                    await i.update({
                        content: '❌ RSN removal has been canceled.',
                        components: [],
                        flags: 64
                    });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await interaction.editReply({
                        content:
                            '⌛ Confirmation timed out. RSN removal has been canceled.',
                        components: [],
                        flags: 64
                    });
                }
            });
        } catch (error) {
            logger.error(
                `Error executing /removersn command: ${error.message}`
            );
            await interaction.reply({
                content:
                    '❌ An error occurred while processing your request. Please try again later. 🛠️',
                flags: 64
            });
        }
    },
    /**
     * Handles the autocomplete functionality for RSN options in the `/removersn` command.
     * Suggests RSNs that the user has registered and match the current input.
     *
     * @async
     * @function autocomplete
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the autocomplete event.
     * @returns {Promise<void>} - Resolves when autocomplete suggestions have been sent.
     * @example
     * // Handler in your bot's command execution logic
     * if (commandName === 'removersn') {
     * await commands.removersn.autocomplete(interaction);
     * }
     */
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const userID = interaction.user.id;

        try {
            const normalizedInput = normalizeRsn(focusedOption.value);
            const rsnsResult = await getAll(
                'SELECT rsn FROM registered_rsn WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, \'-\', \' \'), \'_\', \' \')) LIKE ?',
                [userID, `%${normalizedInput}%`]
            );

            const choices = rsnsResult.map((row) => ({
                name: row.rsn,
                value: row.rsn
            }));

            // Handle the autocomplete for each option dynamically
            if (focusedOption.name === '1st') {
                await interaction.respond(choices.slice(0, 25)); // Provide suggestions for the first RSN
            } else if (focusedOption.name === '2nd') {
                const firstRsn = interaction.options.getString('1st');
                const filteredChoices = choices.filter(
                    (choice) => choice.value !== firstRsn
                );
                await interaction.respond(filteredChoices.slice(0, 25)); // Exclude the first RSN
            } else if (focusedOption.name === '3rd') {
                const firstRsn = interaction.options.getString('1st');
                const secondRsn = interaction.options.getString('2nd');
                const filteredChoices = choices.filter(
                    (choice) =>
                        choice.value !== firstRsn && choice.value !== secondRsn
                );
                await interaction.respond(filteredChoices.slice(0, 25)); // Exclude the first and second RSNs
            }
        } catch (error) {
            logger.error(
                `Error in autocomplete for /remove_rsn: ${error.message}`
            );
            await interaction.respond([]);
        }
    }
};
