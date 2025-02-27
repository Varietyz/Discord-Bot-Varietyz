/**
 *
 * @param str
 */
function normalizeStr(str) {
    if (typeof str !== 'string') {
        return '';
    }
    return str.replace(/[-]/g, '_').replace(/\s+/g, '_').trim().toLowerCase();
}
module.exports = normalizeStr;
