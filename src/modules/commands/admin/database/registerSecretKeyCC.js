const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const db = require('../../../utils/essentials/dbUtils');

/**
 * Asynchronously generate a sequential ClanChat key by querying the DB.
 * It extracts the numeric portion from keys in the format "chathook_#", then returns the next number.
 *
 * @returns {Promise<string>} A promise that resolves to a new sequential key.
 */
async function generateClanChatKey() {
    const query = `
        SELECT MAX(CAST(SUBSTR(clanchat_key, LENGTH('chathook_') + 1) AS INTEGER)) AS maxKey
        FROM clanchat_config
    `;
    const row = await db.guild.getOne(query);
    const nextKey = row && row.maxKey ? row.maxKey + 1 : 1;
    return `chathook_${nextKey}`;
}

module.exports.data = new SlashCommandBuilder()
    .setName('add_secret_cc_key')
    .setDescription('ADMIN: Register a ClanChat webhook.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // Channel option: user selects a channel where the webhook is located.
    // Accepts text channels, announcement channels, and threads.
    .addChannelOption((option) =>
        option
            .setName('channel')
            .setDescription('Select the channel where the webhook is located')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread),
    )
    // Webhook option: string option with autocomplete.
    // We'll return the webhook ID as the suggestion value.
    .addStringOption((option) => option.setName('webhook').setDescription('Select the webhook (auto-completed based on channel)').setRequired(true).setAutocomplete(true))
    // Clan name option with autocomplete.
    .addStringOption((option) => option.setName('clan_name').setDescription('Enter your clan name').setRequired(true).setAutocomplete(true))
    // Secret key option.
    .addStringOption((option) => option.setName('secret_key').setDescription('Enter your secret key').setRequired(true))
    // Endpoint URL option with default suggestion.
    .addStringOption((option) => option.setName('endpoint_url').setDescription('Enter the endpoint URL (default: https://clanchat.net)').setRequired(false).setAutocomplete(true));

module.exports.execute = async (interaction) => {
    try {
        await interaction.deferReply({ flags: 64 });

        const channel = interaction.options.getChannel('channel');
        const webhookId = interaction.options.getString('webhook');
        const clanName = interaction.options.getString('clan_name');
        const secretKey = interaction.options.getString('secret_key');
        const endpointUrl = interaction.options.getString('endpoint_url') || 'https://clanchat.net';
        const registeredBy = interaction.user.id;

        // Generate a sequential ClanChat key.
        const clanchatKey = await generateClanChatKey();

        // Look up the full webhook URL from the DB using the webhook ID.
        const webhookRow = await db.guild.getOne('SELECT webhook_url FROM guild_webhooks WHERE webhook_id = ?', [webhookId]);
        if (!webhookRow) {
            throw new Error('Webhook not found in the database.');
        }
        const webhookUrl = webhookRow.webhook_url;

        const insertQuery = `
            INSERT INTO clanchat_config (clanchat_key, secret_key, clan_name, webhook_url, channel_id, endpoint_url, registered_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [clanchatKey, secretKey, clanName, webhookUrl, channel.id, endpointUrl, registeredBy];
        await db.runQuery(insertQuery, params);

        await interaction.editReply(`✅ Successfully registered ClanChat webhook with key \`${clanchatKey}\`.`);
    } catch (err) {
        logger.error(`Error executing /register_cc_webhook: ${err.message}`);
        await interaction.editReply('❌ An error occurred while registering the ClanChat webhook.');
    }
};

module.exports.autocomplete = async (interaction) => {
    try {
        const focused = interaction.options.getFocused(true);

        let channel = interaction.options.getChannel('channel');
        if (!channel) {
            // Fallback: check raw value.
            const channelOption = interaction.options.get('channel');
            if (channelOption && channelOption.value) {
                channel = { id: channelOption.value };
            }
        }
        if (!channel) {
            logger.debug('No channel selected for autocomplete.');
            return interaction.respond([]);
        }

        // Determine the target channel ID.
        let targetChannelId = channel.id;
        if (channel.type && (channel.type === ChannelType.PublicThread || channel.type === ChannelType.PrivateThread || channel.type === ChannelType.AnnouncementThread)) {
            if (channel.parent) {
                targetChannelId = channel.parent.id;
                logger.debug(`Channel is a thread. Using parent channel ID: ${targetChannelId}`);
            } else {
                logger.debug('Thread channel has no parent.');
                return interaction.respond([]);
            }
        }

        if (focused.name === 'webhook') {
            // Query the guild_webhooks table for webhooks matching the target channel.
            const query = 'SELECT webhook_id, webhook_url, webhook_name FROM guild_webhooks WHERE channel_id = ?';
            const rows = await db.guild.getAll(query, [targetChannelId]);
            logger.debug(`Fetched ${rows.length} webhook records from DB for channel ${targetChannelId}.`);

            // Map rows to suggestion objects.
            const suggestions = rows.map((row) => ({
                name: row.webhook_name, // Display name.
                value: row.webhook_id, // Use ID (should be < 100 characters).
            }));

            // Filter based on user input.
            const filteredSuggestions = suggestions.filter((s) => s.name.toLowerCase().includes(focused.value.toLowerCase()));
            logger.debug(`Returning ${filteredSuggestions.length} webhook suggestions for input "${focused.value}".`);

            return interaction.respond(filteredSuggestions.slice(0, 25));
        }

        // Autocomplete for the 'clan_name' option.
        if (focused.name === 'clan_name') {
            const query = 'SELECT DISTINCT clan_name FROM clanchat_config';
            const rows = await db.getAll(query);
            logger.debug(`Fetched ${rows.length} clan names from DB.`);
            const suggestions = rows.map((row) => ({
                name: row.clan_name,
                value: row.clan_name,
            }));
            const filteredSuggestions = suggestions.filter((s) => s.name.toLowerCase().includes(focused.value.toLowerCase()));
            logger.debug(`Returning ${filteredSuggestions.length} clan name suggestions for input "${focused.value}".`);
            return interaction.respond(filteredSuggestions.slice(0, 25));
        }

        // Autocomplete for the 'endpoint_url' option.
        if (focused.name === 'endpoint_url') {
            // Query distinct endpoint URLs from clanchat_config for the selected channel.
            const query = `
                SELECT DISTINCT endpoint_url 
                FROM clanchat_config 
                WHERE channel_id = ? 
                  AND endpoint_url IS NOT NULL 
                  AND endpoint_url <> ''
            `;
            const rows = await db.getAll(query, [targetChannelId]);
            logger.debug(`Fetched ${rows.length} endpoint_url records from DB for channel ${targetChannelId}.`);

            let suggestions;
            if (!rows || rows.length === 0) {
                // No endpoint URLs found: revert to default.
                suggestions = [
                    {
                        name: 'https://clanchat.net',
                        value: 'https://clanchat.net',
                    },
                ];
            } else {
                // Map database results to suggestion objects.
                suggestions = rows.map((row) => ({
                    name: row.endpoint_url,
                    value: row.endpoint_url,
                }));
            }
            // Filter suggestions based on user input.
            const filteredSuggestions = suggestions.filter((s) => s.name.toLowerCase().includes(focused.value.toLowerCase()));
            logger.debug(`Returning ${filteredSuggestions.length} endpoint_url suggestions for input "${focused.value}".`);

            return interaction.respond(filteredSuggestions.slice(0, 25));
        }

        return interaction.respond([]);
    } catch (err) {
        logger.error(`Autocomplete error in /register_cc_webhook: ${err.message}`);
        return interaction.respond([]);
    }
};
