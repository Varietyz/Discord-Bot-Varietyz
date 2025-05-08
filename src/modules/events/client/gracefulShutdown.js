const globalState = require('../../../config/globalState');
const {
    cancelAllDbOperations,
    closeDatabases,
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');

async function gracefulShutdown(signal, client) {
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);
    globalState.isShuttingDown = true;
    try {
        if (client && typeof client.destroy === 'function') {
            await client.destroy();
            logger.info('✅ Discord client successfully destroyed.');
        } else {
            logger.error(
                '❌ Discord client instance is not properly initialized or does not have a destroy function.'
            );
        }

        cancelAllDbOperations();

        await new Promise((resolve) => setTimeout(resolve, 2000));
        await closeDatabases();
        await WOMApiClient.close();
        logger.info('✅ Shutdown complete. Exiting now.');
        process.exit(0);
    } catch (error) {
        logger.error(`Error during shutdown: ${error.message}`);
        process.exit(1);
    }
}

module.exports = gracefulShutdown;
