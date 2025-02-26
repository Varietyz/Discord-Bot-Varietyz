const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const {
    guild: { runQuery, getAll },
} = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
const { ensureLoggingCategory } = require('../../../utils/essentials/ensureLoggingCategory');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('logging_channels')
        .setDescription('ADMIN: Manage logging channels')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand((subcommand) =>
            subcommand
                .setName('change')
                .setDescription('ADMIN: Assign a log channel to an event type.')
                .addStringOption((option) => option.setName('assign').setDescription('The type of log to assign.').setRequired(true).setAutocomplete(true))
                .addChannelOption((option) => option.setName('channel').setDescription('The Discord channel to assign.').setRequired(true)),
        )
        .addSubcommand((subcommand) => subcommand.setName('list').setDescription('ADMIN: View all assigned log channels.'))
        .addSubcommand((subcommand) => subcommand.setName('setup').setDescription('ADMIN: Automatically generate all logging channels.'))
        .addSubcommand((subcommand) => subcommand.setName('remove_all').setDescription('ADMIN: Remove all log channels and clear database entries.')),
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const logType = interaction.options.getString('assign');
            const channel = interaction.options.getChannel('channel');
            if (subcommand === 'change') {
                if (!channel || !channel.isTextBased()) {
                    return await interaction.reply({
                        content: '❌ **Invalid Channel:** Please select a text-based channel.',
                        flags: 64,
                    });
                }
                await runQuery('INSERT INTO ensured_channels (channel_key, channel_id) VALUES (?, ?) ON CONFLICT(channel_key) DO UPDATE SET channel_id = ?', [logType, channel.id, channel.id]);
                logger.info(`✅ Log channel for '${logType}' set to #${channel.name} (ID: ${channel.id}).`);
                return await interaction.reply({
                    content: `✅ **Success:** The log channel for \`${logType}\` has been updated to <#${channel.id}>.`,
                    flags: 64,
                });
            } else if (subcommand === 'list') {
                const logChannels = await getAll('SELECT channel_key, channel_id FROM ensured_channels');
                if (logChannels.length === 0) {
                    return await interaction.reply({
                        content: '📜 **No log channels are currently assigned.** Use `/log_channel set` to configure them.',
                        flags: 64,
                    });
                }
                const embed = new EmbedBuilder()
                    .setTitle('📋 Assigned Log Channels')
                    .setColor(0x3498db)
                    .setDescription(logChannels.map((row) => `🔹 **\`${row.channel_key}\`** → <#${row.channel_id}>`).join('\n'))
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], flags: 64 });
            } else if (subcommand === 'setup') {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: 64 });
                }
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
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: 64 });
                }
                try {
                    const logChannels = await getAll('SELECT channel_id FROM ensured_channels');
                    const loggingCategory = interaction.guild.channels.cache.find((ch) => ch.type === 4 && ch.name === '📁 ‣‣ LOGGING');
                    if (logChannels.length === 0 && !loggingCategory) {
                        return await interaction.editReply({
                            content: '📜 **No logging channels or categories exist to remove.**',
                        });
                    }
                    for (const { channel_id } of logChannels) {
                        const channel = interaction.guild.channels.cache.get(channel_id);
                        if (channel) {
                            await channel.delete().catch((err) => logger.warn(`⚠️ Failed to delete channel ${channel.id}: ${err.message}`));
                        }
                    }
                    await runQuery('DELETE FROM ensured_channels');
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
                    'critical_alerts',
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
