const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger');
const { Mutex } = require('async-mutex');
const globalState = require('../../../config/globalState');

const mainDbPath = path.join(__dirname, '../../../data/database.sqlite');
const messagesDbPath = path.join(__dirname, '../../../data/messages.db');
const imageDbPath = path.join(__dirname, '../../../data/image_cache.db');
const guildDbPath = path.join(__dirname, '../../../data/guild.db');

const transactionMutex = new Mutex();

let mainDb = null;
let messagesDb = null;
let imageDb = null;
let guildDb = null;

const dbFunctions = {
    main: null,
    messages: null,
    image: null,
    guild: null,
};

let clientInstance = null;

function initializeDatabase(dbPath, dbName) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                handleDbError(err, dbName)
                    .then(() => reject(err))
                    .catch(() => reject(err));
            } else {
                db.exec(
                    'PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;',
                    (err) => {
                        if (err) logger.warn(`PRAGMA error on ${dbName}: ${err.message}`);
                    }
                );
                logger.info(`✅ SQLite ${dbName} connected: ${dbPath}`);
                resolve(db);
            }
        });
    });
}

function createDbFunctions(db, dbName) {
    return {
        runQuery: (query, params = []) =>
            new Promise((resolve, reject) => {
                db.run(query, params, function (err) {
                    if (err) {
                        handleDbError(err, dbName);
                        return reject(err);
                    }
                    resolve(this);
                });
            }),
        getAll: (query, params = []) =>
            new Promise((resolve, reject) => {
                db.all(query, params, (err, rows) => {
                    if (err) {
                        handleDbError(err, dbName);
                        return reject(err);
                    }
                    resolve(rows);
                });
            }),
        getOne: (query, params = []) =>
            new Promise((resolve, reject) => {
                db.get(query, params, (err, row) => {
                    if (err) {
                        handleDbError(err, dbName);
                        return reject(err);
                    }
                    resolve(row || null);
                });
            }),
    };
}

async function openDatabases() {
    try {
        const [mDb, msgDb, imgDb, gDb] = await Promise.all([
            initializeDatabase(mainDbPath, 'Main Database'),
            initializeDatabase(messagesDbPath, 'Messages Database'),
            initializeDatabase(imageDbPath, 'Image Cache Database'),
            initializeDatabase(guildDbPath, 'Guild Database'),
        ]);
        mainDb = mDb;
        messagesDb = msgDb;
        imageDb = imgDb;
        guildDb = gDb;

        dbFunctions.main = createDbFunctions(mainDb, 'Main Database');
        dbFunctions.messages = createDbFunctions(messagesDb, 'Messages Database');
        dbFunctions.image = createDbFunctions(imageDb, 'Image Cache Database');
        dbFunctions.guild = createDbFunctions(guildDb, 'Guild Database');
    } catch (err) {
        logger.error(`🚨 Error opening databases: ${err.message}`);
        throw err;
    }
}

const initializationPromise = openDatabases().catch((err) => {
    logger.error(`Database initialization failed: ${err.message}`);
    process.exit(1); 
});

function setClient(client) {
    clientInstance = client;
}

async function handleDbError(error, dbName, client) {
    if (globalState.isShuttingDown) {
        logger.warn(
            `Shutdown in progress. Skipping error logging for ${dbName}: ${error.message}`
        );
        return;
    }
    logger.error(`🚨 Database Error in ${dbName}: ${error.message}`);
    const emitterClient = client || clientInstance;
    if (!emitterClient) {
        logger.warn('⚠️ Client instance is missing, cannot emit error event.');
        return;
    }
    try {

        await dbFunctions.guild.runQuery(`
            CREATE TABLE IF NOT EXISTS error_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                error_message TEXT NOT NULL,
                error_stack TEXT,
                occurrences INTEGER DEFAULT 1,
                last_occurred TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reported INTEGER DEFAULT 0
            )
        `);

        const existingError = await dbFunctions.guild.getOne(
            'SELECT * FROM error_logs WHERE error_message = ? AND last_occurred > DATETIME(\'now\', \'-1800 seconds\')',
            [error.message]
        );
        if (existingError) {
            await dbFunctions.guild.runQuery(
                'UPDATE error_logs SET occurrences = occurrences + 1, last_occurred = CURRENT_TIMESTAMP WHERE id = ?',
                [existingError.id]
            );
        } else {
            await dbFunctions.guild.runQuery(
                'INSERT INTO error_logs (error_message, error_stack) VALUES (?, ?)',
                [error.message, error.stack || null]
            );
        }
    } catch (logError) {
        logger.error(
            `🚨 Failed to log error in Guild Database: ${logError.message}`
        );
    }
    emitterClient.emit('error', error, emitterClient);
}

async function runTransaction(queries) {
    return transactionMutex.runExclusive(async () => {
        try {
            await new Promise((resolve, reject) => {
                mainDb.exec('BEGIN TRANSACTION', (err) =>
                    err ? reject(err) : resolve()
                );
            });
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
            await new Promise((resolve, reject) => {
                mainDb.exec('COMMIT', (err) => (err ? reject(err) : resolve()));
            });
        } catch (error) {
            await new Promise((resolve) => {
                mainDb.exec('ROLLBACK', () => resolve());
            });
            logger.error(`🚨 Error running transaction: ${error.message}`);
            throw error;
        }
    });
}

function cancelAllDbOperations() {
    const dbInstances = [mainDb, messagesDb, imageDb, guildDb];
    dbInstances.forEach((db) => {
        if (!db) return;
        db.run = function (...args) {
            const callback = args[args.length - 1];
            if (typeof callback === 'function') {
                return callback(
                    new Error('Database operation cancelled due to shutdown.')
                );
            }
        };
        db.exec = function (...args) {
            const callback = args[args.length - 1];
            if (typeof callback === 'function') {
                return callback(
                    new Error('Database operation cancelled due to shutdown.')
                );
            }
        };
        db.all = function (...args) {
            const callback = args[args.length - 1];
            if (typeof callback === 'function') {
                return callback(null, []);
            }
            return Promise.resolve([]);
        };
        db.get = function (...args) {
            const callback = args[args.length - 1];
            if (typeof callback === 'function') {
                return callback(null, null);
            }
            return Promise.resolve(null);
        };
    });
    logger.info('All further database operations have been cancelled.');
}

async function getConfigValue(key, defaultValue = null) {
    const row = await dbFunctions.main.getOne(
        'SELECT value FROM config WHERE key = ?',
        [key]
    );
    return row ? row.value : defaultValue;
}

async function setConfigValue(key, value) {
    const valStr = String(value);
    await dbFunctions.main.runQuery(
        'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
        [key, valStr]
    );
}

function closeDatabases() {
    return Promise.all([
        new Promise((resolve) => {
            if (mainDb) {
                mainDb.close((err) => {
                    if (err) {
                        logger.error(`Error closing Main Database: ${err.message}`);
                    } else {
                        logger.info('Main Database closed successfully.');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        }),
        new Promise((resolve) => {
            if (messagesDb) {
                messagesDb.close((err) => {
                    if (err) {
                        logger.error(`Error closing Messages Database: ${err.message}`);
                    } else {
                        logger.info('Messages Database closed successfully.');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        }),
        new Promise((resolve) => {
            if (imageDb) {
                imageDb.close((err) => {
                    if (err) {
                        logger.error(`Error closing Image Cache Database: ${err.message}`);
                    } else {
                        logger.info('Image Cache Database closed successfully.');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        }),
        new Promise((resolve) => {
            if (guildDb) {
                guildDb.close((err) => {
                    if (err) {
                        logger.error(`Error closing Guild Database: ${err.message}`);
                    } else {
                        logger.info('Guild Database closed successfully.');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        }),
    ]);
}

module.exports = {
    initializationPromise,
    runQuery: (...args) =>
        initializationPromise.then(() => dbFunctions.main.runQuery(...args)),
    getAll: (...args) =>
        initializationPromise.then(() => dbFunctions.main.getAll(...args)),
    getOne: (...args) =>
        initializationPromise.then(() => dbFunctions.main.getOne(...args)),
    runTransaction,
    getConfigValue,
    setConfigValue,
    messages: {
        runQuery: (...args) =>
            initializationPromise.then(() => dbFunctions.messages.runQuery(...args)),
        getAll: (...args) =>
            initializationPromise.then(() => dbFunctions.messages.getAll(...args)),
        getOne: (...args) =>
            initializationPromise.then(() => dbFunctions.messages.getOne(...args)),
    },
    image: {
        runQuery: (...args) =>
            initializationPromise.then(() => dbFunctions.image.runQuery(...args)),
        getAll: (...args) =>
            initializationPromise.then(() => dbFunctions.image.getAll(...args)),
        getOne: (...args) =>
            initializationPromise.then(() => dbFunctions.image.getOne(...args)),
    },
    guild: {
        runQuery: (...args) =>
            initializationPromise.then(() => dbFunctions.guild.runQuery(...args)),
        getAll: (...args) =>
            initializationPromise.then(() => dbFunctions.guild.getAll(...args)),
        getOne: (...args) =>
            initializationPromise.then(() => dbFunctions.guild.getOne(...args)),
    },
    setClient,
    openDatabases, 
    closeDatabases,
    handleDbError,
    cancelAllDbOperations,
};
