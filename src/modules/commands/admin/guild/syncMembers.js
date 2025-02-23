const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
const { fetchAndProcessMember } = require('../../../services/autoRoles');
module.exports = {
    data: new SlashCommandBuilder().setName('sync_members').setDescription('ADMIN: Manually synchronize clan members with the WOM API and update roles.').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: 64 });
            }
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