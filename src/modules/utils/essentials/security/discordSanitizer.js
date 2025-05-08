const validator = require('validator');
const logger = require('../logger');

function sanitizeInteraction(interaction) {

    if (interaction.isCommand() && interaction.options?.data) {
        interaction.options.data.forEach((option) => {
            if (typeof option.value === 'string') {

                option.value = validator.escape(option.value);
            }
        });
    }

    if (interaction.isModalSubmit() && interaction.fields) {

        interaction.fields.fields.forEach((field) => {
            if (typeof field.value === 'string') {
                field.value = validator.escape(field.value);
            }
        });
    }

    if (interaction.isAutocomplete() && interaction.options) {
        const focused = interaction.options.getFocused();
        if (typeof focused === 'string') {

            interaction.sanitizedFocusedValue = validator.escape(focused);
        }
    }

    if (interaction.isStringSelectMenu() && Array.isArray(interaction.values)) {
        interaction.values = interaction.values.map((value) =>
            typeof value === 'string' ? validator.escape(value) : value
        );
    }

    if (
        interaction.isUserSelectMenu() ||
    interaction.isRoleSelectMenu() ||
    interaction.isChannelSelectMenu() ||
    interaction.isMentionableSelectMenu()
    ) {
        if (Array.isArray(interaction.values)) {
            interaction.values = interaction.values.map((value) =>
                typeof value === 'string' ? validator.escape(value) : value
            );
        }
    }

    if (interaction.isButton() && typeof interaction.customId === 'string') {

        if (!/^[\w-]+$/.test(interaction.customId)) {
            logger.error(
                `Unexpected characters found in button customId: ${interaction.customId}`
            );

        }
    }

}

module.exports = { sanitizeInteraction };
