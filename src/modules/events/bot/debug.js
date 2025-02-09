const logger = require('../../utils/logger');

module.exports = {
    name: 'debug',
    once: false,
    async execute(info) {
        logger.debug(`🐞 Debug Info: ${info}`);
    },
};
