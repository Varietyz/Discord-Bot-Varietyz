/**
 * Pauses execution for a specified number of milliseconds.
 *
 * @param {number} ms - Milliseconds to sleep.
 * @returns {Promise<void>}
 * @example
 * // Sleeps for 2 seconds
 * await sleep(2000);
 */
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    sleep,
};
