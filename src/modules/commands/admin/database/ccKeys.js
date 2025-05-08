const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const db = require('../../../utils/essentials/dbUtils');

async function generateClanChatKey() {
    const query = 'SELECT MAX(CAST(SUBSTR(clanchat_key, LENGTH(\'chathook_\') + 1) AS INTEGER)) AS maxKey FROM clanchat_config';
    const row = await db.guild.getOne(query);
    const nextKey = row?.maxKey ? row.maxKey + 1 : 1;
    return `chathook_${nextKey}`;
}
module.exports.data = new SlashCommandBuilder()
    .setName('cc_keys')
    .setDescription('Manage Clan Chat webhook keys')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
        sub
            .setName('register')
            .setDescription('Register an additional ClanChat webhook')
            .addChannelOption((option) => option.setName('channel').setDescription('Select the channel where the webhook is located').setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addStringOption((option) => option.setName('webhook').setDescription('Select a webhook').setRequired(true).setAutocomplete(true))
            .addStringOption((option) => option.setName('clan_name').setDescription('Enter your clan name').setRequired(true).setAutocomplete(true))
            .addStringOption((option) => option.setName('secret_key').setDescription('Enter your secret key').setRequired(true))
            .addStringOption((option) => option.setName('endpoint_url').setDescription('Enter the endpoint URL (default: https://clanchat.net)').setRequired(false).setAutocomplete(true)),
    )
    .addSubcommand((sub) =>
        sub
            .setName('change')
            .setDescription('Modify an existing secret key')
            .addStringOption((option) => option.setName('old_secret_key').setDescription('Select the existing secret key to change').setRequired(true).setAutocomplete(true))
            .addStringOption((option) => option.setName('new_secret_key').setDescription('Enter the new secret key').setRequired(true)),
    )
    .addSubcommand((sub) =>
        sub
            .setName('remove')
            .setDescription('Remove a registered ClanChat webhook')
            .addStringOption((option) => option.setName('clanchat_key').setDescription('Select the ClanChat webhook to remove').setRequired(true).setAutocomplete(true)),
    );
module.exports.execute = async (interaction) => {
    try {
        await interaction.deferReply({ flags: 64 });
        const subcommand = interaction.options.getSubcommand();
        const registeredBy = interaction.user.id;
        if (subcommand === 'register') {
            const channel = interaction.options.getChannel('channel');
            const webhookId = interaction.options.getString('webhook');
            const clanName = interaction.options.getString('clan_name');
            const secretKey = interaction.options.getString('secret_key');
            const endpointUrl = interaction.options.getString('endpoint_url') || 'https://clanchat.net';
            const clanchatKey = await generateClanChatKey();
            const webhookRow = await db.guild.getOne('SELECT webhook_url FROM guild_webhooks WHERE webhook_id = ?', [webhookId]);
            if (!webhookRow) throw new Error('Webhook not found in the database.');
            const webhookUrl = webhookRow.webhook_url;
            await db.runQuery(
                `INSERT INTO clanchat_config (clanchat_key, secret_key, clan_name, webhook_url, channel_id, endpoint_url, registered_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [clanchatKey, secretKey, clanName, webhookUrl, channel.id, endpointUrl, registeredBy],
            );
            await interaction.editReply(`✅ Successfully registered ClanChat webhook with key \`${clanchatKey}\`.`);
        } else if (subcommand === 'change') {
            const oldSecretKey = interaction.options.getString('old_secret_key');
            const newSecretKey = interaction.options.getString('new_secret_key');
            const secretRow = await db.getOne('SELECT clanchat_key FROM clanchat_config WHERE secret_key = ?', [oldSecretKey]);
            if (!secretRow) {
                return interaction.editReply('❌ The selected secret key does not exist.');
            }
            await db.runQuery('UPDATE clanchat_config SET secret_key = ? WHERE secret_key = ?', [newSecretKey, oldSecretKey]);
            await interaction.editReply(`✅ Successfully updated secret key for \`${secretRow.clanchat_key}\`.`);
        } else if (subcommand === 'remove') {
            const clanchatKey = interaction.options.getString('clanchat_key');
            const result = await db.runQuery('DELETE FROM clanchat_config WHERE clanchat_key = ?', [clanchatKey]);
            if (result.changes > 0) {
                await interaction.editReply(`✅ Successfully removed ClanChat webhook **\`${clanchatKey}\`**.`);
            } else {
                await interaction.editReply(`❌ No ClanChat webhook found with key **\`${clanchatKey}\`**.`);
            }
        }
    } catch (err) {
        logger.error(`Error executing /cc_keys: ${err.message}`);
        await interaction.editReply('❌ An error occurred while processing your request.');
    }
};
module.exports.autocomplete = async (interaction) => {
    try {
        const focused = interaction.options.getFocused(true);
        if (focused.name === 'clanchat_key') {
            const rows = await db.getAll('SELECT clanchat_key, clan_name FROM clanchat_config');
            return interaction.respond(rows.map((row) => ({ name: `${row.clanchat_key} [${row.clan_name}]`, value: row.clanchat_key })).slice(0, 25));
        }
        if (focused.name === 'webhook') {
            const rows = await db.guild.getAll('SELECT webhook_id, webhook_name FROM guild_webhooks');
            return interaction.respond(rows.map((row) => ({ name: row.webhook_name, value: row.webhook_id })).slice(0, 25));
        }
        if (focused.name === 'clan_name') {
            const rows = await db.getAll('SELECT DISTINCT clan_name FROM clanchat_config');
            return interaction.respond(rows.map((row) => ({ name: row.clan_name, value: row.clan_name })).slice(0, 25));
        }
        if (focused.name === 'endpoint_url') {
            return interaction.respond([{ name: 'https://clanchat.net', value: 'https://clanchat.net' }]);
        }
        if (focused.name === 'old_secret_key') {
            const rows = await db.getAll('SELECT secret_key FROM clanchat_config');
            return interaction.respond(rows.map((row) => ({ name: row.secret_key, value: row.secret_key })).slice(0, 25));
        }
        return interaction.respond([]);
    } catch (err) {
        logger.error(`Autocomplete error in /cc_keys: ${err.message}`);
        return interaction.respond([]);
    }
};
