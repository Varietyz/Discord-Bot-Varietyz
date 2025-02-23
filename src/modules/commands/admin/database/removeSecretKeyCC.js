const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const db = require('../../../utils/essentials/dbUtils');
module.exports.data = new SlashCommandBuilder()
    .setName('remove_secret_cc_key')
    .setDescription('ADMIN: Remove a registered ClanChat webhook from the database.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) => option.setName('clanchat_key').setDescription('Select the ClanChat webhook to remove').setRequired(true).setAutocomplete(true));
module.exports.execute = async (interaction) => {
    try {
        await interaction.deferReply({ flags: 64 });
        const clanchatKey = interaction.options.getString('clanchat_key');
        const deleteQuery = 'DELETE FROM clanchat_config WHERE clanchat_key = ?';
        const result = await db.runQuery(deleteQuery, [clanchatKey]);
        if (result.changes && result.changes > 0) {
            await interaction.editReply(`✅ Successfully removed ClanChat webhook with key \`${clanchatKey}\`.`);
        } else {
            await interaction.editReply(`❌ No ClanChat webhook found with key \`${clanchatKey}\`.`);
        }
    } catch (err) {
        logger.error(`Error executing /remove_cc_webhook: ${err.message}`);
        await interaction.editReply('❌ An error occurred while removing the ClanChat webhook.');
    }
};
module.exports.autocomplete = async (interaction) => {
    try {
        const focused = interaction.options.getFocused(true);
        if (focused.name === 'clanchat_key') {
            const query = 'SELECT clanchat_key, secret_key, clan_name FROM clanchat_config';
            const rows = await db.getAll(query);
            logger.debug(`Fetched ${rows.length} registered ClanChat webhooks from the database.`);
            const suggestions = rows.map((row) => ({
                name: `${row.clanchat_key}: ${row.secret_key} [${row.clan_name}]`,
                value: row.clanchat_key,
            }));
            const filteredSuggestions = suggestions.filter((s) => s.name.toLowerCase().includes(focused.value.toLowerCase()));
            return interaction.respond(filteredSuggestions.slice(0, 25));
        }
        return interaction.respond([]);
    } catch (err) {
        logger.error(`Autocomplete error in /remove_cc_webhook: ${err.message}`);
        return interaction.respond([]);
    }
};