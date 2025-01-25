// @ts-nocheck
/**
 * @fileoverview Defines the `/removersn` slash command for the Varietyz Bot.
 * This command allows users to remove up to three registered RuneScape Names (RSNs) from their account.
 * It includes validation, rate limiting, database interactions, and an autocomplete feature for RSN suggestions.
 *
 * @module modules/commands/removersn
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const logger = require('../../utils/logger');
const { runQuery, getAll } = require('../../utils/dbUtils'); // Importing dbUtils functions
const { normalizeRsn } = require('../../utils/normalizeRsn'); // Importing normalizeRsn function

// Rate Limiting Configuration
const RATE_LIMIT = 5; // Maximum number of allowed attempts
const RATE_LIMIT_DURATION = 60 * 1000; // Time window in milliseconds (e.g., 1 minute)
const rateLimitMap = new Map(); // Map to track user requests

/**
 * Defines the `/removersn` slash command using Discord's SlashCommandBuilder.
 *
 * @constant {SlashCommandBuilder}
 * @example
 * // This command can be registered with Discord's API
 * const removersnCommand = module.exports.data;
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('removersn')
        .setDescription('Remove up to three registered RSNs from your list')
        .addStringOption((option) => option.setName('3rd').setDescription('The third RSN you want to remove (optional)').setAutocomplete(true))
        .addStringOption((option) => option.setName('2nd').setDescription('The second RSN you want to remove (optional)').setAutocomplete(true))
        .addStringOption((option) => option.setName('1st').setDescription('The first RSN you want to remove').setAutocomplete(true)),

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
     * if (commandName === 'removersn') {
     * await commands.removersn.execute(interaction);
     * }
     */
    async execute(interaction) {
        try {
            // Extract RSNs to remove from the interaction options
            const rsnsToRemove = [interaction.options.getString('3rd'), interaction.options.getString('2nd'), interaction.options.getString('1st')].filter(Boolean); // Filter out null/undefined values

            const userID = interaction.user.id;
            const currentTime = Date.now();
            const userData = rateLimitMap.get(userID) || {
                count: 0,
                firstRequest: currentTime,
            };

            // Rate Limiting Check
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

            // Schedule removal of the user's rate limit data after RATE_LIMIT_DURATION
            setTimeout(() => rateLimitMap.delete(userID), RATE_LIMIT_DURATION);

            logger.info(`User ${userID} attempting to remove RSNs: ${rsnsToRemove.join(', ')}`);

            // Fetch all RSNs registered to the user
            const userRSNs = await getAll(
                `
                SELECT rsn FROM registered_rsn
                WHERE user_id = ?
                `,
                [userID],
            );

            // If no RSNs are registered, inform the user
            if (!userRSNs.length) {
                return await interaction.reply({
                    content: '⚠️ You have no registered RSNs. Please register an RSN first to use this command. 📝',
                    flags: 64,
                });
            }

            const normalizedUserRSNs = userRSNs.map((row) => normalizeRsn(row.rsn));
            const successfullyRemoved = [];
            const notFoundRSNs = [];

            for (const rsn of rsnsToRemove) {
                const normalizedRsn = normalizeRsn(rsn);

                if (!normalizedUserRSNs.includes(normalizedRsn)) {
                    notFoundRSNs.push(rsn);
                    continue;
                }

                // Remove the RSN from the user's account
                await runQuery(
                    `
                    DELETE FROM registered_rsn
                    WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
                    `,
                    [userID, normalizedRsn],
                );

                successfullyRemoved.push(rsn);
            }

            // Construct the response message
            let response = '';

            if (successfullyRemoved.length > 0) {
                response += '✅ The following RSNs have been successfully removed from your account:\n';
                response += successfullyRemoved.map((rsn) => `- \`${rsn}\``).join('\n') + '\n\n';
            }

            if (notFoundRSNs.length > 0) {
                response += '⚠️ The following RSNs were not found in your account:\n';
                response += notFoundRSNs.map((rsn) => `- \`${rsn}\``).join('\n') + '\n\n';
            }

            // If no RSNs were removed
            if (successfullyRemoved.length === 0) {
                response = '❌ No RSNs were removed.\n\nPlease ensure that the RSNs provided are registered to your account.';
            }

            await interaction.reply({
                content: response.trim(),
                flags: 64,
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
        const userID = interaction.user.id;
        const rsnOption = interaction.options.getFocused(); // Get the currently focused input

        try {
            const normalizedInput = normalizeRsn(rsnOption);

            // Fetch RSNs registered to the user that include the input substring
            const rsnsResult = await getAll(
                `
                SELECT rsn FROM registered_rsn
                WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) LIKE ?
                `,
                [userID, `%${normalizedInput}%`],
            );

            const choices = rsnsResult.map((row) => ({
                name: row.rsn,
                value: row.rsn,
            }));

            await interaction.respond(choices.slice(0, 25)); // Discord allows a maximum of 25 choices
        } catch (error) {
            logger.error(`Error in autocomplete for /removersn: ${error.message}`);
            await interaction.respond([]); // Send empty array to indicate no suggestions if there's an error
        }
    },
};
