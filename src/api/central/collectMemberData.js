const db = require('../../modules/utils/essentials/dbUtils');

const TEN_MINUTES = 10 * 60 * 1000;
let cachedData = {
    lastFetch: 0,
    members: [],
};

async function fetchMemberData() {
    const now = Date.now();

    if (now - cachedData.lastFetch < TEN_MINUTES) {
        return { members: cachedData.members };
    }

    try {

        const clanMembers = await db.getAll(
            `SELECT player_id, rsn, rank, joined_at
       FROM clan_members`
        );

        const registrations = await db.getAll(
            `SELECT player_id, discord_id, registered_at
       FROM registered_rsn`
        );
        const regMap = {};
        registrations.forEach((reg) => {
            regMap[reg.player_id] = reg;
        });

        const pointsData = await db.getAll(
            `SELECT player_id, type, points, last_updated_at
       FROM player_points`
        );
        const pointsMap = {};
        pointsData.forEach((point) => {
            if (!pointsMap[point.player_id]) {
                pointsMap[point.player_id] = [];
            }
            pointsMap[point.player_id].push(point);
        });

        const transactionsData = await db.getAll(
            `SELECT sender_id, receiver_id, type, points
       FROM player_point_transactions`
        );

        const playerDataRecords = await db.getAll(
            `SELECT player_id, rsn, type, metric, kills, score, level, exp, last_changed, last_updated
       FROM player_data`
        );
        const playerDataMap = {};
        playerDataRecords.forEach((record) => {
            if (!playerDataMap[record.player_id]) {
                playerDataMap[record.player_id] = [];
            }
            playerDataMap[record.player_id].push(record);
        });

        const enriched = clanMembers.map((member) => {
            const registration = regMap[member.player_id] || null;
            const memberPoints = pointsMap[member.player_id] || [];
            const sentTransactions = transactionsData.filter(
                (txn) => txn.sender_id === member.player_id
            );
            const receivedTransactions = transactionsData.filter(
                (txn) => txn.receiver_id === member.player_id
            );

            const rawStats = playerDataMap[member.player_id] || [];
            const stats = rawStats.map(({ player_id, rsn, ...rest }) => {
                void player_id;
                void rsn;
                return rest;
            });

            return {
                ...member,

                discord_id: registration ? registration.discord_id : null,
                registered_at: registration ? registration.registered_at : null,

                points: memberPoints,

                pointTransactions: {
                    sent: {
                        count: sentTransactions.length,
                        transactions: sentTransactions,
                    },
                    received: {
                        count: receivedTransactions.length,
                        transactions: receivedTransactions,
                    },
                },

                stats,
            };
        });

        cachedData = {
            lastFetch: now,
            members: enriched,
        };

        return { members: enriched };
    } catch (err) {
        throw new Error(`Failed to fetch member data: ${err.message}`);
    }
}

module.exports = {
    fetchMemberData,
};
