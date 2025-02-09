const logger = require('../../utils/logger');

module.exports = {
    name: 'shardReconnecting',
    once: false,
    async execute(id) {
        logger.warn(`🔄 Shard ${id} is Reconnecting...`);
    },
};
