const logger = require('../../utils/logger');

module.exports = {
    name: 'debug',
    once: false,
    async execute(info) {
        // Exclude debug messages related to heartbeat events.
        // This regex checks for a shard indicator (e.g., "[WS => Shard 0]")
        // and the word "heartbeat" anywhere in the message.
        if (/\[WS\s*=>\s*Shard\s*\d+\]/i.test(info) && /heartbeat/i.test(info)) {
            return;
        }
        logger.debug(`🐞 Debug Info: ${info}`);
    },
};
