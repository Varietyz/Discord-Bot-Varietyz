require('dotenv').config();
const db = require('./dbUtils');
const logger = require('./logger');
const client = require('../../discordClient');

async function fetchActiveDiscordIds() {
    try {

        const guild = await client.guilds.fetch(process.env.GUILD_ID);

        const members = await guild.members.fetch();
        const activeIds = members.map((member) => member.id);
        logger.info(`Fetched ${activeIds.length} active Discord member IDs.`);
        return activeIds;
    } catch (err) {
        logger.error(
            `❌ Failed to fetch active Discord member IDs: ${err.message}`
        );
        return [];
    }
}

async function cleanupOrphanedPlayers() {
    logger.info('🚀 Starting cleanup of orphaned players...');

    try {

        const activeDiscordIds = await fetchActiveDiscordIds();

        const activeDiscordSet = new Set(activeDiscordIds.map((id) => String(id)));
        logger.info(`🔍 Active Discord IDs count: ${activeDiscordSet.size}`);

        const registeredPlayers = await db.getAll('SELECT * FROM registered_rsn');
        if (!registeredPlayers.length) {
            logger.info('✅ No registered players found. Exiting cleanup.');
            return;
        }
        logger.info(
            `📊 Total registered players found: ${registeredPlayers.length}`
        );

        registeredPlayers.forEach((player) => {
            logger.debug(
                `Player ${player.player_id} discord_id type: ${typeof player.discord_id}`
            );
        });

        const playersToRemove = registeredPlayers.filter(
            (player) => !activeDiscordSet.has(String(player.discord_id))
        );
        logger.info(`🗑 Players to remove (inactive): ${playersToRemove.length}`);

        if (playersToRemove.length > 0) {

            const dynamicTables = await getTablesWithColumn('player_id');
            const tablesForCleanup = dynamicTables.filter(
                (tbl) => tbl.toLowerCase() !== 'clan_members'
            );
            logger.info(
                `🔍 Tables with 'player_id' (excluding clan_members): ${tablesForCleanup.join(', ')}`
            );

            for (const player of playersToRemove) {
                const { player_id, discord_id } = player;
                try {

                    const resReg = await db.runQuery(
                        'DELETE FROM registered_rsn WHERE player_id = ?',
                        [player_id]
                    );
                    if (resReg.changes > 0) {
                        logger.info(
                            `✅ Removed player_id=${player_id} (discord_id=${discord_id}) from registered_rsn.`
                        );
                    }
                } catch (err) {
                    logger.error(
                        `❌ Error removing player_id=${player_id} from registered_rsn: ${err.message}`
                    );
                }

                for (const table of tablesForCleanup) {
                    try {
                        const res = await db.runQuery(
                            `DELETE FROM ${table} WHERE player_id = ?`,
                            [player_id]
                        );
                        if (res.changes > 0) {
                            logger.info(
                                `✅ Removed ${res.changes} rows from ${table} for player_id=${player_id}.`
                            );
                        }
                    } catch (err) {
                        logger.error(
                            `❌ Error removing rows from table ${table} for player_id=${player_id}: ${err.message}`
                        );
                    }
                }
            }
        } else {
            logger.info('✅ All registered players have active Discord IDs.');
        }

        const remainingPlayers = await db.getAll(
            'SELECT player_id FROM registered_rsn'
        );
        const remainingPlayerIds = remainingPlayers.map((p) => p.player_id);
        logger.info(
            `📊 Remaining registered players after Discord check: ${remainingPlayerIds.length}`
        );

        const clanMembers = await db.getAll('SELECT player_id FROM clan_members');
        const clanMemberIds = new Set(clanMembers.map((cm) => cm.player_id));
        logger.info(`📊 Total players in clan_members: ${clanMemberIds.size}`);

        for (const playerId of remainingPlayerIds) {
            if (!clanMemberIds.has(playerId)) {
                logger.info(`🔍 Player_id=${playerId} is not in a clan member.`);
                try {

                    const teams = await db.getAll(
                        'SELECT team_id, player_id FROM bingo_teams WHERE player_id = ?',
                        [playerId]
                    );
                    for (const team of teams) {
                        const { team_id } = team;
                        try {

                            const candidate = await db.getAll(
                                `
                                SELECT player_id 
                                FROM bingo_team_members 
                                WHERE team_id = ? 
                                  AND player_id != ? 
                                LIMIT 1
                                `,
                                [team_id, playerId]
                            );

                            if (candidate.length) {
                                const newPlayerId = candidate[0].player_id;
                                const updateRes = await db.runQuery(
                                    `
                                    UPDATE bingo_teams 
                                    SET player_id = ? 
                                    WHERE team_id = ? AND player_id = ?
                                    `,
                                    [newPlayerId, team_id, playerId]
                                );
                                if (updateRes.changes > 0) {
                                    logger.info(
                                        `✅ Replaced player_id=${playerId} with ${newPlayerId} in bingo_teams for team_id=${team_id}.`
                                    );
                                }
                            } else {

                                const deleteRes = await db.runQuery(
                                    `
                                    DELETE FROM bingo_teams 
                                    WHERE team_id = ? AND player_id = ?
                                    `,
                                    [team_id, playerId]
                                );
                                if (deleteRes.changes > 0) {
                                    logger.info(
                                        `🗑 Removed bingo_teams row for player_id=${playerId} in team_id=${team_id} (no replacement available).`
                                    );
                                }
                            }
                        } catch (err) {
                            logger.error(
                                `❌ Error processing bingo_teams for player_id=${playerId} in team_id=${team_id}: ${err.message}`
                            );
                        }
                    }
                } catch (err) {
                    logger.error(
                        `❌ Error fetching bingo_teams for player_id=${playerId}: ${err.message}`
                    );
                }
            }
        }

        const tablesToCheck = [
            { table: 'bingo_event_baseline', column: 'player_id' },
            { table: 'bingo_history', column: 'player_id' },
            { table: 'bingo_leaderboard', column: 'player_id' },
            { table: 'bingo_patterns_awarded', column: 'player_id' },
            { table: 'bingo_task_progress', column: 'player_id' },
            { table: 'bingo_team_members', column: 'player_id' },
            { table: 'bingo_teams', column: 'player_id' },
            { table: 'users', column: 'player_id' },
            { table: 'votes', column: 'discord_id' },
            { table: 'winners', column: 'player_id' },
        ];

        const validPlayers = await db.getAll('SELECT * FROM registered_rsn');
        const validPlayerIds = new Set(validPlayers.map((p) => p.player_id));
        const validDiscordIds = new Set(validPlayers.map((p) => p.discord_id));
        logger.info(`📊 Valid players after cleanup: ${validPlayerIds.size}`);

        for (const { table, column } of tablesToCheck) {
            const validSet =
        column === 'discord_id' ? validDiscordIds : validPlayerIds;
            try {
                const rows = await db.getAll(`SELECT rowid, ${column} FROM ${table}`);
                for (const row of rows) {
                    if (!validSet.has(row[column])) {
                        try {
                            const res = await db.runQuery(
                                `DELETE FROM ${table} WHERE rowid = ?`,
                                [row.rowid]
                            );
                            if (res.changes > 0) {
                                logger.info(
                                    `🗑 Removed row from ${table} (rowid=${row.rowid}) with ${column}=${row[column]} (orphaned).`
                                );
                            }
                        } catch (err) {
                            logger.error(
                                `❌ Error removing row rowid=${row.rowid} from ${table}: ${err.message}`
                            );
                        }
                    }
                }
            } catch (err) {
                logger.error(`❌ Error processing table ${table}: ${err.message}`);
            }
        }

        logger.info('🎉 Cleanup completed successfully!');
    } catch (error) {
        logger.error(`❌ Cleanup failed with error: ${error.message}`);
    }
}

async function getTablesWithColumn(columnName) {
    try {

        const tables = await db.getAll(`
            SELECT name 
            FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
        const tablesWithColumn = [];

        for (const { name: tableName } of tables) {
            try {
                const columns = await db.getAll(`PRAGMA table_info(${tableName})`);
                const hasColumn = columns.some(
                    (col) => col.name.toLowerCase() === columnName.toLowerCase()
                );
                if (hasColumn) {
                    tablesWithColumn.push(tableName);
                }
            } catch (err) {
                logger.error(
                    `❌ Error fetching column info for table ${tableName}: ${err.message}`
                );
            }
        }
        logger.info(
            `🔍 Tables with column "${columnName}": ${tablesWithColumn.join(', ')}`
        );
        return tablesWithColumn;
    } catch (err) {
        logger.error(`❌ Failed to retrieve tables: ${err.message}`);
        return [];
    }
}

module.exports = { cleanupOrphanedPlayers };
