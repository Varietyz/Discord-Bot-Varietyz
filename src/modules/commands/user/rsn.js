/* eslint-disable max-len */
/* eslint-disable jsdoc/check-param-names */
/* eslint-disable no-process-exit */
// @ts-nocheck
/**
 * @fileoverview
 * **Rsn Command** 📝
 *
 * This module defines the `/rsn` slash command for the Varietyz Bot. It allows users to register their
 * Old School RuneScape Name (RSN) and includes the following functionalities:
 *
 * - **Validation:** Ensures RSNs adhere to specific format rules.
 * - **Rate Limiting:** Prevents repeated usage within a given time window to avoid abuse.
 * - **Easter Eggs:** Returns custom responses for special RSNs.
 * - **Database Handling:** Manages RSN registrations with conflict resolution.
 * - **External API Verification:** Validates RSNs against the Wise Old Man API to ensure the RSN exists.
 *
 * 🔗 **External Dependencies:**
 * - Wise Old Man API for player profile verification.
 * - SQLite for RSN registration management.
 * - Discord.js for handling command interactions and sending responses.
 *
 * @module modules/commands/rsn
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const logger = require('../../utils/logger');
const { runQuery, getOne } = require('../../utils/dbUtils');
const { easterEggs } = require('../../../config/easterEggs');
const { normalizeRsn } = require('../../utils/normalizeRsn');
const { validateRsn } = require('../../utils/validateRsn');
const { fetchPlayerData } = require('../../utils/fetchPlayerData');

const RATE_LIMIT = 5;
const RATE_LIMIT_DURATION = 60 * 1000;
const rateLimitMap = new Map();

/**
 * Defines the `/rsn` slash command using Discord's SlashCommandBuilder.
 *
 * @constant {SlashCommandBuilder}
 * @example
 * // 📌 The command is registered as `/rsn` with a required string option "name":
 * const rsnCommand = module.exports.data;
 */
module.exports.data = new SlashCommandBuilder()
    .setName('rsn')
    .setDescription('Register your Old School RuneScape Name (RSN)')
    .addStringOption((option) => option.setName('name').setDescription('Your Old School RuneScape Name to register').setRequired(true).setMinLength(1).setMaxLength(12));

/**
 * 🎯 **Executes the /rsn Command**
 *
 * This function processes the `/rsn` command by performing the following steps:
 *
 * 1. Retrieves the RSN input from the command.
 * 2. Checks for special Easter egg RSNs and returns custom responses if applicable.
 * 3. Validates the RSN format.
 * 4. Enforces rate limiting to prevent abuse.
 * 5. Fetches player data from the Wise Old Man API for RSN verification.
 * 6. Checks for registration conflicts in the database.
 * 7. Registers the RSN in the database if all checks pass.
 *
 * @async
 * @function execute
 * @param {Discord.CommandInteraction} interaction - The command interaction object.
 * @returns {Promise<void>} Resolves when the command execution is complete.
 *
 * @example
 * // 📌 When a user executes `/rsn name:"PlayerOne"`, this function is invoked:
 * await module.exports.execute(interaction);
 */
module.exports.execute = async (interaction) => {
    let rsn = '';
    try {
        rsn = interaction.options.getString('name');
        const lowerRsn = rsn.toLowerCase();

        // Check for Easter eggs
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
                flags: 64,
            });
        }

        // Validate RSN format
        const validation = validateRsn(rsn);
        if (!validation.valid) {
            return await interaction.reply({
                content: `❌ **Error:** ${validation.message} Please check your input and try again. 🛠️`,
                flags: 64,
            });
        }

        const discordId = interaction.user.id;
        const currentTime = Date.now();
        const userData = rateLimitMap.get(discordId) || {
            count: 0,
            firstRequest: currentTime,
        };

        // Rate limiting logic
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

        rateLimitMap.set(discordId, userData);
        setTimeout(() => rateLimitMap.delete(discordId), RATE_LIMIT_DURATION);

        // Normalize RSN
        const normalizedRsn = normalizeRsn(rsn);
        logger.info(`🔍 User \`${discordId}\` attempting to register RSN: \`${rsn}\``);

        // Verify RSN using Wise Old Man API
        const playerData = await fetchPlayerData(normalizedRsn);
        if (!playerData) {
            const profileLink = `https://wiseoldman.net/players/${encodeURIComponent(normalizedRsn)}`;
            return await interaction.reply({
                content: `❌ **Verification Failed:** The RSN \`${rsn}\` could not be verified on Wise Old Man. This might be because the name is not linked to an account or the WOM database needs an update. Please ensure the name exists and try again.\n\n🔗 [View Profile](${profileLink})`,
                flags: 64,
            });
        }

        const womPlayerId = playerData.id;

        // Check if the RSN is already registered by another user
        const existingUser = await getOne(
            `
      SELECT discord_id FROM registered_rsn
      WHERE LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
      LIMIT 1
      `,
            [normalizedRsn],
        );

        if (existingUser && existingUser.discord_id !== discordId) {
            return await interaction.reply({
                content: `🚫 **Conflict:** The RSN \`${rsn}\` is already registered by <@${existingUser.discord_id}>. 🛡️`,
                flags: 64,
            });
        }

        // Check if the RSN is already registered by the same user
        const isRegistered = await getOne(
            `
      SELECT 1 FROM registered_rsn
      WHERE discord_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
      LIMIT 1
      `,
            [discordId, normalizedRsn],
        );

        if (isRegistered) {
            return await interaction.reply({
                content: `⚠️ **Notice:** The RSN \`${rsn}\` is already registered to your account. No action was taken. ✅`,
                flags: 64,
            });
        }

        // Insert RSN registration into the database
        try {
            await runQuery(
                `
        INSERT INTO registered_rsn (player_id, discord_id, rsn, registered_at)
        VALUES (?, ?, ?, ?)
        `,
                [womPlayerId, discordId, rsn, new Date().toISOString()],
            );

            await interaction.reply({
                content: `🎉 **Success!** The RSN \`${rsn} (WOM ID: ${womPlayerId})\` has been successfully registered to your account. 🏆`,
                flags: 64,
            });

            logger.info(`✅ RSN \`${rsn}\` (WOM ID: \`${womPlayerId}\`) successfully registered for user \`${discordId}\`.`);
        } catch (insertErr) {
            if (insertErr.message.includes('UNIQUE constraint failed')) {
                return await interaction.reply({
                    content: `🚫 **Oops!** The RSN \`${rsn}\` was just registered by someone else. Please choose another one. 🔄`,
                    flags: 64,
                });
            } else {
                throw insertErr;
            }
        }
    } catch (err) {
        logger.error(`❌ Error executing /rsn command: ${err.message}`);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: `❌ **Error:** An error occurred while registering \`${rsn}\`. Please try again later. 🛠️`,
                flags: 64,
            });
        } else {
            await interaction.reply({
                content: '❌ **Error:** Something went wrong while processing your request. Please try again later. 🛠️',
                flags: 64,
            });
        }
    }
};
