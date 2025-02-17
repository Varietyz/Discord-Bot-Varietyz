const logger = require('../../utils/essentials/logger');

const modalHandlers = new Map();
const modalBuilders = new Map(); // Store modal objects

/**
 * 🎯 **Registers a Modal Handler**
 * @param {string} modalId - The custom ID of the modal.
 * @param {Function} handler - The function to handle the modal submission.
 * @param modal - The modal object itself.
 */
function registerModal(modalId, handler, modal) {
    if (modalHandlers.has(modalId)) {
        logger.warn(`⚠️ Modal handler for "${modalId}" is already registered. Skipping duplicate.`);
        return;
    }
    modalHandlers.set(modalId, handler);
    modalBuilders.set(modalId, modal);
    logger.info(`✅ Registered modal: ${modalId}`);
}

/**
 * 🎯 **Retrieves a Modal by ID**
 * @param {string} modalId - The custom ID of the modal.
 * @returns The modal object if found, otherwise null.
 */
function getModal(modalId) {
    return modalBuilders.get(modalId) || null;
}

/**
 * 🎯 **Handles Incoming Modal Submissions**
 * @param {import('discord.js').ModalSubmitInteraction} interaction - The modal interaction object.
 */
async function handleModalSubmission(interaction) {
    const handler = modalHandlers.get(interaction.customId);

    if (!handler) {
        logger.warn(`⚠️ No handler found for modal ID: ${interaction.customId}`);
        return;
    }

    try {
        await handler(interaction);
    } catch (error) {
        logger.error(`❌ Error processing modal "${interaction.customId}": ${error.message}`);
        await interaction.reply({ content: '❌ Error processing your request.', flags: 64 });
    }
}

module.exports = { registerModal, getModal, handleModalSubmission };
