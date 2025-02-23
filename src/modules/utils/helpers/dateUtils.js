function calculateEndDate(rotationWeeks) {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 60000);
    const dayOfWeek = startsAt.getUTCDay();
    let daysUntilSunday = (7 - dayOfWeek) % 7;
    if (daysUntilSunday === 0) {
        daysUntilSunday = 7;
    }
    const firstSunday = new Date(startsAt);
    firstSunday.setUTCDate(startsAt.getUTCDate() + daysUntilSunday);
    firstSunday.setUTCHours(23, 59, 0, 0);
    const totalWeeksToAdd = rotationWeeks - 1;
    if (totalWeeksToAdd > 0) {
        firstSunday.setUTCDate(firstSunday.getUTCDate() + totalWeeksToAdd * 7);
    }
    return firstSunday;
}
module.exports = { calculateEndDate };
