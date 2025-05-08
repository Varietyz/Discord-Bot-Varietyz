const db = require('../../modules/utils/essentials/dbUtils');
const WOMApiClient = require('../../api/wise_old_man/apiClient');

const TEN_MINUTES = 5 * 60 * 1000;
let cachedData = {
    lastFetch: 0,
    competitions: [],
};

async function fetchActiveCompetitions() {
    const now = Date.now();

    if (now - cachedData.lastFetch < TEN_MINUTES) {
        return { competitions: cachedData.competitions };
    }

    try {
        const nowISO = new Date().toISOString();
        const competitions = await db.getAll(
            `SELECT competition_id, title, metric, type, starts_at, ends_at, verification_code, rotation_index
       FROM competitions
       WHERE starts_at <= ? AND ends_at >= ?`,
            [nowISO, nowISO]
        );

        const enriched = await Promise.all(
            competitions.map(async (comp) => {
                try {
                    const details = await WOMApiClient.request(
                        'competitions',
                        'getCompetitionDetails',
                        comp.competition_id
                    );

                    const top20 = details?.participations
                        ?.sort((a, b) => b.progress.gained - a.progress.gained)
                        ?.slice(0, 120)
                        ?.map((p, i) => ({
                            rank: i + 1,
                            rsn: p.player.displayName,
                            gained: p.progress.gained,
                            playerId: p.player.id,
                            profileUrl: `https://wiseoldman.net/players/${p.player.displayName}`,
                        }));

                    return { ...comp, leaderboard: top20 ?? [] };
                } catch (err) {
                    console.warn(
                        `⚠️ Failed to load WOM data for comp ${comp.competition_id}: ${err.message}`
                    );
                    return { ...comp, leaderboard: [] };
                }
            })
        );

        cachedData = {
            lastFetch: now,
            competitions: enriched,
        };

        return { competitions: enriched };
    } catch (err) {
        throw new Error(`Failed to fetch competition data: ${err.message}`);
    }
}

module.exports = {
    fetchActiveCompetitions,
};
