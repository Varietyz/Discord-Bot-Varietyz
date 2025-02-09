/* eslint-disable no-process-exit */
/* eslint-disable jsdoc/require-returns */
/* eslint-disable no-undef */
// @ts-nocheck
/**
 * @fileoverview
 * **SQLite Database Utility Functions** 💾
 *
 * This module provides utility functions for interacting with two SQLite databases in the Varietyz Bot:
 * - The main database (`database.sqlite`)
 * - The messages database (`messages.db`)
 *
 * Additionally, a third database is now configured for caching images, stored in `image.cache`.
 *
 * It includes functions to execute SQL queries, retrieve data, run transactions, and manage configuration values.
 * It also handles graceful database closure on process termination.
 *
 * ---
 *
 * 🔹 **Key Features:**
 * - **SQL Query Execution:** Execute INSERT, UPDATE, DELETE, and SELECT queries on each database.
 * - **Data Retrieval:** Retrieve all matching rows (`getAll`) or a single row (`getOne`).
 * - **Transaction Support:** Run multiple queries in a transaction.
 * - **Configuration Management:** Get and set configuration values in the main database.
 * - **Graceful Shutdown:** Closes the database connections on SIGINT.
 *
 * @module utils/dbUtils
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger');

const mainDbPath = path.join(__dirname, '../../data/database.sqlite');
const messagesDbPath = path.join(__dirname, '../../data/messages.db');
const imageDbPath = path.join(__dirname, '../../data/image_cache.db');
const guildDbPath = path.join(__dirname, '../../data/guild.db');

let mainDb, messagesDb, imageDb, guildDb;

/**
 * Opens all SQLite databases if they are not already open.
 */
function openDatabases() {
    if (!mainDb) {
        mainDb = new sqlite3.Database(mainDbPath, (err) => {
            if (err) {
                handleDbError(err, 'Main Database');
                return reject(err);
            } else console.log(`✅ SQLite Main Database connected: ${mainDbPath}`);
        });
    }

    if (!messagesDb) {
        messagesDb = new sqlite3.Database(messagesDbPath, (err) => {
            if (err) {
                handleDbError(err, 'Message Database');
                return reject(err);
            } else console.log(`✅ SQLite Messages Database connected: ${messagesDbPath}`);
        });
    }

    if (!imageDb) {
        imageDb = new sqlite3.Database(imageDbPath, (err) => {
            if (err) {
                handleDbError(err, 'Image Database');
                return reject(err);
            } else console.log(`✅ SQLite Image Cache Database connected: ${imageDbPath}`);
        });
    }

    if (!guildDb) {
        guildDb = new sqlite3.Database(guildDbPath, (err) => {
            if (err) {
                handleDbError(err, 'Guild Database');
                return reject(err);
            } else console.log(`✅ SQLite Guild Database connected: ${guildDbPath}`);
        });
    }
}

// 🔥 Open all databases on startup
openDatabases();

// A module-scoped variable to hold the client instance.
let clientInstance = null;

/**
 * Sets the Discord client instance for use in error reporting.
 *
 * @param {Client} client - The Discord client instance.
 */
function setClient(client) {
    clientInstance = client;
}

/**
 * Handles database errors by logging them, recording in the error_logs table,
 * and emitting an error event through the client.
 *
 * @param {Error} error - The error object.
 * @param {string} dbName - The name of the database where the error occurred.
 * @param {Client} [client] - Optional client instance; if not provided, the stored clientInstance is used.
 */
async function handleDbError(error, dbName, client) {
    logger.error(`🚨 Database Error in ${dbName}: ${error.message}`);

    // Use the provided client or fallback to the stored clientInstance.
    const emitterClient = client || clientInstance;
    if (!emitterClient) {
        logger.warn('⚠️ Client instance is missing, cannot emit error event.');
        return;
    }

    // Ensure the error_logs table exists.
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

    // Check if this error occurred recently (within the last 1800 seconds).
    const existingError = await guildGetOne('SELECT * FROM error_logs WHERE error_message = ? AND last_occurred > DATETIME(\'now\', \'-1800 seconds\')', [error.message]);

    if (existingError) {
        await guildRunQuery('UPDATE error_logs SET occurrences = occurrences + 1, last_occurred = CURRENT_TIMESTAMP WHERE id = ?', [existingError.id]);
    } else {
        await guildRunQuery('INSERT INTO error_logs (error_message, error_stack) VALUES (?, ?)', [error.message, error.stack || null]);
    }

    // Emit the error event so your error.js event file can catch it.
    emitterClient.emit('error', error, emitterClient);
}

/**
 * 🎯 **Executes a SQL Query on the Main Database**
 *
 * @param {string} query - The SQL query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<sqlite3.RunResult>} A promise that resolves to the result of the query.
 */
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

/**
 * 🎯 **Retrieves All Rows from the Main Database**
 *
 * @param {string} query - The SQL SELECT query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of rows.
 */
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

/**
 * 🎯 **Retrieves a Single Row from the Main Database**
 *
 * @param {string} query - The SQL SELECT query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<Object|null>} A promise that resolves to a single row object or `null` if not found.
 */
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

/**
 * 🎯 **Executes a SQL Query on the Messages Database**
 *
 * @param {string} query - The SQL query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<sqlite3.RunResult>} A promise that resolves to the result of the query.
 */
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

/**
 * 🎯 **Retrieves All Rows from the Messages Database**
 *
 * @param {string} query - The SQL SELECT query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of rows.
 */
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

/**
 * 🎯 **Retrieves a Single Row from the Messages Database**
 *
 * @param {string} query - The SQL SELECT query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<Object|null>} A promise that resolves to a single row object or `null` if not found.
 */
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

/**
 * 🎯 **Executes a SQL Transaction on the Main Database**
 *
 * Runs multiple SQL queries in a transaction for atomicity.
 *
 * @param {Array<{query: string, params: Array<any>}>} queries - An array of query objects with their parameters.
 * @returns {Promise<void>} A promise that resolves when the transaction is complete.
 */
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

/**
 * Gracefully closes both main and messages database connections on SIGINT.
 */
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

    process.exit(0);
});

/**
 * 🎯 **Retrieves a Configuration Value from the Main Database**
 *
 * @param {string} key - The configuration key.
 * @param {any} [defaultValue=null] - The default value if the key is not found.
 * @returns {Promise<any>} A promise that resolves to the configuration value or the default.
 *
 * @example
 * const rotationPeriod = await getConfigValue('rotation_period_weeks', 1);
 */
async function getConfigValue(key, defaultValue = null) {
    const row = await getOne('SELECT value FROM config WHERE key = ?', [key]);
    if (!row) return defaultValue;
    return row.value; // Note: Stored as text; convert if necessary.
}

/**
 * 🎯 **Sets a Configuration Value in the Main Database**
 *
 * @param {string} key - The configuration key.
 * @param {any} value - The value to set.
 *
 * @example
 * await setConfigValue('rotation_period_weeks', 2);
 */
async function setConfigValue(key, value) {
    const valStr = String(value);
    await runQuery('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, valStr]);
}

/**
 * 🎯 **Image Cache Database: Executes a SQL Query**
 *
 * Executes a SQL query that modifies data (INSERT, UPDATE, DELETE) on the image cache database.
 *
 * @param {string} query - The SQL query to execute.
 * @param {Array<any>} [params=[]] - The parameters for the query.
 * @returns {Promise<sqlite3.RunResult>} A promise that resolves to the result of the query.
 *
 * @example
 * await imageRunQuery('INSERT INTO images (url, timestamp) VALUES (?, ?)', [url, Date.now()]);
 */
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

/**
 * 🎯 **Image Cache Database: Retrieves All Rows**
 *
 * Executes a SQL SELECT query on the image cache database and retrieves all matching rows.
 *
 * @param {string} query - The SQL SELECT query.
 * @param {Array<any>} [params=[]] - The parameters for the query.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of rows.
 *
 * @example
 * const images = await imageGetAll('SELECT * FROM images');
 */
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

/**
 * 🎯 **Image Cache Database: Retrieves a Single Row**
 *
 * Executes a SQL SELECT query on the image cache database and retrieves a single matching row.
 *
 * @param {string} query - The SQL SELECT query.
 * @param {Array<any>} [params=[]] - The parameters for the query.
 * @returns {Promise<Object|null>} A promise that resolves to a single row or `null` if not found.
 *
 * @example
 * const image = await imageGetOne('SELECT * FROM images WHERE id = ?', [1]);
 */
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

/**
 * 🎯 **Guild Database: Executes a SQL Query**
 *
 * Executes a SQL query that modifies data (INSERT, UPDATE, DELETE) on the Guild database.
 *
 * @param {string} query - The SQL query to execute.
 * @param {Array<any>} [params=[]] - The parameters for the query.
 * @returns {Promise<sqlite3.RunResult>} A promise that resolves to the result of the query.
 *
 */
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

/**
 * 🎯 **Guild Database: Retrieves All Rows**
 *
 * Executes a SQL SELECT query on the Guild database and retrieves all matching rows.
 *
 * @param {string} query - The SQL SELECT query.
 * @param {Array<any>} [params=[]] - The parameters for the query.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of rows.
 *
 */
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

/**
 * 🎯 **Guild Database: Retrieves a Single Row**
 *
 * Executes a SQL SELECT query on the Guild database and retrieves a single matching row.
 *
 * @param {string} query - The SQL SELECT query.
 * @param {Array<any>} [params=[]] - The parameters for the query.
 * @returns {Promise<Object|null>} A promise that resolves to a single row or `null` if not found.
 *
 */
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

/**
 * 🎯 **Retrieves a Single Row from the Main Database Synchronously**
 *
 * Uses SQLite's synchronous `.prepare().get()` to ensure it runs **without async/await**.
 *
 * @param {string} query - The SQL SELECT query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Object|null} A single row object or `null` if not found.
 */
const getOneSync = (query, params = []) => {
    try {
        openDatabases(); // Ensure database is open before running query

        console.log(`🔍 DEBUG: Running getOneSync with query: ${query} | Params: ${JSON.stringify(params)}`);

        const stmt = mainDb.prepare(query); // Prepare statement
        const row = stmt.get(...params); // Execute query with parameters
        stmt.finalize(); // Free memory

        if (!row) {
            console.error('🚨 getOneSync ERROR: Query returned NO RESULT.');
            return null;
        }

        console.log('✅ getOneSync SUCCESS: Retrieved Row →', row);
        return row;
    } catch (err) {
        console.error(`🚨 getOneSync ERROR: ${err.message}`);
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
    setClient, // Export the setter so it can be called from your main file
    openDatabases,
};
