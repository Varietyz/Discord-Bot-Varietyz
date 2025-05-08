const express = require('express');
const fs = require('fs');
const path = require('path');
const logger = require('../modules/utils/essentials/logger');
const { collectData } = require('./central/collectData');
const { fetchDataFromTable } = require('./central/dataFromTable');
const { fetchActiveCompetitions } = require('./central/activeCompetitions');
const cors = require('cors');
const { fetchBingoData } = require('./central/bingoData');
const { fetchMemberData } = require('./central/collectMemberData');
const { fetchAnalyticsData } = require('./central/analyticPlayerData');
const { fetchServerAnalytics } = require('./central/clanAnalytics');
const {
    incrementApiRequestCounter,
} = require('../modules/collection/savePerformanceStats');
const { getCachedDomainHealth } = require('./central/domainHealth');

function createTimedCache(ttlMs) {
    let cache = null;
    let lastUpdate = 0;

    return async function (fetchFn) {
        const now = Date.now();
        if (!cache || now - lastUpdate > ttlMs) {
            cache = await fetchFn();
            lastUpdate = now;
        }
        return cache;
    };
}

function cachePerKeyWithLimit(ttlMs, maxKeys = 1000) {
    const cache = new Map();

    setInterval(() => {
        const now = Date.now();
        for (const [key, { timestamp }] of cache.entries()) {
            if (now - timestamp > ttlMs) {
                cache.delete(key);
            }
            if (process.memoryUsage().rss > 500 * 1024 * 1024) {
                cache.clear(); 
                console.warn('🧠 Cache cleared due to memory pressure');
            }
        }
    }, 60_000); 

    return async function (key, fetchFn) {
        const now = Date.now();
        const entry = cache.get(key);

        if (entry && now - entry.timestamp < ttlMs) {
            return entry.data;
        }

        if (cache.size >= maxKeys) {
            const oldestKey = [...cache.entries()].sort(
                (a, b) => a[1].timestamp - b[1].timestamp
            )[0]?.[0];
            if (oldestKey) cache.delete(oldestKey);
        }

        const data = await fetchFn();
        cache.set(key, { data, timestamp: now });
        return data;
    };
}

const randomTtl = () => 8_000 + Math.floor(Math.random() * 4000);

const app = express();

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
    incrementApiRequestCounter();
    next();
});

function verifyOrigin(req, res, next) {
    const allowedOrigins = [
        'https://banes-lab.com',
        'http://localhost:3003',
        'http://localhost:3003',
        'http://192.168.0.161:3003',
        'http://192.168.0.161:3003',
    ];
    const requestOrigin = req.headers.origin;
    if (!allowedOrigins.includes(requestOrigin)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
}

const sslOptions = {
    key: fs.readFileSync(
        path.resolve('/etc/letsencrypt/live/bot.banes-lab.com/privkey.pem')
    ),
    cert: fs.readFileSync(
        path.resolve('/etc/letsencrypt/live/bot.banes-lab.com/fullchain.pem')
    ),
    ca: fs.readFileSync(
        path.resolve('/etc/letsencrypt/live/bot.banes-lab.com/chain.pem')
    ),
};

app.get('/', (req, res) => {
    res.send('Welcome to the Banes Lab API!');
});

app.get('/data/domain-health', verifyOrigin, async (req, res) => {
    try {
        const data = await getCachedDomainHealth();

        if (!data) {
            return res.status(404).json({
                message: 'No domain health data available.',
            });
        }

        res.setHeader('Cache-Control', 'public, max-age=60');
        res.json(data);
    } catch (err) {
        res.status(500).json({
            message: 'Failed to retrieve domain health',
            error: err.message,
        });
    }
});

const cachedCompetitions = createTimedCache(randomTtl());
app.get('/competitions/week', verifyOrigin, async (req, res) => {
    try {
        const { competitions, participants } = await cachedCompetitions(
            fetchActiveCompetitions
        );
        res.json({ competition: competitions, participants });
    } catch (err) {
        res.status(500).json({
            message: 'Failed to fetch competition data',
            error: err.message,
        });
    }
});

const cachedBingoData = createTimedCache(randomTtl());
app.get('/bingo/data', verifyOrigin, async (req, res) => {
    try {
        const data = await cachedBingoData(fetchBingoData);
        res.json(data);
    } catch (err) {
        res
            .status(500)
            .json({ message: 'Failed to fetch bingo data', error: err.message });
    }
});

const cachedMemberData = createTimedCache(randomTtl());
app.get('/data/members', async (req, res) => {
    try {
        const members = await cachedMemberData(fetchMemberData);
        res.json(members);
    } catch (err) {
        res
            .status(500)
            .json({ message: 'Failed to fetch member data', error: err.message });
    }
});

const cachedServerAnalytics = createTimedCache(randomTtl());
app.get('/data/analytics/server', async (req, res) => {
    try {
        const data = await cachedServerAnalytics(fetchServerAnalytics);
        res.json(data);
    } catch (err) {
        res.status(500).json({
            message: 'Failed to fetch server analytics',
            error: err.message,
        });
    }
});

const cachedPerPlayer = cachePerKeyWithLimit(5_000, 500);
app.get('/data/details/:rsn', async (req, res) => {
    try {
        const { rsn } = req.params;
        const data = await cachedPerPlayer(rsn, () => fetchAnalyticsData(rsn));
        res.json(data);
    } catch (err) {
        res.status(500).json({
            message: 'Failed to fetch analytics data',
            error: err.message,
        });
    }
});

const cachedPerTableQuery = cachePerKeyWithLimit(5_000, 500);
app.get('/data/:table', verifyOrigin, async (req, res) => {
    const { table } = req.params;
    const filters = req.query; 
    try {
        const cacheKey = `${table}:${JSON.stringify(filters)}`;
        const data = await cachedPerTableQuery(cacheKey, () =>
            fetchDataFromTable(table, filters)
        );

        res.json(data);
    } catch (err) {
        res.status(500).json({
            message: `Failed to fetch data from ${table}`,
            error: err.message,
        });
    }
});

app.post('/collect-data', verifyOrigin, async (req, res) => {
    const { data } = req.body;
    logger.info(`Received data: ${JSON.stringify(data)}`);
    try {
        await collectData(data);
        res.status(200).json({ message: 'Data collected successfully' });
    } catch (err) {
        res
            .status(500)
            .json({ message: 'Failed to collect data', error: err.message });
    }
});

module.exports = { app, sslOptions };
