const {
    getPerformanceStats,
} = require('../../modules/collection/savePerformanceStats');
const client = require('../../modules/discordClient');
const db = require('../../modules/utils/essentials/dbUtils');

async function fetchServerAnalytics() {
    const result = {
        totals: {},
        messageLogs: {},
        eventStats: {},
        top: {},
    };

    result.performance = await getPerformanceStats(client);
    result.totals = {};

    const totalMembers = await db.getOne(
        'SELECT COUNT(*) AS count FROM clan_members'
    );
    result.totals.clanMembers = totalMembers.count;

    const totals = await db.getOne(`
  SELECT
    -- Overall totals
    (SELECT COUNT(*) FROM registered_rsn) AS overall_registered,
    (SELECT IFNULL(SUM(pd.exp), 0)
     FROM registered_rsn rr
     LEFT JOIN player_data pd
       ON LOWER(pd.rsn) = LOWER(rr.rsn)
      AND pd.type = 'skills'
      AND pd.metric = 'overall'
    ) AS overall_total_xp,

    -- Clan-specific totals
    (SELECT COUNT(*)
     FROM registered_rsn rr
     INNER JOIN clan_members cm
       ON LOWER(cm.rsn) = LOWER(rr.rsn)
    ) AS clan_registered,
    (SELECT IFNULL(SUM(pd.exp), 0)
     FROM registered_rsn rr
     INNER JOIN clan_members cm
       ON LOWER(cm.rsn) = LOWER(rr.rsn)
     LEFT JOIN player_data pd
       ON LOWER(pd.rsn) = LOWER(rr.rsn)
      AND pd.type = 'skills'
      AND pd.metric = 'overall'
    ) AS clan_total_xp
`);

    result.totals.overall = {
        registered: totals.overall_registered,
        totalXP: totals.overall_total_xp,
        averageXP:
      totals.overall_registered > 0
          ? Math.floor(totals.overall_total_xp / totals.overall_registered)
          : 0,
    };

    result.totals.clan = {
        registered: totals.clan_registered,
        totalXP: totals.clan_total_xp,
        averageXP:
      totals.clan_registered > 0
          ? Math.floor(totals.clan_total_xp / totals.clan_registered)
          : 0,
    };

    const pointTypes = ['SOTW', 'BOTW', 'bingo'];
    for (const type of pointTypes) {
        const row = await db.getOne(
            'SELECT SUM(points) AS total FROM player_points WHERE type = ?',
            [type]
        );
        result.totals[`${type.toLowerCase()}Points`] = row.total || 0;
    }

    const totalClanMembersRow = await db.getOne(
        'SELECT COUNT(*) AS count FROM clan_members'
    );
    result.totals.clanMembers = totalClanMembersRow.count;

    const activityRows = await db.getAll(`
  SELECT ai.player_id, ai.last_progressed, cm.rsn
  FROM active_inactive ai
  JOIN clan_members cm ON ai.player_id = cm.player_id
`);

    const now = Date.now();
    const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

    let activeCount = 0;
    let totalDaysSince = 0;
    let mostRecent = { rsn: null, date: 0 };

    let longestInactive = { rsn: null, date: Infinity };

    for (const { last_progressed, rsn } of activityRows) {

        const last = Date.parse(last_progressed);
        if (isNaN(last)) continue; 

        const diff = now - last;
        const daysSince = Math.floor(diff / (1000 * 60 * 60 * 24));
        totalDaysSince += daysSince;

        if (diff <= TEN_DAYS) {
            activeCount++;

            if (last > mostRecent.date) {
                mostRecent = { rsn, date: last };
            }
        } else {

            if (last < longestInactive.date) {
                longestInactive = { rsn, date: last };
            }
        }
    }

    const inactiveCount = result.totals.clanMembers - activeCount;

    result.activity = {
        activeCount,
        inactiveCount,
        percentActive:
      result.totals.clanMembers > 0
          ? Math.round((activeCount / result.totals.clanMembers) * 100)
          : 0,
        mostRecentActive: mostRecent.rsn
            ? {
                rsn: mostRecent.rsn,
                date: new Date(mostRecent.date).toISOString(),
            }
            : null,
        longestInactive:
      longestInactive.rsn && longestInactive.date !== Infinity
          ? {
              rsn: longestInactive.rsn,
              date: new Date(longestInactive.date).toISOString(),
          }
          : null,
        averageDaysSinceProgress:
      result.totals.clanMembers > 0
          ? Math.round(totalDaysSince / result.totals.clanMembers)
          : 0,
    };

    const messageTables = {
        chat_messages: 'Chat Messages',
        drops: 'Drops',
        pet_drops: 'Pets',
        level_ups: 'Level Ups',
        quest_completed: 'Quests',
        collection_log: 'Collections',
        raid_drops: 'Raids',
        clue_rewards: 'Clues',
        diary_completed: 'Diaries',
        combat_tasks_completed: 'Combat Tasks',
        personal_bests: 'Personal Bests',
        combat_achievements: 'Combat Achievements',
        clan_traffic: 'Recruitings',
        pvp_messages: 'PvP Logs',
    };

    for (const [table, label] of Object.entries(messageTables)) {
        const row = await db.messages.getOne(
            `SELECT COUNT(*) AS count FROM ${table}`
        );
        result.messageLogs[label] = row.count;
    }

    const kills = await db.messages.getOne(`
    SELECT COUNT(*) AS count FROM pvp_messages
    WHERE message LIKE 'has defeated%'
  `);
    const deaths = await db.messages.getOne(`
    SELECT COUNT(*) AS count FROM pvp_messages
    WHERE message LIKE 'has been defeated by%'
  `);
    result.messageLogs['PvP Kills'] = kills.count;
    result.messageLogs['PvP Deaths'] = deaths.count;

    const killMessages = await db.messages.getAll(
        'SELECT message FROM pvp_messages WHERE message LIKE \'%coins%\''
    );
    let netProfit = 0;
    for (const { message } of killMessages) {
        const match = message.match(/\(([\d,]+) coins\)/);
        if (match) netProfit += parseInt(match[1].replace(/,/g, ''), 10);
    }
    result.messageLogs['PvP Profit'] = netProfit;

    const topPets = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM pet_drops GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topLevels = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM level_ups GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topQuests = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM quest_completed GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topCollection = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM collection_log GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topDrops = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM drops GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topRaids = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM raid_drops GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topClues = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM clue_rewards GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topDiaries = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM diary_completed GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topTasks = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM combat_tasks_completed GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topPBs = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM personal_bests GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topAchievements = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM combat_achievements GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topPVP = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM pvp_messages GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topKeys = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM loot_key_rewards GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topRecruiter = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM clan_traffic GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topChatty = await db.messages.getOne(`
  SELECT rsn, COUNT(*) AS count FROM chat_messages GROUP BY rsn ORDER BY count DESC LIMIT 1
`);
    const topChattyDay = await db.messages.getOne(`
  SELECT DATE(timestamp) AS date, COUNT(*) AS count FROM chat_messages GROUP BY DATE(timestamp) ORDER BY count DESC LIMIT 1
`);

    result.top.mostPets = topPets || {};
    result.top.mostLevelUps = topLevels || {};
    result.top.mostQuests = topQuests || {};
    result.top.mostCollection = topCollection || {};
    result.top.mostDrops = topDrops || {};
    result.top.mostRaids = topRaids || {};
    result.top.mostClues = topClues || {};
    result.top.mostDiaries = topDiaries || {};
    result.top.mostTasks = topTasks || {};
    result.top.mostPBs = topPBs || {};
    result.top.mostAchievements = topAchievements || {};
    result.top.mostPVP = topPVP || {};
    result.top.mostKeys = topKeys || {};
    result.top.mostRecruitings = topRecruiter || {};
    result.top.mostChatty = topChatty || {};
    result.top.mostChattyDay = topChattyDay || {};

    const competitions = await db.getOne(
        'SELECT COUNT(*) AS count FROM competitions'
    );

    const bingoOngoing = await db.getOne(
        'SELECT COUNT(*) AS count FROM bingo_state WHERE state = \'ongoing\''
    );
    const bingoCompleted = await db.getOne(
        'SELECT COUNT(*) AS count FROM bingo_state WHERE state = \'completed\''
    );

    const bingoBonuses = await db.getOne(`
  SELECT COUNT(*) AS count, IFNULL(SUM(points_awarded), 0) AS total_points 
  FROM bingo_patterns_awarded
`);

    const uniqueParticipants = await db.getOne(`
  SELECT COUNT(DISTINCT player_id) AS count 
  FROM player_points
  WHERE type IN ('SOTW', 'BOTW')
`);

    result.eventStats = {

        totalCompetitions: competitions.count,

        bingoOngoing: bingoOngoing.count,
        bingoCompleted: bingoCompleted.count,

        bingoBonusesCount: bingoBonuses.count,
        bingoBonusesPoints: bingoBonuses.total_points,

        uniqueParticipants: uniqueParticipants.count,
    };

    const topXP = await db.getOne(`
  SELECT pd.rsn, pd.exp 
  FROM player_data AS pd
  INNER JOIN clan_members AS cm ON cm.rsn = pd.rsn
  WHERE pd.type = 'skills' AND pd.metric = 'overall'
  ORDER BY pd.exp DESC
  LIMIT 1
`);
    result.top.topXPHolder = topXP || {};

    const mostSOTWWins = await db.getOne(`
  SELECT cm.rsn, u.total_top10_appearances_sotw AS appearances 
  FROM users AS u
  INNER JOIN clan_members AS cm ON LOWER(cm.rsn) = LOWER(u.rsn)
  ORDER BY u.total_top10_appearances_sotw DESC
  LIMIT 1
`);
    result.top.mostSOTWWins = mostSOTWWins || {};

    const mostBOTWWins = await db.getOne(`
  SELECT cm.rsn, u.total_top10_appearances_botw AS appearances 
  FROM users AS u
  INNER JOIN clan_members AS cm ON LOWER(cm.rsn) = LOWER(u.rsn)
  ORDER BY u.total_top10_appearances_botw DESC
  LIMIT 1
`);
    result.top.mostBOTWWins = mostBOTWWins || {};

    const topDropper = await db.messages.getOne(`
    SELECT rsn, COUNT(*) AS count FROM drops
    GROUP BY rsn ORDER BY count DESC LIMIT 1
  `);
    result.top.mostDropsLogged = topDropper || {};

    const emojiCount = await db.guild.getOne(
        'SELECT COUNT(*) AS count FROM guild_emojis'
    );
    const animatedEmojiCount = await db.guild.getOne(
        'SELECT COUNT(*) AS count FROM guild_emojis WHERE animated = 1'
    );

    const totalChannels = await db.guild.getOne(
        'SELECT COUNT(*) AS count FROM guild_channels'
    );
    const voiceChannels = await db.guild.getOne(
        'SELECT COUNT(*) AS count FROM guild_channels WHERE type = 2'
    );
    const textChannels = await db.guild.getOne(
        'SELECT COUNT(*) AS count FROM guild_channels WHERE type = 0'
    );
    const announcementChannels = await db.guild.getOne(
        'SELECT COUNT(*) AS count FROM guild_channels WHERE type = 5'
    );
    const categories = await db.guild.getOne(
        'SELECT COUNT(*) AS count FROM guild_channels WHERE type = 4'
    );

    const roleCount = await db.guild.getOne(
        'SELECT COUNT(*) AS count FROM guild_roles'
    );
    const memberCount = await db.guild.getOne(
        'SELECT COUNT(*) AS count FROM guild_members'
    );
    const webhookCount = await db.guild.getOne(
        'SELECT COUNT(*) AS count FROM guild_webhooks'
    );

    result.guild = {
        emojis: {
            total: emojiCount.count,
            animated: animatedEmojiCount.count,
        },
        channels: {
            total: totalChannels.count,
            text: textChannels.count,
            voice: voiceChannels.count,
            announcements: announcementChannels.count,
            categories: categories.count,
        },
        roles: {
            total: roleCount.count,
        },
        members: {
            total: memberCount.count,
        },
        webhooks: {
            total: webhookCount.count,
        },
    };

    const transactionTotals = await db.getOne(`
  SELECT COUNT(*) AS totalTransactions, SUM(points) AS totalPoints
  FROM player_point_transactions
`);

    result.transactions = {
        total: transactionTotals.totalTransactions || 0,
        totalPoints: transactionTotals.totalPoints || 0,
        averagePoints:
      transactionTotals.totalTransactions > 0
          ? Math.round(
              transactionTotals.totalPoints / transactionTotals.totalTransactions
          )
          : 0,
    };

    const sent = await db.getAll(`
  SELECT sender_id AS player_id, SUM(points) AS totalSent
  FROM player_point_transactions
  GROUP BY sender_id
`);

    const received = await db.getAll(`
  SELECT receiver_id AS player_id, SUM(points) AS totalReceived
  FROM player_point_transactions
  GROUP BY receiver_id
`);

    const playerMap = {};

    sent.forEach(({ player_id, totalSent }) => {
        if (!playerMap[player_id]) playerMap[player_id] = { sent: 0, received: 0 };
        playerMap[player_id].sent = totalSent;
    });

    received.forEach(({ player_id, totalReceived }) => {
        if (!playerMap[player_id]) playerMap[player_id] = { sent: 0, received: 0 };
        playerMap[player_id].received = totalReceived;
    });

    const playerRsns = await db.getAll(`
  SELECT player_id, rsn FROM registered_rsn
`);

    const rsnMap = {};
    playerRsns.forEach((p) => (rsnMap[p.player_id] = p.rsn));

    let friendliest = { rsn: null, value: 0 };
    let spoiled = { rsn: null, value: -Infinity };
    let balanced = { rsn: null, delta: Infinity };

    for (const [playerId, { sent, received }] of Object.entries(playerMap)) {
        const rsn = rsnMap[playerId] || `ID ${playerId}`;
        const net = (received || 0) - (sent || 0);
        const total = (sent || 0) + (received || 0);

        if (sent > friendliest.value) {
            friendliest = { rsn, value: sent };
        }

        if (received > 0 && net > spoiled.value && sent < received * 0.5) {
            spoiled = { rsn, value: net };
        }

        const ratioDelta = Math.abs((sent || 0) - (received || 0));
        if (total > 0 && ratioDelta < balanced.delta) {
            balanced = { rsn, delta: ratioDelta };
        }
    }

    result.transactions.summary = {
        friendliest,
        spoiled,
        balanced,
    };

    const typeUsage = await db.getAll(`
  SELECT (UPPER(SUBSTR(type, 1, 1)) || SUBSTR(type, 2)) AS type, COUNT(*) AS count
  FROM player_point_transactions
  GROUP BY (UPPER(SUBSTR(type, 1, 1)) || SUBSTR(type, 2))
  ORDER BY count DESC
`);

    result.transactions.mostUsedType = typeUsage.length
        ? {
            type: typeUsage[0].type,
            count: typeUsage[0].count,
        }
        : {
            type: null,
            count: 0,
        };

    result.transactions.typeUsageBreakdown = typeUsage;

    return result;
}

module.exports = { fetchServerAnalytics };
