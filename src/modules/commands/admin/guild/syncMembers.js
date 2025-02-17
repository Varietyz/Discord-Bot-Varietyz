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
 * ---
 *
 * 🔹 **Usage:**
 * - Must be executed by an administrator.
 * - Provides a summary of processed and failed member synchronizations.
 *
 * 🔗 **External Dependencies:**
 * - **Discord.js**: For handling slash command interactions.
 * - **SQLite**: For querying registered RSN data.
 * - **Wise Old Man API**: For fetching the latest member data.
 * - **Logger**: For logging command activity and errors.
 *
 * @module modules/commands/adminSyncMembers
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
const { fetchAndProcessMember } = require('../../../services/autoRoles');

module.exports = {
    data: new SlashCommandBuilder().setName('sync_members').setDescription('ADMIN: Manually synchronize clan members with the WOM API and update roles.').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    /**
     * 🎯 **Executes the /sync_members Command**
     *
     * Performs the following steps:
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
            await interaction.deferReply({ flags: 64 });
            logger.info(`👮 Admin ${interaction.user.tag} initiated member synchronization.`);

            const users = await db.getAll('SELECT DISTINCT discord_id FROM registered_rsn', []);
            if (!users || users.length === 0) {
                return await interaction.editReply('ℹ️ No registered clan members found.');
            }

            const guild = interaction.guild;
            let processedCount = 0;
            let failedCount = 0;

            for (const row of users) {
                try {
                    await fetchAndProcessMember(guild, row.discord_id);
                    processedCount++;
                } catch (err) {
                    logger.error(`❌ Failed to process member ${row.discord_id}: ${err.message}`);
                    failedCount++;
                }
            }

            const replyMessage = `✅ Member synchronization complete. Processed: \`${processedCount}\`, Failed: \`${failedCount}\`.`;
            logger.info(replyMessage);
            await interaction.editReply(replyMessage);
        } catch (error) {
            logger.error(`❌ Error executing /sync_members command: ${error.message}`);
            await interaction.editReply('❌ An error occurred during member synchronization. Please try again later.');
        }
    },
};
