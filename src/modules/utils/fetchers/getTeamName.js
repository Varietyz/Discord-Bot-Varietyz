const db = require('../essentials/dbUtils');

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
