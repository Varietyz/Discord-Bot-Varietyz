const db = require('../essentials/dbUtils');

/**
 * Retrieves the team name for a given team_id from the bingo_teams table.
 * @param {number} teamId
 * @returns {Promise<string|null>} The team name, or null if not found.
 */
async function getTeamName(teamId) {
    const row = await db.getOne(
        `
    SELECT team_name 
    FROM bingo_teams 
    WHERE team_id = ?
    `,
        [teamId],
    );
    return row ? row.team_name : null;
}

module.exports = getTeamName;
