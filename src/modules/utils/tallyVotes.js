const db = require('./dbUtils');
const logger = require('./logger');

/**
 * Tally votes for a completed competition and determine the winning metric.
 * @param {Object} competition - The completed competition.
 * @returns {Promise<string|null>} - The winning metric or null if no votes exist.
 */
const tallyVotesAndRecordWinner = async (competition) => {
    try {
        logger.info(`Tallying votes for competition ID ${competition.id} (${competition.type})...`);

        // ✅ Step 1: Collect votes by metric
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
            return null; // No votes, will check queue in `createCompetitionFromVote`
        }

        // ✅ Step 2: Determine the winning metric
        const highestVoteCount = votes[0].count;
        const topMetrics = votes.filter((vote) => vote.count === highestVoteCount).map((vote) => vote.vote_choice);

        let winningMetric;
        if (topMetrics.length === 1) {
            winningMetric = topMetrics[0]; // ✅ One clear winner
        } else {
            winningMetric = topMetrics[Math.floor(Math.random() * topMetrics.length)]; // ✅ Randomly select from tied metrics
            logger.info(`Tie detected. Randomly selected metric: ${winningMetric}`);
        }

        logger.info(`Winning metric for ${competition.type}: ${winningMetric}`);
        return winningMetric; // ✅ Return the selected metric
    } catch (error) {
        logger.error(`Error tallying votes for competition ID ${competition.id}: ${error.message}`);
        return null;
    }
};

module.exports = { tallyVotesAndRecordWinner };
