const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

function get(key) {
    return cache.get(key);
}

function set(key, value, ttl) {
    cache.set(key, value, ttl);
}

function del(key) {
    cache.del(key);
}

function clear() {
    cache.flushAll();
}

function update(key, updater, ttl) {
    const currentValue = cache.get(key);
    const newValue = updater(currentValue);
    cache.set(key, newValue, ttl);
    return newValue;
}

module.exports = {
    get,
    set,
    del,
    clear,
    update,
};
