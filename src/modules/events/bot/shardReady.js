const logger = require('../../utils/logger');

module.exports = {
    name: 'shardReady',
    once: false,
    async execute(id) {
        logger.info(`✅ Shard ${id} is Ready.`);
    },
};
