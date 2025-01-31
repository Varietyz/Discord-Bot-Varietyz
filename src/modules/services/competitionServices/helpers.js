// competitionService/helpers.js

/**
 * Divides an array into chunks of specified size.
 * @param {Array} array - The array to chunk.
 * @param {number} size - The size of each chunk.
 * @returns {Array<Array>}
 */
function chunkArray(array, size = 25) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

module.exports = {
    chunkArray,
};
