/* eslint-disable jsdoc/require-returns */
const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const {
    guild: { runQuery, getAll },
} = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
const { ensureBasicChannels } = require('../../../utils/essentials/ensureBasicChannels');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('basic_channel')
        .setDescription('Manage basic channels')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand((subcommand) =>
            subcommand
                .setName('set')
                .setDescription('Assign a basic channel.')
                .addStringOption((option) => option.setName('assign').setDescription('Assign the channels type.').setRequired(true).setAutocomplete(true))
                .addChannelOption((option) => option.setName('channel').setDescription('The Discord channel to assign.').setRequired(true)),
        )
        .addSubcommand((subcommand) => subcommand.setName('list').setDescription('View all assigned basic channels.'))
        .addSubcommand((subcommand) => subcommand.setName('generate').setDescription('Automatically generate all basic channels.'))
        .addSubcommand((subcommand) => subcommand.setName('remove_all').setDescription('Remove all basic channels and clear database entries.')),

    /**
     * 🎯 **Executes the `/basic_channel` command**
     *
     * Handles setting, enabling, disabling, listing, generating, and removing basic channels.
     *
     * @async
     * @function execute
     * @param interaction - The command interaction object.
     */
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const compType = interaction.options.getString('assign');
            const channel = interaction.options.getChannel('channel');

            if (subcommand === 'set') {
                if (!channel || !channel.isTextBased()) {
                    return await interaction.reply({
                        content: '❌ **Invalid Channel:** Please select a text-based channel.',
                        flags: 64,
                    });
                }

                await runQuery('INSERT INTO setup_channels (setup_key, channel_id) VALUES (?, ?) ON CONFLICT(setup_key) DO UPDATE SET channel_id = ?', [compType, channel.id, channel.id]);

                logger.info(`✅ Log channel for '${compType}' set to #${channel.name} (ID: ${channel.id}).`);
                return await interaction.reply({
                    content: `✅ **Success:** The basic channel for \`${compType}\` has been updated to <#${channel.id}>.`,
                    flags: 64,
                });
            } else if (subcommand === 'list') {
                const logChannels = await getAll('SELECT setup_key, channel_id FROM setup_channels');

                if (logChannels.length === 0) {
                    return await interaction.reply({
                        content: '📜 **No basic channels are currently assigned.** Use `/basic_channel set` to configure them.',
                        flags: 64,
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('📋 Assigned Basic Channels')
                    .setColor(0x3498db)
                    .setDescription(logChannels.map((row) => `🔹 **\`${row.setup_key}\`** → <#${row.channel_id}>`).join('\n'))
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed], flags: 64 });
            } else if (subcommand === 'generate') {
                await interaction.deferReply({ flags: 64 });

                try {
                    await ensureBasicChannels(interaction.guild);
                    logger.info('✅ Successfully generated basic channels.');
                    return await interaction.editReply({
                        content: '✅ **Success:** Competition channels have been generated successfully.',
                    });
                } catch (error) {
                    logger.error(`❌ Error generating basic channels: ${error.message}`);
                    return await interaction.editReply({
                        content: '❌ **Error:** Failed to generate basic channels. Please check the logs for details.',
                    });
                }
            } else if (subcommand === 'remove_all') {
                await interaction.deferReply({ flags: 64 });

                try {
                    // 🔍 Find all assigned basic channels in the database
                    const logChannels = await getAll('SELECT channel_id FROM setup_channels');

                    // 🔍 Find the Logging Category
                    const loggingCategory = interaction.guild.channels.cache.find(
                        (ch) => ch.type === 4 && ch.name === '🏆COMPETITIONS OF THE WEEK', // 4 is ChannelType.GuildCategory
                    );

                    if (logChannels.length === 0 && !loggingCategory) {
                        return await interaction.editReply({
                            content: '📜 **No basic channels or categories exist to remove.**',
                        });
                    }

                    // 🗑️ Delete all basic channels
                    for (const { channel_id } of logChannels) {
                        const channel = interaction.guild.channels.cache.get(channel_id);
                        if (channel) {
                            await channel.delete().catch((err) => logger.warn(`⚠️ Failed to delete channel ${channel.id}: ${err.message}`));
                        }
                    }

                    // 🗑️ Clear basic channels from the database
                    await runQuery('DELETE FROM setup_channels');

                    // 🗑️ Delete the logging category (if found)
                    if (loggingCategory) {
                        await loggingCategory.delete().catch((err) => logger.warn(`⚠️ Failed to delete logging category: ${err.message}`));
                    }

                    logger.info('🗑️ Successfully removed all basic channels and the category.');
                    return await interaction.editReply({
                        content: '🗑️ **Success:** All basic channels and the category have been removed, and the database has been cleared.',
                    });
                } catch (error) {
                    logger.error(`❌ Error removing basic channels: ${error.message}`);
                    return await interaction.editReply({
                        content: '❌ **Error:** Failed to remove basic channels. Please check the logs for details.',
                    });
                }
            }
        } catch (error) {
            logger.error(`❌ Error executing /basic_channel command: ${error.message}`);
            return await interaction.reply({
                content: '❌ **Error:** An error occurred while processing your request.',
                flags: 64,
            });
        }
    },

    /**
     * 🎯 **Handles Autocomplete for the `/basic_channel` Command**
     *
     * Provides log type suggestions for `/basic_channel` commands.
     *
     * @async
     * @function autocomplete
     * @param interaction - The autocomplete interaction object.
     */
    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === 'basic_type') {
                const compTypes = ['clan_members_channel', 'name_change_channel', 'auto_roles_channel', 'activity_voice_channel'];

                const filtered = compTypes.filter((type) => type.includes(focusedOption.value.toLowerCase()));

                return await interaction.respond(filtered.map((type) => ({ name: type, value: type })).slice(0, 25));
            }
        } catch (error) {
            logger.error(`❌ Error in autocomplete for /basic_channel: ${error.message}`);
            return await interaction.respond([]);
        }
    },
};
