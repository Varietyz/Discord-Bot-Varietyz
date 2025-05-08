function normalizeStr(str) {
    if (typeof str !== 'string') {
        return '';
    }
    return str
        .replace(/[-\s]+/g, '_') 
        .toLowerCase(); 
}

module.exports = normalizeStr;
