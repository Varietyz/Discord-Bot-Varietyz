const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const {
    guild: { runQuery, getAll },
} = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
const { ensureBingoCategory } = require('../../../utils/essentials/ensureBingoCategory');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ensured_channels')
        .setDescription('ADMIN: Manage bingo channels')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand((subcommand) =>
            subcommand
                .setName('change')
                .setDescription('ADMIN: Assign a setup channel.')
                .addStringOption((option) => option.setName('assign').setDescription('Assign the channels type.').setRequired(true).setAutocomplete(true))
                .addChannelOption((option) => option.setName('channel').setDescription('The Discord channel to assign.').setRequired(true)),
        )
        .addSubcommand((subcommand) => subcommand.setName('list').setDescription('ADMIN: View all assigned bingo channels.'))
        .addSubcommand((subcommand) => subcommand.setName('setup').setDescription('ADMIN: Automatically generate all bingo channels.'))
        .addSubcommand((subcommand) => subcommand.setName('remove_all').setDescription('ADMIN: Remove all bingo channels and clear database entries.')),
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const compType = interaction.options.getString('assign');
            const channel = interaction.options.getChannel('channel');
            if (subcommand === 'change') {
                if (!channel || !channel.isTextBased()) {
                    return await interaction.reply({
                        content: '❌ **Invalid Channel:** Please select a text-based channel.',
                        flags: 64,
                    });
                }
                await runQuery('INSERT INTO ensured_channels (channel_key, channel_id) VALUES (?, ?) ON CONFLICT(channel_key) DO UPDATE SET channel_id = ?', [compType, channel.id, channel.id]);
                logger.info(`✅ Log channel for '${compType}' set to #${channel.name} (ID: ${channel.id}).`);
                return await interaction.reply({
                    content: `✅ **Success:** The bingo channel for \`${compType}\` has been updated to <#${channel.id}>.`,
                    flags: 64,
                });
            } else if (subcommand === 'list') {
                const logChannels = await getAll('SELECT channel_key, channel_id FROM ensured_channels');
                if (logChannels.length === 0) {
                    return await interaction.reply({
                        content: '📜 **No bingo channels are currently assigned.** Use `/basic_channel set` to configure them.',
                        flags: 64,
                    });
                }
                const embed = new EmbedBuilder()
                    .setTitle('📋 Assigned Bingo Channels')
                    .setColor(0x3498db)
                    .setDescription(logChannels.map((row) => `🔹 **\`${row.channel_key}\`** → <#${row.channel_id}>`).join('\n'))
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], flags: 64 });
            } else if (subcommand === 'setup') {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: 64 });
                }
                try {
                    await ensureBingoCategory(interaction.guild);
                    logger.info('✅ Successfully generated bingo channels.');
                    return await interaction.editReply({
                        content: '✅ **Success:** Competition channels have been generated successfully.',
                    });
                } catch (error) {
                    logger.error(`❌ Error generating bingo channels: ${error.message}`);
                    return await interaction.editReply({
                        content: '❌ **Error:** Failed to generate bingo channels. Please check the logs for details.',
                    });
                }
            } else if (subcommand === 'remove_all') {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: 64 });
                }
                try {
                    const logChannels = await getAll('SELECT channel_id FROM ensured_channels');
                    if (logChannels.length === 0) {
                        return await interaction.editReply({
                            content: '📜 **No bingo channels or categories exist to remove.**',
                        });
                    }
                    for (const { channel_id } of logChannels) {
                        const channel = interaction.guild.channels.cache.get(channel_id);
                        if (channel) {
                            await channel.delete().catch((err) => logger.warn(`⚠️ Failed to delete channel ${channel.id}: ${err.message}`));
                        }
                    }
                    await runQuery('DELETE FROM ensured_channels');
                    logger.info('🗑️ Successfully removed all bingo channels and the category.');
                    return await interaction.editReply({
                        content: '🗑️ **Success:** All bingo channels and the category have been removed, and the database has been cleared.',
                    });
                } catch (error) {
                    logger.error(`❌ Error removing bingo channels: ${error.message}`);
                    return await interaction.editReply({
                        content: '❌ **Error:** Failed to remove bingo channels. Please check the logs for details.',
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
    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);
            if (focusedOption.name === 'assign') {
                const compTypes = ['bingo_notification_channel', 'bingo_card_channel', 'bingo_leaderboard_channel', 'bingo_patterns_channel'];
                const filtered = compTypes.filter((type) => type.toLowerCase().includes(focusedOption.value.toLowerCase()));
                return await interaction.respond(filtered.map((type) => ({ name: type, value: type })).slice(0, 25));
            }
            if (focusedOption.name === 'channel') {
                if (!interaction.guild) return await interaction.respond([]);
                const suggestions = interaction.guild.channels.cache.filter((ch) => ch.isTextBased() && ch.name.toLowerCase().includes(focusedOption.value.toLowerCase())).map((ch) => ({ name: ch.name, value: ch.id }));
                return await interaction.respond(suggestions.slice(0, 25));
            }
            return await interaction.respond([]);
        } catch (error) {
            logger.error(`❌ Error in autocomplete for /basic_channel: ${error.message}`);
            return await interaction.respond([]);
        }
    },
};
