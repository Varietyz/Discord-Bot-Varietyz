const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const dbUtils = require('../../../utils/dbUtils');
const logger = require('../../../utils/logger');

const IMPORTANT_KEYS = {
    log_channels: 'log_key',
    setup_channels: 'setup_key',
    comp_channels: 'comp_key',
    guild_channels: 'channel_key',
    guild_emoji: 'emoji_name',
    guild_roles: 'role_key',
    guild_webhooks: 'webhook_name',
};

module.exports.data = new SlashCommandBuilder()
    .setName('edit_database')
    .setDescription('Edit a specific field in a database table (Admin only).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
        subcommand
            .setName('change')
            .setDescription('Edit a database row field')
            .addStringOption((option) => option.setName('database').setDescription('Select the database to edit').setRequired(true).setAutocomplete(true))
            .addStringOption((option) => option.setName('table').setDescription('Select the table to edit').setRequired(true).setAutocomplete(true))
            .addStringOption((option) => option.setName('column').setDescription('Select the column to update').setRequired(true).setAutocomplete(true))
            .addStringOption((option) => option.setName('field').setDescription('Select the field value to update').setRequired(true).setAutocomplete(true))
            .addStringOption((option) => option.setName('new_value').setDescription('Enter the new value for the field').setRequired(true)),
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName('change_keys')
            .setDescription('Quickly update important database keys.')
            .addStringOption((option) => option.setName('table').setDescription('Select the table containing the key').setRequired(true).setAutocomplete(true))
            .addStringOption((option) => option.setName('key').setDescription('Select the key to update').setRequired(true).setAutocomplete(true))
            .addStringOption((option) => option.setName('new_value').setDescription('Enter the new value for the key').setRequired(true)),
    );

module.exports.execute = async (interaction) => {
    try {
        // Check for administrator permissions
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ You do not have permission to use this command.',
                flags: 64,
            });
        }

        await interaction.deferReply({ flags: 64 });

        const subcommand = interaction.options.getSubcommand();
        let query, params;

        if (subcommand === 'change') {
            const dbChoice = interaction.options.getString('database');
            const table = interaction.options.getString('table');
            const column = interaction.options.getString('column');
            const field = interaction.options.getString('field');
            const newValue = interaction.options.getString('new_value');

            let runQueryFunc, dbHandler;
            // Select the appropriate database handler based on the user's choice
            switch (dbChoice) {
            case 'main':
                runQueryFunc = dbUtils.runQuery;
                dbHandler = dbUtils;
                break;
            case 'messages':
                runQueryFunc = dbUtils.messages.runQuery;
                dbHandler = dbUtils.messages;
                break;
            case 'images':
                runQueryFunc = dbUtils.image.runQuery;
                dbHandler = dbUtils.image;
                break;
            case 'guild':
            default:
                runQueryFunc = dbUtils.guild.runQuery;
                dbHandler = dbUtils.guild;
                break;
            }

            query = `UPDATE ${table} SET ${column} = ? WHERE ${column} = ?`;
            params = [newValue, field];

            // Execute the update query
            await runQueryFunc(query, params);
            await interaction.editReply(`✅ Successfully updated **${column}** in table **${table}** from \`${field}\` to \`${newValue}\`.`);

            // For logging the update, use the guild database if the chosen database doesn’t contain the log_channels table.
            // If the selected database is 'guild', we use its handler; otherwise, we fall back to dbUtils.guild.
            const logDbHandler = dbChoice === 'guild' ? dbHandler : dbUtils.guild;

            try {
                // Retrieve log channel information using the determined logDbHandler
                const logChannelData = await logDbHandler.getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['database_logs']);
                if (!logChannelData) {
                    logger.warn('⚠️ No log channel found for "database_logs" in the logging database.');
                } else {
                    // Fetch the log channel from the guild
                    const logChannel = await interaction.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
                    if (!logChannel) {
                        logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                    } else {
                        // 📌 **Build Embed**
                        const embed = new EmbedBuilder()
                            .setColor(0x3498db) // Blue for field updates
                            .setTitle('✏️ **Database Field Updated**')
                            .setDescription(`Action performed by <@${interaction.user.id}> (${interaction.user.tag})`)
                            .addFields(
                                { name: '📂 **Database**', value: `\`${dbChoice}\``, inline: true },
                                { name: '📋 **Table**', value: `\`${table}\``, inline: true },
                                { name: '📝 **Column**', value: `\`${column}\``, inline: true },
                                { name: '❌ **Field (Old Value)**', value: `\`\`\`${field}\`\`\``, inline: true },
                                { name: '✅ **Field (New Value)**', value: `\`\`\`${newValue}\`\`\``, inline: true },
                            )
                            .setTimestamp();

                        // 📤 **Send Embed to Log Channel**
                        await logChannel.send({ embeds: [embed] });
                    }
                }
            } catch (logErr) {
                logger.error(`Error logging database update: ${logErr.message}`);
            }
        } else if (subcommand === 'change_keys') {
            // For change_keys, we don't have a database option so we'll use the guild database
            const table = interaction.options.getString('table');
            const keyColumn = IMPORTANT_KEYS[table];
            if (!keyColumn) return interaction.editReply('❌ This table does not have a predefined key column.');

            const key = interaction.options.getString('key');
            const newValue = interaction.options.getString('new_value');

            query = `UPDATE ${table} SET ${keyColumn} = ? WHERE ${keyColumn} = ?`;
            params = [newValue, key];

            // Execute the update in the guild database
            await dbUtils.guild.runQuery(query, params);
            await interaction.editReply(`✅ Successfully updated key **${keyColumn}** in **${table}** from \`${key}\` to \`${newValue}\`.`);

            try {
                // Use the guild database for logging
                const logChannelData = await dbUtils.guild.getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['database_logs']);
                if (!logChannelData) {
                    logger.warn('⚠️ No log channel found for "database_logs" in the logging database.');
                } else {
                    const logChannel = await interaction.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
                    if (!logChannel) {
                        logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                    } else {
                        // 📌 **Build Embed**
                        const embed = new EmbedBuilder()
                            .setColor(0xffa500) // Orange for key updates
                            .setTitle('🔑 **Guild Database Key Updated**')
                            .addFields(
                                { name: '📋 **Table**', value: `\`${table}\``, inline: true },
                                { name: '🔑 **Key Column**', value: `\`${keyColumn}\``, inline: true },
                                { name: '❌ **Old Key**', value: `\`\`\`${key}\`\`\``, inline: true },
                                { name: '✅ **New Key**', value: `\`\`\`${newValue}\`\`\``, inline: true },
                            )
                            .setFooter({ text: `Executed by ${interaction.user.tag}` })
                            .setTimestamp();

                        // 📤 **Send Embed to Log Channel**
                        await logChannel.send({ embeds: [embed] });
                    }
                }
            } catch (logErr) {
                logger.error(`Error logging key update: ${logErr.message}`);
            }
        }
    } catch (err) {
        logger.error(`❌ Error executing /edit_database: ${err.message}`);
        return interaction.editReply('❌ An error occurred while updating the database.');
    }
};

module.exports.autocomplete = async (interaction) => {
    try {
        const focused = interaction.options.getFocused(true);
        const subcommand = interaction.options.getSubcommand();
        const searchValue = focused.value.toLowerCase();

        console.log(`🔍 DEBUG: Autocomplete triggered for ${focused.name} | Input: ${searchValue}`);

        // Autocomplete for the 'database' option
        if (focused.name === 'database') {
            return interaction.respond(
                ['main', 'messages', 'images', 'guild']
                    .filter((db) => db.includes(searchValue))
                    .map((db) => ({
                        name: db.charAt(0).toUpperCase() + db.slice(1),
                        value: db,
                    })),
            );
        }

        // Retrieve the chosen database (defaults to 'guild')
        const dbChoice = interaction.options.getString('database') || 'guild';
        if (!dbChoice) return interaction.respond([]);

        // Select the appropriate database handler
        let dbHandler;
        switch (dbChoice) {
        case 'main':
            dbHandler = dbUtils;
            break;
        case 'messages':
            dbHandler = dbUtils.messages;
            break;
        case 'images':
            dbHandler = dbUtils.image;
            break;
        case 'guild':
        default:
            dbHandler = dbUtils.guild;
            break;
        }

        let tableNames = [];

        // For the 'table' option, use different sources based on the subcommand.
        if (subcommand === 'change_keys' && focused.name === 'table') {
            // In change_keys, restrict table choices to those defined in IMPORTANT_KEYS.
            tableNames = Object.keys(IMPORTANT_KEYS);
        } else if (subcommand === 'change' && focused.name === 'table') {
            // In change, dynamically retrieve table names from the selected database.
            const tables = await dbHandler.getAll('SELECT name FROM sqlite_master WHERE type=\'table\' AND name NOT LIKE \'sqlite_%\' LIMIT 100');
            tableNames = tables.map((row) => row.name);
        }

        // Respond with filtered table names.
        if (focused.name === 'table') {
            return interaction.respond(
                tableNames
                    .filter((name) => name.toLowerCase().includes(searchValue))
                    .slice(0, 25)
                    .map((name) => ({ name, value: name })),
            );
        }

        // Autocomplete for the 'column' option: retrieve columns via PRAGMA.
        if (focused.name === 'column') {
            const tableChoice = interaction.options.getString('table');
            if (!tableChoice) return interaction.respond([]);
            const columns = await dbHandler.getAll(`PRAGMA table_info(${tableChoice})`);
            return interaction.respond(
                columns
                    .map((col) => col.name)
                    .filter((name) => name.toLowerCase().includes(searchValue))
                    .slice(0, 25)
                    .map((name) => ({ name, value: name })),
            );
        }

        // Autocomplete for the 'field' option: retrieve distinct field values.
        if (focused.name === 'field') {
            const tableChoice = interaction.options.getString('table');
            const column = interaction.options.getString('column');
            if (!tableChoice || !column) return interaction.respond([]);
            const fields = await dbHandler.getAll(`SELECT DISTINCT ${column} FROM ${tableChoice} LIMIT 100`);
            return interaction.respond(
                fields
                    .map((row) => row[column])
                    .filter((value) => value && value.toString().toLowerCase().includes(searchValue))
                    .slice(0, 25)
                    .map((value) => ({ name: value.toString(), value: value.toString() })),
            );
        }

        // Autocomplete for the 'key' option (only for change_keys subcommand).
        if (focused.name === 'key' && subcommand === 'change_keys') {
            const tableChoice = interaction.options.getString('table');
            if (!tableChoice) return interaction.respond([]);
            const keyColumn = IMPORTANT_KEYS[tableChoice];
            if (!keyColumn) return interaction.respond([]);
            const keys = await dbHandler.getAll(`SELECT DISTINCT ${keyColumn} FROM ${tableChoice} LIMIT 100`);
            return interaction.respond(
                keys
                    .map((row) => row[keyColumn])
                    .filter((value) => value.toLowerCase().includes(searchValue))
                    .slice(0, 25)
                    .map((value) => ({ name: value, value })),
            );
        }
    } catch (err) {
        logger.error(`❌ Autocomplete error in /edit_database: ${err.message}`);
        return interaction.respond([]);
    }
};
