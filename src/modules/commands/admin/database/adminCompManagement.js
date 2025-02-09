/* eslint-disable jsdoc/require-returns */
const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const {
    guild: { runQuery, getOne, getAll },
} = require('../../../utils/dbUtils');
const logger = require('../../../utils/logger');
const { ensureCompetitionCategory } = require('../../../utils/ensureCompetitionCategory');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('comp_channel')
        .setDescription('Manage competition channels')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand((subcommand) =>
            subcommand
                .setName('set')
                .setDescription('Assign a comp channel to an event type.')
                .addStringOption((option) => option.setName('comp_type').setDescription('The type of log to configure.').setRequired(true).setAutocomplete(true))
                .addChannelOption((option) => option.setName('channel').setDescription('The Discord channel to assign.').setRequired(true)),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('disable')
                .setDescription('Disable logging for a specific event type.')
                .addStringOption((option) => option.setName('comp_type').setDescription('The log type to disable.').setRequired(true).setAutocomplete(true)),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('enable')
                .setDescription('Enable logging for a specific event type.')
                .addStringOption((option) => option.setName('comp_type').setDescription('The log type to enable.').setRequired(true).setAutocomplete(true)),
        )
        .addSubcommand((subcommand) => subcommand.setName('list').setDescription('View all assigned comp channels.'))
        .addSubcommand((subcommand) => subcommand.setName('generate').setDescription('Automatically generate all competition channels.'))
        .addSubcommand((subcommand) => subcommand.setName('remove_all').setDescription('Remove all comp channels and clear database entries.')),

    /**
     * 🎯 **Executes the `/comp_channel` command**
     *
     * Handles setting, enabling, disabling, listing, generating, and removing comp channels.
     *
     * @async
     * @function execute
     * @param interaction - The command interaction object.
     */
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const compType = interaction.options.getString('comp_type');
            const channel = interaction.options.getChannel('channel');

            if (subcommand === 'set') {
                if (!channel || !channel.isTextBased()) {
                    return await interaction.reply({
                        content: '❌ **Invalid Channel:** Please select a text-based channel.',
                        flags: 64,
                    });
                }

                await runQuery('INSERT INTO comp_channels (comp_key, channel_id) VALUES (?, ?) ON CONFLICT(comp_key) DO UPDATE SET channel_id = ?', [compType, channel.id, channel.id]);

                logger.info(`✅ Log channel for '${compType}' set to #${channel.name} (ID: ${channel.id}).`);
                return await interaction.reply({
                    content: `✅ **Success:** The comp channel for \`${compType}\` has been updated to <#${channel.id}>.`,
                    flags: 64,
                });
            } else if (subcommand === 'disable') {
                await runQuery('DELETE FROM comp_channels WHERE comp_key = ?', [compType]);

                logger.info(`🚫 Disabled logging for '${compType}'.`);
                return await interaction.reply({
                    content: `🚫 **Success:** Logging for \`${compType}\` has been disabled.`,
                    flags: 64,
                });
            } else if (subcommand === 'enable') {
                const existingChannel = await getOne('SELECT channel_id FROM comp_channels WHERE comp_key = ?', [compType]);

                if (!existingChannel) {
                    return await interaction.reply({
                        content: `❌ **Error:** No previous channel was assigned to \`${compType}\`. Use \`/comp_channel set\` first.`,
                        flags: 64,
                    });
                }

                logger.info(`🔄 Enabled logging for '${compType}' at <#${existingChannel.channel_id}>.`);
                return await interaction.reply({
                    content: `✅ **Success:** \`${compType}\` has been enabled in <#${existingChannel.channel_id}>.`,
                    flags: 64,
                });
            } else if (subcommand === 'list') {
                const logChannels = await getAll('SELECT comp_key, channel_id FROM comp_channels');

                if (logChannels.length === 0) {
                    return await interaction.reply({
                        content: '📜 **No competition channels are currently assigned.** Use `/comp_channel set` to configure them.',
                        flags: 64,
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('📋 Assigned Log Channels')
                    .setColor(0x3498db)
                    .setDescription(logChannels.map((row) => `🔹 **${row.comp_key}** → <#${row.channel_id}>`).join('\n'))
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed], flags: 64 });
            } else if (subcommand === 'generate') {
                await interaction.deferReply({ flags: 64 });

                try {
                    await ensureCompetitionCategory(interaction.guild);
                    logger.info('✅ Successfully generated competition channels.');
                    return await interaction.editReply({
                        content: '✅ **Success:** Competition channels have been generated successfully.',
                    });
                } catch (error) {
                    logger.error(`❌ Error generating comp channels: ${error.message}`);
                    return await interaction.editReply({
                        content: '❌ **Error:** Failed to generate competition channels. Please check the logs for details.',
                    });
                }
            } else if (subcommand === 'remove_all') {
                await interaction.deferReply({ flags: 64 });

                try {
                    // 🔍 Find all assigned comp channels in the database
                    const logChannels = await getAll('SELECT channel_id FROM comp_channels');

                    // 🔍 Find the Logging Category
                    const loggingCategory = interaction.guild.channels.cache.find(
                        (ch) => ch.type === 4 && ch.name === '🏆COMPETITIONS OF THE WEEK', // 4 is ChannelType.GuildCategory
                    );

                    if (logChannels.length === 0 && !loggingCategory) {
                        return await interaction.editReply({
                            content: '📜 **No competition channels or categories exist to remove.**',
                        });
                    }

                    // 🗑️ Delete all competition channels
                    for (const { channel_id } of logChannels) {
                        const channel = interaction.guild.channels.cache.get(channel_id);
                        if (channel) {
                            await channel.delete().catch((err) => logger.warn(`⚠️ Failed to delete channel ${channel.id}: ${err.message}`));
                        }
                    }

                    // 🗑️ Clear comp channels from the database
                    await runQuery('DELETE FROM comp_channels');

                    // 🗑️ Delete the logging category (if found)
                    if (loggingCategory) {
                        await loggingCategory.delete().catch((err) => logger.warn(`⚠️ Failed to delete logging category: ${err.message}`));
                    }

                    logger.info('🗑️ Successfully removed all competition channels and the category.');
                    return await interaction.editReply({
                        content: '🗑️ **Success:** All competition channels and the category have been removed, and the database has been cleared.',
                    });
                } catch (error) {
                    logger.error(`❌ Error removing comp channels: ${error.message}`);
                    return await interaction.editReply({
                        content: '❌ **Error:** Failed to remove competition channels. Please check the logs for details.',
                    });
                }
            }
        } catch (error) {
            logger.error(`❌ Error executing /comp_channel command: ${error.message}`);
            return await interaction.reply({
                content: '❌ **Error:** An error occurred while processing your request.',
                flags: 64,
            });
        }
    },

    /**
     * 🎯 **Handles Autocomplete for the `/comp_channel` Command**
     *
     * Provides log type suggestions for `/comp_channel` commands.
     *
     * @async
     * @function autocomplete
     * @param interaction - The autocomplete interaction object.
     */
    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === 'comp_type') {
                const compTypes = ['top_10_channel', 'results_channel', 'botw_channel', 'sotw_channel', 'notif_channel'];

                const filtered = compTypes.filter((type) => type.includes(focusedOption.value.toLowerCase()));

                return await interaction.respond(filtered.map((type) => ({ name: type, value: type })).slice(0, 25));
            }
        } catch (error) {
            logger.error(`❌ Error in autocomplete for /comp_channel: ${error.message}`);
            return await interaction.respond([]);
        }
    },
};
