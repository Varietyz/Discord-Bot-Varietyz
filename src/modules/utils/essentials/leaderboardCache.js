const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 }); 

module.exports = {
    get: (id) => cache.get(`comp:${id}`),
    set: (id, data) => cache.set(`comp:${id}`, data),
    has: (id) => cache.has(`comp:${id}`),
};
