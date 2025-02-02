/* eslint-disable jsdoc/check-param-names */
/* eslint-disable no-process-exit */
// @ts-nocheck
/**
 * @fileoverview
 * **Rsn Command** 📝
 *
 * Defines the `/rsn` slash command for the Varietyz Bot. This command allows users to register their Old School RuneScape Name (RSN).
 * It handles:
 * - **Validation:** Ensuring RSNs follow specific format rules.
 * - **Rate Limiting:** Prevents abuse by limiting repeated usage within a given time window.
 * - **Easter Eggs:** Provides custom responses for special RSNs.
 * - **Database Handling:** Manages RSN registrations with conflict resolution.
 * - **External API Verification:** Validates RSNs against the Wise Old Man API to ensure the RSN exists.
 *
 * **External Dependencies:**
 * - **Wise Old Man API** for player profile verification.
 * - **SQLite** for managing RSN registrations.
 * - **Discord.js** for command interactions and sending feedback.
 *
 * @module modules/commands/rsn
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const logger = require('../utils/logger');
const { runQuery, getOne } = require('../utils/dbUtils');
const { easterEggs } = require('../../config/easterEggs');
const { normalizeRsn } = require('../utils/normalizeRsn');
const { validateRsn } = require('../utils/validateRsn');
const { fetchPlayerData } = require('../utils/fetchPlayerData');

// Rate Limiting Configuration
const RATE_LIMIT = 5; // Maximum number of allowed attempts 🔢
const RATE_LIMIT_DURATION = 60 * 1000; // 1 minute in milliseconds ⏳
const rateLimitMap = new Map(); // Tracks user requests

/**
 * Defines the `/rsn` slash command using Discord's SlashCommandBuilder.
 *
 * @constant {SlashCommandBuilder}
 * @example
 * // This command is registered with Discord's API as `/rsn`
 * const rsnCommand = module.exports.data;
 */
module.exports.data = new SlashCommandBuilder()
    .setName('rsn')
    .setDescription('Register your Old School RuneScape Name (RSN)')
    .addStringOption((option) => option.setName('name').setDescription('Your Old School RuneScape Name to register').setRequired(true).setMinLength(1).setMaxLength(12));

/**
 * 🎯 **Executes the /rsn Command**
 *
 * This command allows users to register their RSN. It performs the following steps:
 * 1. Retrieves the RSN input from the command.
 * 2. Checks for special Easter egg RSNs and returns custom responses if applicable.
 * 3. Validates the RSN format.
 * 4. Implements rate limiting to prevent abuse.
 * 5. Fetches player data from the Wise Old Man API to verify the RSN.
 * 6. Checks for conflicts in the database.
 * 7. Registers the RSN in the database if it passes all checks.
 *
 * @async
 * @function execute
 * @param {Discord.CommandInteraction} interaction - The command interaction object.
 * @returns {Promise<void>} Resolves when the command execution is complete.
 *
 * @example
 * // When a user executes /rsn name:"PlayerOne", this function is invoked.
 * await module.exports.execute(interaction);
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
                        color,
                    },
                ],
                flags: 64, // EPHEMERAL
            });
        }

        // Validate RSN format
        const validation = validateRsn(rsn);
        if (!validation.valid) {
            return await interaction.reply({
                content: `❌ ${validation.message} Please check your input and try again. 🛠️`,
                flags: 64, // EPHEMERAL
            });
        }

        const userId = interaction.user.id;
        const currentTime = Date.now();
        const userData = rateLimitMap.get(userId) || {
            count: 0,
            firstRequest: currentTime,
        };

        if (currentTime - userData.firstRequest < RATE_LIMIT_DURATION) {
            if (userData.count >= RATE_LIMIT) {
                const retryAfter = Math.ceil((RATE_LIMIT_DURATION - (currentTime - userData.firstRequest)) / 1000);
                return await interaction.reply({
                    content: `🚫 You're using this command too frequently. Please wait \`${retryAfter}\` second(s) before trying again. ⏳`,
                    flags: 64, // EPHEMERAL
                });
            }
            userData.count += 1;
        } else {
            userData.count = 1;
            userData.firstRequest = currentTime;
        }

        rateLimitMap.set(userId, userData);

        // Schedule removal of rate limit data after RATE_LIMIT_DURATION
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
                flags: 64, // EPHEMERAL
            });
        }

        // Step 2: Check if RSN already exists under another user's account
        const existingUser = await getOne(
            `
      SELECT user_id FROM registered_rsn
      WHERE LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
      LIMIT 1
      `,
            [normalizedRsn],
        );

        if (existingUser && existingUser.user_id !== userId) {
            return await interaction.reply({
                content: `🚫 The RSN \`${rsn}\` is already registered by another user: <@${existingUser.user_id}>. 🛡️`,
                flags: 64, // EPHEMERAL
            });
        }

        // Step 3: Check if RSN is already registered to the user
        const isRegistered = await getOne(
            `
      SELECT 1 FROM registered_rsn
      WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
      LIMIT 1
      `,
            [userId, normalizedRsn],
        );

        if (isRegistered) {
            return await interaction.reply({
                content: `⚠️ The RSN \`${rsn}\` is already registered to your account. No action was taken. ✅`,
                flags: 64, // EPHEMERAL
            });
        }

        // Step 4: Register the RSN in the database.
        try {
            await runQuery(
                `
        INSERT INTO registered_rsn (user_id, rsn, registered_at)
        VALUES (?, ?, ?)
        `,
                [userId, rsn, new Date().toISOString()],
            );

            await interaction.reply({
                content: `🎉 **Success!** The RSN \`${rsn}\` has been registered to your account. 🏆`,
                flags: 64,
            });

            logger.info(`RSN '${rsn}' successfully registered for user ${userId}`);
        } catch (insertErr) {
            if (insertErr.message.includes('UNIQUE constraint failed')) {
                // RSN already exists due to race condition.
                return await interaction.reply({
                    content: `🚫 Oops! The RSN \`${rsn}\` was just registered by someone else. Please choose another one. 🔄`,
                    flags: 64,
                });
            } else {
                throw insertErr; // Let outer catch handle unexpected errors.
            }
        }
    } catch (err) {
        logger.error(`Error executing /rsn command: ${err.message}`);

        // Check if the interaction has already been replied to.
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: `❌ An error occurred while registering \`${rsn}\`. Please try again later. 🛠️`,
                flags: 64, // EPHEMERAL
            });
        } else {
            await interaction.reply({
                content: '❌ Something went wrong while processing your request. Please try again later. 🛠️',
                flags: 64, // EPHEMERAL
            });
        }
    }
};
