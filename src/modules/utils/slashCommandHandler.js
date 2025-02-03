/* eslint-disable no-process-exit */
/* eslint-disable jsdoc/check-param-names */
// @ts-nocheck
const logger = require('./logger');

/**
 * Executes the appropriate slash command based on the interaction.
 *
 * @async
 * @param commands
 * @function handleSlashCommand
 * @param {CommandInteraction} interaction - The command interaction to handle.
 * @returns {Promise<void>} Resolves when the command has been executed.
 *
 * @example
 * // This function is invoked internally when a slash command is triggered.
 */
async function handleSlashCommand(interaction, commands) {
    try {
        // Find the appropriate command based on the interaction's name.
        const command = commands.find((cmd) => cmd.data.name === interaction.commandName);

        if (!command) {
            logger.warn(`Unknown command: ${interaction.commandName}`);
            return;
        }

        // Execute the command.
        await command.execute(interaction);
        logger.info(`${interaction.commandName} command executed successfully.`);
    } catch (err) {
        logger.error(`Error executing ${interaction.commandName}: ${err.message}`);
        await interaction.reply({
            content: 'Something went wrong while processing your command.',
            flags: 64, // EPHEMERAL flag.
        });
    }
}

/**
 * Handles autocomplete interactions by delegating to the appropriate command's autocomplete handler.
 *
 * @async
 * @param commands
 * @function handleAutocomplete
 * @param {AutocompleteInteraction} interaction - The autocomplete interaction to handle.
 * @returns {Promise<void>} Resolves when the autocomplete interaction is processed.
 *
 * @example
 * // This function is invoked internally when an autocomplete interaction is triggered.
 */
async function handleAutocomplete(interaction, commands) {
    try {
        // Find the appropriate command based on the interaction's name.
        const command = commands.find((cmd) => cmd.data.name === interaction.commandName);

        if (!command) {
            logger.warn(`Autocomplete trigger failed: Unknown command ${interaction.commandName}`);
            return;
        }

        if (!command.autocomplete) {
            logger.warn(`Autocomplete handler not implemented for command: ${interaction.commandName}`);
            return;
        }

        // Execute the autocomplete handler.
        await command.autocomplete(interaction);
        logger.info(`Autocomplete triggered for command ${interaction.commandName}`);
    } catch (err) {
        logger.error(`Error processing autocomplete for ${interaction.commandName}: ${err.message}`);
        await interaction.respond([]); // Send an empty array if there is an error.
    }
}

// Handle unhandled promise rejections.
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise} | Reason: ${reason}`);
});

// Handle uncaught exceptions.
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    logger.error(error.stack);
    process.exit(1); // Exit the process to prevent unknown states.
});

module.exports = {
    handleAutocomplete,
    handleSlashCommand,
};
