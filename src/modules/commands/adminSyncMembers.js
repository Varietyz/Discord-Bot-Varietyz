// @ts-nocheck
/**
 * @fileoverview
 * **Sync_members Command** 📋
 *
 * Defines the `/sync_members` slash command for the Varietyz Bot.
 * This command allows administrators to manually synchronize clan members with the Wise Old Man (WOM) API,
 * updating their data and roles. It fetches all distinct user IDs from the `registered_rsn` table,
 * processes each user by calling the `fetchAndProcessMember` function, and returns a summary of the results.
 *
 * **External Dependencies:**
 * - **Discord.js**: For handling slash command interactions.
 * - **SQLite**: For querying registered RSN data.
 * - **Wise Old Man API**: For fetching the latest member data.
 * - **Logger**: For logging command activity and errors.
 *
 * @module modules/commands/adminSyncMembers
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../utils/dbUtils');
const logger = require('../utils/logger');
const { fetchAndProcessMember } = require('../services/autoRoles');

module.exports = {
    data: new SlashCommandBuilder().setName('sync_members').setDescription('Manually synchronize clan members with the WOM API and update roles.').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    /**
     * 🎯 **Executes the /sync_members Command**
     *
     * This function performs the following steps:
     * 1. Defers the reply to allow sufficient processing time.
     * 2. Fetches all distinct user IDs from the `registered_rsn` table.
     * 3. Iterates through each user ID and calls `fetchAndProcessMember` to update their data and roles.
     * 4. Returns a summary message indicating the number of processed and failed members.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the command.
     * @returns {Promise<void>} Resolves when the command execution is complete.
     *
     * @example
     * // When an administrator runs /sync_members:
     * await execute(interaction);
     */
    async execute(interaction) {
        try {
            // Defer the reply to allow processing time.
            await interaction.deferReply({ flags: 64 });
            logger.info(`Admin ${interaction.user.tag} initiated member synchronization.`);

            // Fetch all distinct user IDs from the registered_rsn table.
            const users = await db.getAll('SELECT DISTINCT user_id FROM registered_rsn', []);
            if (!users || users.length === 0) {
                return await interaction.editReply('No registered clan members found.');
            }

            const guild = interaction.guild;
            let processedCount = 0;
            let failedCount = 0;

            // Process each member sequentially.
            for (const row of users) {
                try {
                    await fetchAndProcessMember(guild, row.user_id);
                    processedCount++;
                } catch (err) {
                    logger.error(`Failed to process member ${row.user_id}: ${err.message}`);
                    failedCount++;
                }
            }

            const replyMessage = `Member synchronization complete. Processed: ${processedCount}, Failed: ${failedCount}.`;
            logger.info(replyMessage);
            await interaction.editReply(replyMessage);
        } catch (error) {
            logger.error(`Error executing /sync_members command: ${error.message}`);
            await interaction.editReply('An error occurred during member synchronization. Please try again later.');
        }
    },
};
