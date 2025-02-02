// src/modules/utils/dateUtils.js

/**
 * Calculates the end date for a competition based on the number of rotation weeks.
 * The end date is set to the upcoming Sunday at 23:59 UTC, with additional weeks added as specified.
 *
 * - The competition start time is considered as one minute from the current time.
 * - If today is Sunday, the competition will end on the next Sunday.
 *
 * @param {number} rotationWeeks - The number of weeks for the competition duration.
 * @returns {Date} The calculated end date set to Sunday at 23:59 UTC.
 *
 * @example
 * // Calculate the end date for a competition lasting 2 weeks:
 * const endDate = calculateEndDate(2);
 * console.log(endDate); // Outputs a Date object for the Sunday 23:59 UTC two weeks from now.
 */
function calculateEndDate(rotationWeeks) {
    const now = new Date();

    // Start time is now + 1 minute.
    const startsAt = new Date(now.getTime() + 60000); // Current time + 1 minute.

    // Determine the current day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
    const dayOfWeek = startsAt.getUTCDay();
    // Calculate days until the next Sunday.
    let daysUntilSunday = (7 - dayOfWeek) % 7;
    if (daysUntilSunday === 0) {
        daysUntilSunday = 7; // If today is Sunday, schedule for the next Sunday.
    }

    // Calculate the date for the first upcoming Sunday.
    const firstSunday = new Date(startsAt);
    firstSunday.setUTCDate(startsAt.getUTCDate() + daysUntilSunday);
    firstSunday.setUTCHours(23, 59, 0, 0); // Set time to 23:59 UTC.

    // Add additional weeks to the first Sunday based on the rotationWeeks parameter.
    const totalWeeksToAdd = rotationWeeks - 1;
    if (totalWeeksToAdd > 0) {
        firstSunday.setUTCDate(firstSunday.getUTCDate() + totalWeeksToAdd * 7);
    }

    return firstSunday;
}

module.exports = { calculateEndDate };
