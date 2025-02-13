/**
 * @fileoverview
 * **Sleep Utility** ⏳
 *
 * This module provides a utility function for creating delays in execution.
 * It offers a simple, promise-based mechanism to pause asynchronous operations
 * for a specified duration. This is especially useful in async/await workflows to
 * introduce delays without blocking the event loop.
 *
 * **Key Features:**
 * - **Promise-based Delay:** Returns a promise that resolves after the specified time.
 * - **Input Validation:** Ensures the delay duration is a non-negative number.
 * - **Ease of Use:** Simplifies adding delays in asynchronous operations.
 *
 * @module utils/sleepUtil
 */

/**
 * Pauses execution for a specified number of milliseconds.
 *
 * This function returns a promise that resolves after the specified duration,
 * allowing asynchronous functions to use `await` to introduce a delay.
 *
 * @function sleep
 * @param {number} ms - The number of milliseconds to delay. Must be a non-negative number.
 * @returns {Promise<void>} A promise that resolves after the specified duration.
 * @throws {TypeError} If the provided `ms` is not a number or is negative.
 *
 * @example
 * // Example: Pause execution for 2 seconds.
 * async function example() {
 *     console.log('⏳ Start');
 *     await sleep(2000);
 *     console.log('✅ End'); // "End" will log after approximately 2 seconds.
 * }
 */
async function sleep(ms) {
    if (typeof ms !== 'number' || ms < 0) {
        throw new TypeError('🚨 **Invalid Parameter:** The `ms` parameter must be a non-negative number.');
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    sleep,
};
