const NodeCache = require('node-cache');

const failCache = new NodeCache(); 

module.exports = {
    has: (key) => failCache.has(key),
    set: (key, value = true, ttl = 1800) => failCache.set(key, value, ttl), 
    get: (key) => failCache.get(key),
    del: (key) => failCache.del(key),
};
