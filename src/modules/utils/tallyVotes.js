const db = require('./dbUtils');
const logger = require('./logger');

/**
 * 🎯 **Tallies Votes and Determines the Winning Metric for a Competition**
 *
 * This function tallies votes for a completed competition by querying the database for votes
 * associated with the competition's ID. It groups the votes by the selected metric and counts
 * the number of votes per metric. If there is a tie between metrics with the highest vote count,
 * it randomly selects one of them as the winner.
 *
 * @async
 * @function tallyVotesAndRecordWinner
 * @param {Object} competition - The completed competition object. Must include an `id` and `type` property.
 * @returns {Promise<string|null>} A promise that resolves to the winning metric as a string, or `null` if no votes exist.
 *
 * @example
 * // Example usage:
 * const winningMetric = await tallyVotesAndRecordWinner(competition);
 * if (winningMetric) {
 * console.log(`The winning metric is: ${winningMetric}`);
 * } else {
 * console.log('No votes were recorded for this competition.');
 * }
 */
const tallyVotesAndRecordWinner = async (competition) => {
    try {
        logger.info(`Tallying votes for competition ID ${competition.id} (${competition.type})...`);

        // Step 1: Collect votes by metric.
        const votes = await db.getAll(
            `SELECT vote_choice, COUNT(*) as count 
             FROM votes 
             WHERE competition_id = ? 
             GROUP BY vote_choice 
             ORDER BY count DESC`,
            [competition.id],
        );

        if (votes.length === 0) {
            logger.info(`No votes recorded for competition ID ${competition.id}.`);
            return null; // No votes recorded; alternative action should be taken (e.g., checking a queue).
        }

        // Step 2: Determine the winning metric.
        const highestVoteCount = votes[0].count;
        // Filter metrics that have the same highest vote count.
        const topMetrics = votes.filter((vote) => vote.count === highestVoteCount).map((vote) => vote.vote_choice);

        let winningMetric;
        if (topMetrics.length === 1) {
            // One clear winner.
            winningMetric = topMetrics[0];
        } else {
            // Randomly select one metric from the tied metrics.
            winningMetric = topMetrics[Math.floor(Math.random() * topMetrics.length)];
            logger.info(`Tie detected. Randomly selected metric: ${winningMetric}`);
        }

        logger.info(`Winning metric for ${competition.type}: ${winningMetric}`);
        return winningMetric;
    } catch (error) {
        logger.error(`Error tallying votes for competition ID ${competition.id}: ${error.message}`);
        return null;
    }
};

module.exports = { tallyVotesAndRecordWinner };
