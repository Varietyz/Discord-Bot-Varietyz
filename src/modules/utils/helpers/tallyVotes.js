const db = require('../essentials/dbUtils');
const logger = require('../essentials/logger');
const tallyVotesAndRecordWinner = async (competition) => {
    try {
        logger.info(`🎯 **Tallying Votes:** Processing votes for competition ID \`${competition.competition_id}\` (${competition.type})...`);
        const votes = await db.getAll(
            `SELECT vote_choice, COUNT(*) AS count 
             FROM votes 
             WHERE competition_id = ? 
             GROUP BY vote_choice 
             ORDER BY count DESC`,
            [competition.competition_id],
        );
        if (votes.length === 0) {
            logger.info(`⚠️ **No Votes Found:** No votes recorded for competition ID \`${competition.competition_id}\`.`);
            return null;
        }
        const highestVoteCount = votes[0].count;
        const topMetrics = votes.filter((vote) => vote.count === highestVoteCount).map((vote) => vote.vote_choice);
        let winningMetric;
        if (topMetrics.length === 1) {
            winningMetric = topMetrics[0];
        } else {
            winningMetric = topMetrics[Math.floor(Math.random() * topMetrics.length)];
            logger.info(`⚖️ **Tie Detected:** Randomly selected metric: \`${winningMetric}\`.`);
        }
        logger.info(`✅ **Winning Metric:** For \`${competition.type}\`, the winning metric is \`${winningMetric}\`. 🎉`);
        return winningMetric;
    } catch (error) {
        logger.error(`🚨 **Error:** Error tallying votes for competition ID \`${competition.competition_id}\`: ${error.message} ❌`);
        return null;
    }
};
module.exports = { tallyVotesAndRecordWinner };
