// @ts-nocheck
/**
 * @fileoverview Implements the `/check_activity` command to display active and inactive players.
 * This command provides insights into player activity by fetching data from the database
 * and presenting it with pagination support.
 *
 * Core Features: (Administrator-only command)
 * - Displays active or inactive players based on recent progression.
 * - Paginated display of player data with navigation controls.
 * - Includes the last progress timestamp for each player.
 * - Displays total count of active or inactive players.
 * - Supports interactive buttons for page navigation and closing.
 *
 * External Dependencies:
 * - **Discord.js**: For handling slash commands, creating embeds, and managing interactive buttons.
 * - **Luxon**: For date and time manipulation (calculating progression and inactivity).
 * - **SQLite**: For retrieving player activity data from the database.
 *
 * @module modules/commands/check_activity
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, PermissionsBitField, ButtonStyle } = require('discord.js');
const { DateTime } = require('luxon');
const logger = require('../utils/logger');
const { calculateProgressCount, calculateInactivity } = require('../utils/calculateActivity');
const { getAll } = require('../utils/dbUtils');
const { updateActivityData } = require('../services/active_members');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check_activity')
        .setDescription('View active and inactive players based on their recent progression.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption((option) => option.setName('status').setDescription('Choose to view active or inactive players.').setRequired(true).addChoices({ name: 'Active', value: 'active' }, { name: 'Inactive', value: 'inactive' })),

    /**
     * Executes the `/check_activity` command, displaying active or inactive players with pagination.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the command.
     * @returns {Promise<void>} Resolves when the command is executed successfully.
     */
    async execute(interaction) {
        try {
            logger.info(`Command 'check_activity' triggered by user: ${interaction.user.username}`);
            await interaction.deferReply({ flags: 64 });

            const status = interaction.options.getString('status');

            // Update the database with the latest data before calculating
            await updateActivityData();

            const count = status === 'active' ? await calculateProgressCount() : await calculateInactivity();

            if (count === 0) {
                const message = status === 'active' ? '> 🟢 No players have progressed in the last 7 days.' : '> 🔴 No players have been inactive for more than 21 days.';
                return await interaction.editReply({ content: message });
            }

            const players =
                status === 'active'
                    ? await getAll('SELECT username, last_progressed FROM active_inactive WHERE last_progressed >= ? ORDER BY last_progressed ASC', [DateTime.now().minus({ days: 7 }).toISO()])
                    : await getAll('SELECT username, last_progressed FROM active_inactive WHERE last_progressed < ? ORDER BY last_progressed ASC', [DateTime.now().minus({ days: 21 }).toISO()]);

            const statusEmoji = status === 'active' ? '🟢' : '🔴';

            const ITEMS_PER_PAGE = 10;

            const pages = [];
            for (let i = 0; i < players.length; i += ITEMS_PER_PAGE) {
                const pagePlayers = players.slice(i, i + ITEMS_PER_PAGE);
                const embed = new EmbedBuilder()
                    .setTitle(`📊 Players - ${status.charAt(0).toUpperCase() + status.slice(1)}`)
                    .setColor(status === 'active' ? 'Green' : 'Red')
                    .setDescription(pagePlayers.map(({ username, last_progressed }, index) => `🕒 **${i + index + 1}. \`${username}\`**Last Progressed: \`${DateTime.fromISO(last_progressed).toRelative()}\``).join('\n'))
                    .addFields({ name: 'Status', value: `${statusEmoji} \`` + status.charAt(0).toUpperCase() + status.slice(1) + '`', inline: true }, { name: 'Total Players', value: `\`${count}\``, inline: true })
                    .setFooter({ text: `Page ${Math.floor(i / ITEMS_PER_PAGE) + 1}/${Math.ceil(players.length / ITEMS_PER_PAGE)}` });

                pages.push(embed);
            }

            let currentPage = 0;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('previous').setLabel('◀️ Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pages.length === 1),
                new ButtonBuilder().setCustomId('close').setLabel('❌ Close').setStyle(ButtonStyle.Danger),
            );

            const message = await interaction.editReply({
                embeds: [pages[currentPage]],
                components: [row],
            });

            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 60000,
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'previous') {
                    currentPage--;
                } else if (i.customId === 'next') {
                    currentPage++;
                } else if (i.customId === 'close') {
                    collector.stop('closed');
                    return await i.update({ content: '⛔ Navigation closed.', components: [], embeds: [] });
                }

                row.components[0].setDisabled(currentPage === 0);
                row.components[1].setDisabled(currentPage === pages.length - 1);

                await i.update({
                    embeds: [pages[currentPage]],
                    components: [row],
                });
            });

            collector.on('end', async (_, reason) => {
                if (reason === 'time') {
                    await interaction.editReply({
                        content: '⏳ Navigation timed out.',
                        components: [],
                    });
                }
            });
        } catch (err) {
            logger.error(`Error executing check_activity command: ${err.message}`);
            await interaction.editReply({
                content: '❌ An error occurred while executing the command. Please try again later. 🛠️',
            });
        }
    },
};
