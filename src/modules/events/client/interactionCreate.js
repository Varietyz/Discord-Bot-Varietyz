// src/modules/events/interactionCreate.js

const { handleAutocomplete, handleSlashCommand } = require('../../utils/slashCommandHandler');

module.exports = {
    name: 'interactionCreate', // Event name
    once: false,
    /**
     * Execute when an interaction is created.
     * @param {import('discord.js').Interaction} interaction - The Discord interaction object.
     * @param client
     */
    async execute(interaction, client) {
        // Handle slash commands and autocomplete using the commands attached to the client.
        if (interaction.isCommand()) {
            await handleSlashCommand(interaction, client.commands);
        } else if (interaction.isAutocomplete()) {
            await handleAutocomplete(interaction, client.commands);
        } else if (interaction.isStringSelectMenu()) {
            // For select menus, we delegate to the competition service attached to the client.
            if (interaction.customId === 'vote_dropdown' && client.competitionService) {
                await client.competitionService.handleVote(interaction);
            }
        }
    },
};
