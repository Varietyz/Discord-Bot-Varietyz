// src/modules/utils/dateUtils.js

/**
 * Calculates the end date for a competition based on rotation weeks.
 * Ends on Sunday at 23:59 UTC.
 * @param {number} rotationWeeks - Number of weeks for the competition duration.
 * @returns {Date} - The end date set to Sunday at 23:59 UTC.
 */
function calculateEndDate(rotationWeeks) {
    const now = new Date();

    // Start time is now + 1 minute
    const startsAt = new Date(now.getTime() + 60000); // Current time + 1 minute

    // Find the upcoming Sunday's date
    const dayOfWeek = startsAt.getUTCDay(); // 0 (Sunday) to 6 (Saturday)
    let daysUntilSunday = (7 - dayOfWeek) % 7;
    if (daysUntilSunday === 0) {
        daysUntilSunday = 7; // If today is Sunday, schedule to next Sunday
    }

    // Calculate the date of the first Sunday
    const firstSunday = new Date(startsAt);
    firstSunday.setUTCDate(startsAt.getUTCDate() + daysUntilSunday);
    firstSunday.setUTCHours(23, 59, 0, 0); // Set to 23:59 UTC

    // Add additional weeks based on rotationWeeks
    const totalWeeksToAdd = rotationWeeks - 1;
    if (totalWeeksToAdd > 0) {
        firstSunday.setUTCDate(firstSunday.getUTCDate() + totalWeeksToAdd * 7);
    }

    return firstSunday;
}

module.exports = { calculateEndDate };
