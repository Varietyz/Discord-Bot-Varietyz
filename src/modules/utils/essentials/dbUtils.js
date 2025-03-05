const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger');
const mainDbPath = path.join(__dirname, '../../../data/database.sqlite');
const messagesDbPath = path.join(__dirname, '../../../data/messages.db');
const imageDbPath = path.join(__dirname, '../../../data/image_cache.db');
const guildDbPath = path.join(__dirname, '../../../data/guild.db');
let mainDb, messagesDb, imageDb, guildDb;
/**
 *
 */
function openDatabases() {
    return new Promise((resolve, reject) => {
        if (!mainDb) {
            mainDb = new sqlite3.Database(mainDbPath, (err) => {
                if (err) {
                    handleDbError(err, 'Main Database');
                    return reject(err);
                } else logger.info(`✅ SQLite Main Database connected: ${mainDbPath}`);
            });
        }
        if (!messagesDb) {
            messagesDb = new sqlite3.Database(messagesDbPath, (err) => {
                if (err) {
                    handleDbError(err, 'Message Database');
                    return reject(err);
                } else logger.info(`✅ SQLite Messages Database connected: ${messagesDbPath}`);
            });
        }
        if (!imageDb) {
            imageDb = new sqlite3.Database(imageDbPath, (err) => {
                if (err) {
                    handleDbError(err, 'Image Database');
                    return reject(err);
                } else logger.info(`✅ SQLite Image Cache Database connected: ${imageDbPath}`);
            });
        }
        if (!guildDb) {
            guildDb = new sqlite3.Database(guildDbPath, (err) => {
                if (err) {
                    handleDbError(err, 'Guild Database');
                    return reject(err);
                } else logger.info(`✅ SQLite Guild Database connected: ${guildDbPath}`);
            });
        }
        resolve();
    });
}
openDatabases();
let clientInstance = null;
/**
 *
 * @param client
 */
function setClient(client) {
    clientInstance = client;
}
/**
 *
 * @param error
 * @param dbName
 * @param client
 */
async function handleDbError(error, dbName, client) {
    logger.error(`🚨 Database Error in ${dbName}: ${error.message}`);
    const emitterClient = client || clientInstance;
    if (!emitterClient) {
        logger.warn('⚠️ Client instance is missing, cannot emit error event.');
        return;
    }
    await guildRunQuery(`
        CREATE TABLE IF NOT EXISTS error_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            error_message TEXT NOT NULL,
            error_stack TEXT,
            occurrences INTEGER DEFAULT 1,
            last_occurred TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reported INTEGER DEFAULT 0
        )
    `);
    const existingError = await guildGetOne('SELECT * FROM error_logs WHERE error_message = ? AND last_occurred > DATETIME(\'now\', \'-1800 seconds\')', [error.message]);
    if (existingError) {
        await guildRunQuery('UPDATE error_logs SET occurrences = occurrences + 1, last_occurred = CURRENT_TIMESTAMP WHERE id = ?', [existingError.id]);
    } else {
        await guildRunQuery('INSERT INTO error_logs (error_message, error_stack) VALUES (?, ?)', [error.message, error.stack || null]);
    }
    emitterClient.emit('error', error, emitterClient);
}
const runQuery = (query, params = []) =>
    new Promise((resolve, reject) => {
        mainDb.run(query, params, function (err) {
            if (err) {
                handleDbError(err, 'Main Database');
                return reject(err);
            }
            resolve(this);
        });
    });
const getAll = (query, params = []) =>
    new Promise((resolve, reject) => {
        mainDb.all(query, params, (err, rows) => {
            if (err) {
                handleDbError(err, 'Main Database');
                return reject(err);
            }
            resolve(rows);
        });
    });
const getOne = (query, params = []) =>
    new Promise((resolve, reject) => {
        mainDb.get(query, params, (err, row) => {
            if (err) {
                handleDbError(err, 'Main Database');
                return reject(err);
            }
            resolve(row || null);
        });
    });
const messagesRunQuery = (query, params = []) =>
    new Promise((resolve, reject) => {
        messagesDb.run(query, params, function (err) {
            if (err) {
                handleDbError(err, 'Messages Database');
                return reject(err);
            }
            resolve(this);
        });
    });
const messagesGetAll = (query, params = []) =>
    new Promise((resolve, reject) => {
        messagesDb.all(query, params, (err, rows) => {
            if (err) {
                handleDbError(err, 'Messages Database');
                return reject(err);
            }
            resolve(rows);
        });
    });
const messagesGetOne = (query, params = []) =>
    new Promise((resolve, reject) => {
        messagesDb.get(query, params, (err, row) => {
            if (err) {
                handleDbError(err, 'Messages Database');
                return reject(err);
            }
            resolve(row || null);
        });
    });
const runTransaction = async (queries) => {
    try {
        await mainDb.exec('BEGIN TRANSACTION');
        for (const { query, params } of queries) {
            await new Promise((resolve, reject) => {
                mainDb.run(query, params, (err) => {
                    if (err) {
                        handleDbError(err, 'Main Database');
                        return reject(err);
                    }
                    resolve();
                });
            });
        }
        await mainDb.exec('COMMIT');
    } catch (error) {
        await mainDb.exec('ROLLBACK');
        logger.error(`🚨 Error running transaction: ${error.message}`);
        throw error;
    }
};
process.on('SIGINT', () => {
    mainDb.close((err) => {
        if (err) handleDbError(err, 'Main Database');
        else logger.info('✅ Main database connection closed successfully.');
    });
    messagesDb.close((err) => {
        if (err) handleDbError(err, 'Messages Database');
        else logger.info('✅ Messages database connection closed successfully.');
    });
    imageDb.close((err) => {
        if (err) handleDbError(err, 'Image Cache Database');
        else logger.info('✅ Image cache database connection closed successfully.');
    });
    throw new Error('DB - Process terminated');
});
/**
 *
 * @param key
 * @param defaultValue
 */
async function getConfigValue(key, defaultValue = null) {
    const row = await getOne('SELECT value FROM config WHERE key = ?', [key]);
    if (!row) return defaultValue;
    return row.value;
}
/**
 *
 * @param key
 * @param value
 */
async function setConfigValue(key, value) {
    const valStr = String(value);
    await runQuery('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, valStr]);
}
const imageRunQuery = (query, params = []) =>
    new Promise((resolve, reject) => {
        imageDb.run(query, params, function (err) {
            if (err) {
                handleDbError(err, 'Image Database');
                return reject(err);
            }
            resolve(this);
        });
    });
const imageGetAll = (query, params = []) =>
    new Promise((resolve, reject) => {
        imageDb.all(query, params, (err, rows) => {
            if (err) {
                handleDbError(err, 'Image Database');
                return reject(err);
            }
            resolve(rows);
        });
    });
const imageGetOne = (query, params = []) =>
    new Promise((resolve, reject) => {
        imageDb.get(query, params, (err, row) => {
            if (err) {
                handleDbError(err, 'Image Database');
                return reject(err);
            }
            resolve(row || null);
        });
    });
const guildRunQuery = (query, params = []) =>
    new Promise((resolve, reject) => {
        guildDb.run(query, params, function (err) {
            if (err) {
                handleDbError(err, 'Guild Database');
                return reject(err);
            }
            resolve(this);
        });
    });
const guildGetAll = (query, params = []) =>
    new Promise((resolve, reject) => {
        guildDb.all(query, params, (err, rows) => {
            if (err) {
                handleDbError(err, 'Guild Database');
                return reject(err);
            }
            resolve(rows);
        });
    });
const guildGetOne = (query, params = []) =>
    new Promise((resolve, reject) => {
        guildDb.get(query, params, (err, row) => {
            if (err) {
                handleDbError(err, 'Guild Database');
                return reject(err);
            }
            resolve(row || null);
        });
    });
const getOneSync = (query, params = []) => {
    try {
        openDatabases();
        logger.info(`🔍 DEBUG: Running getOneSync with query: ${query} | Params: ${JSON.stringify(params)}`);
        const stmt = mainDb.prepare(query);
        const row = stmt.get(...params);
        stmt.finalize();
        if (!row) {
            logger.error('🚨 getOneSync ERROR: Query returned NO RESULT.');
            return null;
        }
        logger.info('✅ getOneSync SUCCESS: Retrieved Row →', row);
        return row;
    } catch (err) {
        logger.error(`🚨 getOneSync ERROR: ${err.message}`);
        return null;
    }
};
module.exports = {
    runQuery,
    getAll,
    getOne,
    getOneSync,
    runTransaction,
    getConfigValue,
    setConfigValue,
    messages: {
        runQuery: messagesRunQuery,
        getAll: messagesGetAll,
        getOne: messagesGetOne,
    },
    image: {
        runQuery: imageRunQuery,
        getAll: imageGetAll,
        getOne: imageGetOne,
    },
    guild: {
        runQuery: guildRunQuery,
        getAll: guildGetAll,
        getOne: guildGetOne,
    },
    setClient,
    openDatabases,
};
