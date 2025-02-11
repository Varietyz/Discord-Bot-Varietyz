const logger = require('../../../utils/logger');

module.exports = {
    name: 'shardResume',
    once: false,
    async execute(id, replayedEvents) {
        logger.info(`🎯 Shard ${id} Resumed (${replayedEvents} Events Replayed).`);
    },
};
