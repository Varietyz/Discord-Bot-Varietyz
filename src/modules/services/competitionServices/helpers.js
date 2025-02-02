// competitionService/helpers.js

/**
 * @fileoverview
 * **Helper Functions for Competition Service** 🛠️
 *
 * This module provides utility functions to assist with data manipulation tasks
 * in the competition service, such as splitting an array into smaller chunks.
 *
 * @module competitionService/helpers
 */

/**
 * 🎯 **Divides an Array into Chunks**
 *
 * Splits the provided array into smaller arrays (chunks) of a specified maximum size.
 * This is useful for batching data when processing large datasets or sending messages
 * with rate limits.
 *
 * @param {Array} array - The array to be divided into chunks.
 * @param {number} [size=25] - The maximum number of elements per chunk.
 * @returns {Array<Array>} An array of chunked arrays.
 *
 * @example
 * const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * const chunks = chunkArray(numbers, 3);
 * // Result: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]
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
