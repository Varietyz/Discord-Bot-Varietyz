// @ts-nocheck
// src/modules/utils/tallyVotes.js

const db = require('./dbUtils');
const logger = require('./logger');

/**
 * Tally votes for a competition and record the winner.
 * @param {Client} client - Discord client instance.
 * @param {Object} competition - Competition object.
 */
const tallyVotesAndRecordWinner = async (client, competition) => {
    try {
        // Fetch all votes for the competition
        const votes = await db.getAll('SELECT vote_choice, COUNT(*) as count FROM votes WHERE competition_id = ? GROUP BY vote_choice ORDER BY count DESC', [competition.id]);

        if (votes.length === 0) {
            logger.info(`No votes found for competition ID ${competition.id}.`);
            return;
        }

        // Determine the highest vote count
        const highestVote = votes[0].count;
        const topChoices = votes.filter((vote) => vote.count === highestVote).map((vote) => vote.vote_choice);

        let winningChoice = '';
        if (topChoices.length === 1) {
            winningChoice = topChoices[0];
        } else {
            // Tiebreaker: select user with least wins
            // Fetch users who voted for topChoices
            const placeholders = topChoices.map(() => '?').join(', ');
            const usersWithTiedChoices = await db.getAll(
                `SELECT users.discord_user_id, users.total_wins, votes.vote_choice 
                 FROM votes 
                 JOIN users ON votes.user_id = users.discord_user_id 
                 WHERE votes.competition_id = ? AND votes.vote_choice IN (${placeholders})`,
                [competition.id, ...topChoices],
            );

            if (usersWithTiedChoices.length === 0) {
                // If no users found, select randomly among topChoices
                winningChoice = topChoices[Math.floor(Math.random() * topChoices.length)];
            } else {
                // Find the user with the least wins
                const minWins = Math.min(...usersWithTiedChoices.map((user) => user.total_wins));
                const candidates = usersWithTiedChoices.filter((user) => user.total_wins === minWins);

                // If multiple candidates have the same minWins, select randomly among them
                const selectedUser = candidates[Math.floor(Math.random() * candidates.length)];
                winningChoice = selectedUser.vote_choice;
            }
        }

        // Prevent selecting the same metric as last week
        const lastCompetition = await db.getOne('SELECT metric FROM competitions WHERE type = ? ORDER BY ends_at DESC LIMIT 1 OFFSET 1', [competition.type]);
        if (lastCompetition && lastCompetition.metric === winningChoice) {
            // Select a different choice randomly
            const availableChoices = votes.map((vote) => vote.vote_choice).filter((choice) => choice !== lastCompetition.metric);
            if (availableChoices.length > 0) {
                winningChoice = availableChoices[Math.floor(Math.random() * availableChoices.length)];
            }
        }

        // Fetch the user who voted for the winningChoice
        const winningVote = await db.getOne('SELECT user_id FROM votes WHERE competition_id = ? AND vote_choice = ? LIMIT 1', [competition.id, winningChoice]);
        if (!winningVote) {
            logger.error(`No vote found for winning choice "${winningChoice}" in competition ID ${competition.id}.`);
            return;
        }

        // Fetch user details
        const user = await db.getOne('SELECT * FROM users WHERE discord_user_id = ?', [winningVote.user_id]);
        if (!user) {
            logger.error(`User with Discord ID ${winningVote.user_id} not found.`);
            return;
        }

        // Begin a database transaction
        await db.runQuery('BEGIN TRANSACTION');

        try {
            // Log the winner in the database
            await db.runQuery('INSERT INTO winners (competition_id, user_id, vote_count) VALUES (?, ?, ?)', [competition.id, user.id, highestVote]);

            // Update user's total wins
            await db.runQuery('UPDATE users SET total_wins = total_wins + 1 WHERE discord_user_id = ?', [user.discord_user_id]);

            // Commit the transaction
            await db.runQuery('COMMIT');
        } catch (dbError) {
            // Rollback the transaction in case of error
            await db.runQuery('ROLLBACK');
            logger.error(`Error updating database after determining winner: ${dbError.message}`);
            return;
        }

        logger.info(`Recorded winner ${user.username} for competition ID ${competition.id}.`);
    } catch (error) {
        logger.error(`Error tallying votes for competition ID ${competition.id}: ${error.message}`);
    }
};

module.exports = { tallyVotesAndRecordWinner };
