/**
 * @fileoverview Utility function for creating delays in execution.
 * Provides a simple mechanism to pause asynchronous operations for a specified duration.
 *
 * Key Features:
 * - **Promise-based Delay**: Returns a promise that resolves after the specified time, enabling pauses in async/await workflows.
 * - **Input Validation**: Ensures the delay duration is a non-negative number, throwing an error for invalid input.
 * - **Ease of Use**: Simplifies the process of adding delays in scripts or workflows.
 *
 * External Dependencies:
 * - None.
 *
 * @module utils/sleepUtil
 */

/**
 * Pauses execution for a specified number of milliseconds.
 *
 * This function creates a delay by returning a promise that resolves after the specified time.
 * It can be used in asynchronous functions with `await` to pause execution temporarily.
 *
 * @function sleep
 * @param {number} ms - The number of milliseconds to sleep. Must be a non-negative number.
 * @returns {Promise<void>} A promise that resolves after the specified duration.
 * @throws {TypeError} If the provided `ms` is not a number or is negative.
 * @example
 * // Example of pausing execution for 2 seconds
 * async function example() {
 *     console.log('Start');
 *     await sleep(2000);
 *     console.log('End'); // Logs "End" after 2 seconds
 * }
 */
async function sleep(ms) {
    if (typeof ms !== 'number' || ms < 0) {
        throw new TypeError('The "ms" parameter must be a non-negative number.');
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    sleep,
};
