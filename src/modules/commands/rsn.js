// @ts-nocheck
/**
 * @fileoverview Defines the `/rsn` slash command for the Varietyz Bot.
 * This command allows users to register their Old School RuneScape Name (RSN).
 * It includes validation, rate limiting, and handles special Easter egg RSNs with custom responses.
 *
 * @module modules/commands/rsn
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const logger = require('../../utils/logger');
const { runQuery, getOne } = require('../../utils/dbUtils');
const { easterEggs } = require('../../config/easterEggs');
const { normalizeRsn } = require('../../utils/normalizeRsn');
const { validateRsn } = require('../../utils/validateRsn');
const { fetchPlayerData } = require('../../utils/fetchPlayerData');

// Rate Limiting Configuration
const RATE_LIMIT = 5; // Maximum number of allowed attempts
const RATE_LIMIT_DURATION = 60 * 1000; // Time window in milliseconds (e.g., 1 minute)
const rateLimitMap = new Map(); // Map to track user requests

/**
 * Defines the `/rsn` slash command using Discord's SlashCommandBuilder.
 *
 * @constant {SlashCommandBuilder}
 * @example
 * // This command can be registered with Discord's API
 * const rsnCommand = module.exports.data;
 */
module.exports.data = new SlashCommandBuilder()
    .setName('rsn')
    .setDescription('Register your Old School RuneScape Name (RSN)')
    .addStringOption((option) =>
        option
            .setName('name')
            .setDescription('Your Old School RuneScape Name to register')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(12)
    );

/**
 * Executes the `/rsn` command, allowing users to register their RSN.
 * Handles validation, rate limiting, database interactions, and Easter egg responses.
 *
 * @async
 * @function execute
 * @param {Discord.CommandInteraction} interaction - The interaction object representing the command execution.
 * @returns {Promise<void>} - Resolves when the command has been executed.
 * @example
 * // Handler in your bot's command execution logic
 * if (commandName === 'rsn') {
 * await commands.rsn.execute(interaction);
 * }
 */
module.exports.execute = async (interaction) => {
    let rsn = '';
    try {
        rsn = interaction.options.getString('name'); // Get RSN input from user

        // Check for Easter egg RSNs
        const lowerRsn = rsn.toLowerCase();
        if (easterEggs[lowerRsn]) {
            const { title, description, color } = easterEggs[lowerRsn];
            return await interaction.reply({
                embeds: [
                    {
                        title,
                        description,
                        color
                    }
                ],
                flags: 64 // EPHEMERAL
            });
        }

        // Validate RSN format
        const validation = validateRsn(rsn);
        if (!validation.valid) {
            return await interaction.reply({
                content: `❌ ${validation.message} Please check your input and try again. 🛠️`,
                flags: 64 // EPHEMERAL
            });
        }

        const userId = interaction.user.id;
        const currentTime = Date.now();
        const userData = rateLimitMap.get(userId) || {
            count: 0,
            firstRequest: currentTime
        };

        if (currentTime - userData.firstRequest < RATE_LIMIT_DURATION) {
            if (userData.count >= RATE_LIMIT) {
                const retryAfter = Math.ceil(
                    (RATE_LIMIT_DURATION -
                        (currentTime - userData.firstRequest)) /
                        1000
                );
                return await interaction.reply({
                    content: `🚫 You're using this command too frequently. Please wait \`${retryAfter}\` second(s) before trying again. ⏳`,
                    flags: 64 // EPHEMERAL
                });
            }
            userData.count += 1;
        } else {
            userData.count = 1;
            userData.firstRequest = currentTime;
        }

        rateLimitMap.set(userId, userData);

        // Schedule removal of the user's rate limit data after RATE_LIMIT_DURATION
        setTimeout(() => rateLimitMap.delete(userId), RATE_LIMIT_DURATION);

        const normalizedRsn = normalizeRsn(rsn);

        logger.info(`User ${userId} attempting to register RSN '${rsn}'`);

        // Step 1: Fetch player data from WOM API
        const playerData = await fetchPlayerData(normalizedRsn);
        if (!playerData) {
            const profileLink = `https://wiseoldman.net/players/${encodeURIComponent(normalizedRsn)}`;
            return await interaction.reply({
                // eslint-disable-next-line max-len
                content: `❌ The RSN \`${rsn}\` could not be verified on Wise Old Man. This might be because the name is not linked to an account or the WOM database needs an update. Please ensure the name exists and try again.\n\n🔗 [View Profile](${profileLink})`,
                flags: 64 // EPHEMERAL
            });
        }

        // Step 2: Check if RSN already exists under another user's account
        const existingUser = await getOne(
            `
      SELECT user_id FROM registered_rsn
      WHERE LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
      LIMIT 1
      `,
            [normalizedRsn]
        );

        if (existingUser && existingUser.user_id !== userId) {
            return await interaction.reply({
                content: `🚫 The RSN \`${rsn}\` is already registered by another user: <@${existingUser.user_id}>. 🛡️`,
                flags: 64 // EPHEMERAL
            });
        }

        // Step 3: Check if RSN is already registered to the user
        const isRegistered = await getOne(
            `
      SELECT 1 FROM registered_rsn
      WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
      LIMIT 1
      `,
            [userId, normalizedRsn]
        );

        if (isRegistered) {
            return await interaction.reply({
                content: `⚠️ The RSN \`${rsn}\` is already registered to your account. No action was taken. ✅`,
                flags: 64 // EPHEMERAL
            });
        }

        // Step 4: Register the RSN
        try {
            await runQuery(
                `
        INSERT INTO registered_rsn (user_id, rsn, registered_at)
        VALUES (?, ?, ?)
        `,
                [userId, rsn, new Date().toISOString()]
            );

            await interaction.reply({
                content: `🎉 **Success!** The RSN \`${rsn}\` has been registered to your account. 🏆`,
                flags: 64
            });

            logger.info(
                `RSN '${rsn}' successfully registered for user ${userId}`
            );
        } catch (insertErr) {
            if (insertErr.message.includes('UNIQUE constraint failed')) {
                // RSN already exists due to race condition
                return await interaction.reply({
                    content: `🚫 Oops! The RSN \`${rsn}\` was just registered by someone else. Please choose another one. 🔄`,
                    flags: 64
                });
            } else {
                throw insertErr; // Let the outer catch handle other errors
            }
        }
    } catch (err) {
        logger.error(`Error executing /rsn command: ${err.message}`);

        // Check if the interaction has already been replied to
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: `❌ An error occurred while registering \`${rsn}\`. Please try again later. 🛠️`,
                flags: 64 // EPHEMERAL
            });
        } else {
            await interaction.reply({
                content:
                    '❌ Something went wrong while processing your request. Please try again later. 🛠️',
                flags: 64 // EPHEMERAL
            });
        }
    }
};
