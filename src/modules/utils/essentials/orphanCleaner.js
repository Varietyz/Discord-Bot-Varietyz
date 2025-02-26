// cleanupOrphanedPlayers.js

require('dotenv').config();
const db = require('./dbUtils');
const logger = require('./logger');
const client = require('../../../main');
/**
 * Fetches active Discord member IDs from your guild.
 * @param client
 * @returns {Promise<Array<string>>} - Array of active Discord member IDs.
 */
async function fetchActiveDiscordIds() {
    try {
        // Fetch the guild using the configured guild ID
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        // Fetch all members from the guild (requires GUILD_MEMBERS intent)
        const members = await guild.members.fetch();
        const activeIds = members.map((member) => member.id);
        logger.info(`Fetched ${activeIds.length} active Discord member IDs.`);
        return activeIds;
    } catch (err) {
        logger.error(`❌ Failed to fetch active Discord member IDs: ${err.message}`);
        return [];
    }
}

/**
 * Cleans up orphaned players based on active Discord members and clan membership.
 * @param client
 */
async function cleanupOrphanedPlayers() {
    logger.info('🚀 Starting cleanup of orphaned players...');

    try {
        // Fetch active Discord IDs internally
        const activeDiscordIds = await fetchActiveDiscordIds();
        // Ensure all active IDs are strings for consistent comparison
        const activeDiscordSet = new Set(activeDiscordIds.map((id) => String(id)));
        logger.info(`🔍 Active Discord IDs count: ${activeDiscordSet.size}`);

        // 1. Fetch all registered players from registered_rsn
        const registeredPlayers = await db.getAll('SELECT * FROM registered_rsn');
        if (!registeredPlayers.length) {
            logger.info('✅ No registered players found. Exiting cleanup.');
            return;
        }
        logger.info(`📊 Total registered players found: ${registeredPlayers.length}`);

        // Log the type of discord_id for debugging
        registeredPlayers.forEach((player) => {
            logger.debug(`Player ${player.player_id} discord_id type: ${typeof player.discord_id}`);
        });

        // 2. Process players whose discord_id is not in the active guild member list.
        const playersToRemove = registeredPlayers.filter((player) => !activeDiscordSet.has(String(player.discord_id)));
        logger.info(`🗑 Players to remove (inactive): ${playersToRemove.length}`);

        if (playersToRemove.length > 0) {
            // Get all table names with a player_id column (dynamically) except clan_members.
            const dynamicTables = await getTablesWithColumn('player_id');
            const tablesForCleanup = dynamicTables.filter((tbl) => tbl.toLowerCase() !== 'clan_members');
            logger.info(`🔍 Tables with 'player_id' (excluding clan_members): ${tablesForCleanup.join(', ')}`);

            for (const player of playersToRemove) {
                const { player_id, discord_id } = player;
                try {
                    // Delete from registered_rsn first
                    const resReg = await db.runQuery('DELETE FROM registered_rsn WHERE player_id = ?', [player_id]);
                    if (resReg.changes > 0) {
                        logger.info(`✅ Removed player_id=${player_id} (discord_id=${discord_id}) from registered_rsn.`);
                    }
                } catch (err) {
                    logger.error(`❌ Error removing player_id=${player_id} from registered_rsn: ${err.message}`);
                }

                // Delete associated rows from dynamic tables
                for (const table of tablesForCleanup) {
                    try {
                        const res = await db.runQuery(`DELETE FROM ${table} WHERE player_id = ?`, [player_id]);
                        if (res.changes > 0) {
                            logger.info(`✅ Removed ${res.changes} rows from ${table} for player_id=${player_id}.`);
                        }
                    } catch (err) {
                        logger.error(`❌ Error removing rows from table ${table} for player_id=${player_id}: ${err.message}`);
                    }
                }
            }
        } else {
            logger.info('✅ All registered players have active Discord IDs.');
        }

        // 3. For remaining registered players, check if their player_id exists in clan_members.
        const remainingPlayers = await db.getAll('SELECT player_id FROM registered_rsn');
        const remainingPlayerIds = remainingPlayers.map((p) => p.player_id);
        logger.info(`📊 Remaining registered players after Discord check: ${remainingPlayerIds.length}`);

        // Get all player_ids from clan_members
        const clanMembers = await db.getAll('SELECT player_id FROM clan_members');
        const clanMemberIds = new Set(clanMembers.map((cm) => cm.player_id));
        logger.info(`📊 Total players in clan_members: ${clanMemberIds.size}`);

        // Process each registered player missing from clan_members.
        for (const playerId of remainingPlayerIds) {
            if (!clanMemberIds.has(playerId)) {
                logger.info(`🔍 Player_id=${playerId} is not in a clan member.`);
                try {
                    // Get all bingo_teams rows with this player_id
                    const teams = await db.getAll('SELECT team_id, player_id FROM bingo_teams WHERE player_id = ?', [playerId]);
                    for (const team of teams) {
                        const { team_id } = team;
                        try {
                            // Try to find a replacement from bingo_team_members with the same team_id (excluding the player to replace)
                            const candidate = await db.getAll(
                                `
                                SELECT player_id 
                                FROM bingo_team_members 
                                WHERE team_id = ? 
                                  AND player_id != ? 
                                LIMIT 1
                                `,
                                [team_id, playerId],
                            );

                            if (candidate.length) {
                                const newPlayerId = candidate[0].player_id;
                                const updateRes = await db.runQuery(
                                    `
                                    UPDATE bingo_teams 
                                    SET player_id = ? 
                                    WHERE team_id = ? AND player_id = ?
                                    `,
                                    [newPlayerId, team_id, playerId],
                                );
                                if (updateRes.changes > 0) {
                                    logger.info(`✅ Replaced player_id=${playerId} with ${newPlayerId} in bingo_teams for team_id=${team_id}.`);
                                }
                            } else {
                                // No replacement found: delete the row.
                                const deleteRes = await db.runQuery(
                                    `
                                    DELETE FROM bingo_teams 
                                    WHERE team_id = ? AND player_id = ?
                                    `,
                                    [team_id, playerId],
                                );
                                if (deleteRes.changes > 0) {
                                    logger.info(`🗑 Removed bingo_teams row for player_id=${playerId} in team_id=${team_id} (no replacement available).`);
                                }
                            }
                        } catch (err) {
                            logger.error(`❌ Error processing bingo_teams for player_id=${playerId} in team_id=${team_id}: ${err.message}`);
                        }
                    }
                } catch (err) {
                    logger.error(`❌ Error fetching bingo_teams for player_id=${playerId}: ${err.message}`);
                }
            }
        }

        // 4. Cleanup explicitly listed tables by removing rows referencing orphaned players.
        // For votes, we check discord_id instead of player_id.
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

        // Refresh valid registered players
        const validPlayers = await db.getAll('SELECT * FROM registered_rsn');
        const validPlayerIds = new Set(validPlayers.map((p) => p.player_id));
        const validDiscordIds = new Set(validPlayers.map((p) => p.discord_id));
        logger.info(`📊 Valid players after cleanup: ${validPlayerIds.size}`);

        for (const { table, column } of tablesToCheck) {
            const validSet = column === 'discord_id' ? validDiscordIds : validPlayerIds;
            try {
                const rows = await db.getAll(`SELECT rowid, ${column} FROM ${table}`);
                for (const row of rows) {
                    if (!validSet.has(row[column])) {
                        try {
                            const res = await db.runQuery(`DELETE FROM ${table} WHERE rowid = ?`, [row.rowid]);
                            if (res.changes > 0) {
                                logger.info(`🗑 Removed row from ${table} (rowid=${row.rowid}) with ${column}=${row[column]} (orphaned).`);
                            }
                        } catch (err) {
                            logger.error(`❌ Error removing row rowid=${row.rowid} from ${table}: ${err.message}`);
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

/**
 * Helper function to retrieve a list of table names that have a given column.
 * @param {string} columnName - The column name to search for (e.g. "player_id").
 * @returns {Promise<Array<string>>} - Array of table names.
 */
async function getTablesWithColumn(columnName) {
    try {
        // 1. Get all table names (exclude SQLite internals)
        const tables = await db.getAll(`
            SELECT name 
            FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
        const tablesWithColumn = [];

        // 2. For each table, check if it has the specified column (case-insensitive)
        for (const { name: tableName } of tables) {
            try {
                const columns = await db.getAll(`PRAGMA table_info(${tableName})`);
                const hasColumn = columns.some((col) => col.name.toLowerCase() === columnName.toLowerCase());
                if (hasColumn) {
                    tablesWithColumn.push(tableName);
                }
            } catch (err) {
                logger.error(`❌ Error fetching column info for table ${tableName}: ${err.message}`);
            }
        }
        logger.info(`🔍 Tables with column "${columnName}": ${tablesWithColumn.join(', ')}`);
        return tablesWithColumn;
    } catch (err) {
        logger.error(`❌ Failed to retrieve tables: ${err.message}`);
        return [];
    }
}

module.exports = { cleanupOrphanedPlayers };
