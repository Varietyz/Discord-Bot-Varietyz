/* eslint-disable jsdoc/require-returns */
const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const {
    guild: { runQuery, getAll },
} = require('../../../utils/dbUtils');
const logger = require('../../../utils/logger');
const { ensureLoggingCategory } = require('../../../utils/ensureLoggingCategory');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('log_channel')
        .setDescription('Manage logging channels')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand((subcommand) =>
            subcommand
                .setName('set')
                .setDescription('Assign a log channel to an event type.')
                .addStringOption((option) => option.setName('assign').setDescription('The type of log to assign.').setRequired(true).setAutocomplete(true))
                .addChannelOption((option) => option.setName('channel').setDescription('The Discord channel to assign.').setRequired(true)),
        )
        .addSubcommand((subcommand) => subcommand.setName('list').setDescription('View all assigned log channels.'))
        .addSubcommand((subcommand) => subcommand.setName('generate').setDescription('Automatically generate all logging channels.'))
        .addSubcommand((subcommand) => subcommand.setName('remove_all').setDescription('Remove all log channels and clear database entries.')),

    /**
     * 🎯 **Executes the `/log_channel` command**
     *
     * Handles setting, enabling, disabling, listing, generating, and removing log channels.
     *
     * @async
     * @function execute
     * @param interaction - The command interaction object.
     */
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const logType = interaction.options.getString('assign');
            const channel = interaction.options.getChannel('channel');

            if (subcommand === 'set') {
                if (!channel || !channel.isTextBased()) {
                    return await interaction.reply({
                        content: '❌ **Invalid Channel:** Please select a text-based channel.',
                        flags: 64,
                    });
                }

                await runQuery('INSERT INTO log_channels (log_key, channel_id) VALUES (?, ?) ON CONFLICT(log_key) DO UPDATE SET channel_id = ?', [logType, channel.id, channel.id]);

                logger.info(`✅ Log channel for '${logType}' set to #${channel.name} (ID: ${channel.id}).`);
                return await interaction.reply({
                    content: `✅ **Success:** The log channel for \`${logType}\` has been updated to <#${channel.id}>.`,
                    flags: 64,
                });
            } else if (subcommand === 'list') {
                const logChannels = await getAll('SELECT log_key, channel_id FROM log_channels');

                if (logChannels.length === 0) {
                    return await interaction.reply({
                        content: '📜 **No log channels are currently assigned.** Use `/log_channel set` to configure them.',
                        flags: 64,
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('📋 Assigned Log Channels')
                    .setColor(0x3498db)
                    .setDescription(logChannels.map((row) => `🔹 **\`${row.log_key}\`** → <#${row.channel_id}>`).join('\n'))
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed], flags: 64 });
            } else if (subcommand === 'generate') {
                await interaction.deferReply({ flags: 64 });

                try {
                    await ensureLoggingCategory(interaction.guild);
                    logger.info('✅ Successfully generated logging channels.');
                    return await interaction.editReply({
                        content: '✅ **Success:** Logging channels have been generated successfully.',
                    });
                } catch (error) {
                    logger.error(`❌ Error generating log channels: ${error.message}`);
                    return await interaction.editReply({
                        content: '❌ **Error:** Failed to generate logging channels. Please check the logs for details.',
                    });
                }
            } else if (subcommand === 'remove_all') {
                await interaction.deferReply({ flags: 64 });

                try {
                    // 🔍 Find all assigned log channels in the database
                    const logChannels = await getAll('SELECT channel_id FROM log_channels');

                    // 🔍 Find the Logging Category
                    const loggingCategory = interaction.guild.channels.cache.find(
                        (ch) => ch.type === 4 && ch.name === '📁 ‣‣ LOGGING', // 4 is ChannelType.GuildCategory
                    );

                    if (logChannels.length === 0 && !loggingCategory) {
                        return await interaction.editReply({
                            content: '📜 **No logging channels or categories exist to remove.**',
                        });
                    }

                    // 🗑️ Delete all logging channels
                    for (const { channel_id } of logChannels) {
                        const channel = interaction.guild.channels.cache.get(channel_id);
                        if (channel) {
                            await channel.delete().catch((err) => logger.warn(`⚠️ Failed to delete channel ${channel.id}: ${err.message}`));
                        }
                    }

                    // 🗑️ Clear log channels from the database
                    await runQuery('DELETE FROM log_channels');

                    // 🗑️ Delete the logging category (if found)
                    if (loggingCategory) {
                        await loggingCategory.delete().catch((err) => logger.warn(`⚠️ Failed to delete logging category: ${err.message}`));
                    }

                    logger.info('🗑️ Successfully removed all logging channels and the category.');
                    return await interaction.editReply({
                        content: '🗑️ **Success:** All logging channels and the category have been removed, and the database has been cleared.',
                    });
                } catch (error) {
                    logger.error(`❌ Error removing log channels: ${error.message}`);
                    return await interaction.editReply({
                        content: '❌ **Error:** Failed to remove logging channels. Please check the logs for details.',
                    });
                }
            }
        } catch (error) {
            logger.error(`❌ Error executing /log_channel command: ${error.message}`);
            return await interaction.reply({
                content: '❌ **Error:** An error occurred while processing your request.',
                flags: 64,
            });
        }
    },

    /**
     * 🎯 **Handles Autocomplete for the `/log_channel` Command**
     *
     * Provides log type suggestions for `/log_channel` commands.
     *
     * @async
     * @function autocomplete
     * @param interaction - The autocomplete interaction object.
     */
    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === 'log_type') {
                const logTypes = [
                    'transcripts',
                    'moderation_logs',
                    'message_logs',
                    'member_logs',
                    'role_logs',
                    'server_logs',
                    'channel_logs',
                    'voice_logs',
                    'invite_logs',
                    'thread_logs',
                    'reacted_logs',
                    'event_logs',
                    'stage_logs',
                    'boost_logs',
                    'bot_logs',
                    'database_logs',
                ];

                const filtered = logTypes.filter((type) => type.includes(focusedOption.value.toLowerCase()));

                return await interaction.respond(filtered.map((type) => ({ name: type, value: type })).slice(0, 25));
            }
        } catch (error) {
            logger.error(`❌ Error in autocomplete for /log_channel: ${error.message}`);
            return await interaction.respond([]);
        }
    },
};
