/* eslint-disable no-process-exit */
/* eslint-disable jsdoc/check-param-names */
// @ts-nocheck
const logger = require('./logger');

/**
 * Executes the appropriate slash command based on the interaction.
 *
 * @async
 * @function handleSlashCommand
 * @param {CommandInteraction} interaction - The command interaction to handle.
 * @param {Array<Object>} commands - An array of command objects.
 * @returns {Promise<void>} Resolves when the command has been executed.
 *
 * @example
 * // Invoked internally when a slash command is triggered.
 * handleSlashCommand(interaction, commands);
 */
async function handleSlashCommand(interaction, commands) {
    try {
        const command = commands.find((cmd) => cmd.data.name === interaction.commandName);

        if (!command) {
            logger.warn(`❌ **Unknown Command:** \`${interaction.commandName}\` is not recognized.`);
            return;
        }

        await command.execute(interaction);
        logger.info(`✅ **Success:** \`${interaction.commandName}\` executed successfully. 🎉`);
    } catch (err) {
        logger.error(`🚨 **Execution Error:** Error executing \`${interaction.commandName}\`: ${err.message}`);
    }
}

/**
 * Handles autocomplete interactions by delegating to the appropriate command's autocomplete handler.
 *
 * @async
 * @function handleAutocomplete
 * @param {AutocompleteInteraction} interaction - The autocomplete interaction to handle.
 * @param {Array<Object>} commands - An array of command objects.
 * @returns {Promise<void>} Resolves when the autocomplete interaction is processed.
 *
 * @example
 * // Invoked internally when an autocomplete interaction is triggered.
 * handleAutocomplete(interaction, commands);
 */
async function handleAutocomplete(interaction, commands) {
    try {
        const command = commands.find((cmd) => cmd.data.name === interaction.commandName);

        if (!command) {
            logger.warn(`❌ **Autocomplete Error:** Unknown command \`${interaction.commandName}\`.`);
            return;
        }

        if (!command.autocomplete) {
            logger.warn(`⚠️ **Missing Handler:** Autocomplete not implemented for \`${interaction.commandName}\`.`);
            return;
        }

        await command.autocomplete(interaction);
        logger.info(`✅ **Autocomplete:** \`${interaction.commandName}\` handled successfully. 🎉`);
    } catch (err) {
        logger.error(`🚨 **Autocomplete Error:** Error processing \`${interaction.commandName}\`: ${err.message}`);
        await interaction.respond([]);
    }
}

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`🚨 **Unhandled Rejection:** at \`${promise}\` | Reason: ${reason}`);
});

process.on('uncaughtException', (error) => {
    logger.error(`🚨 **Uncaught Exception:** ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
});

module.exports = {
    handleAutocomplete,
    handleSlashCommand,
};
