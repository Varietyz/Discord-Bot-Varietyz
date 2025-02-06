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
// 🔔 New: Define image cache database path using a dot in the name as requested.
const imageDbPath = path.join(__dirname, '../../data/image_cache.db');

const mainDb = new sqlite3.Database(mainDbPath, (err) => {
    if (err) {
        logger.error(`🚨 Error connecting to main SQLite database: ${err.message}`);
    } else {
        logger.info('✅ Main database connected successfully.');
    }
});

const messagesDb = new sqlite3.Database(messagesDbPath, (err) => {
    if (err) {
        logger.error(`🚨 Error connecting to messages SQLite database: ${err.message}`);
    } else {
        logger.info('✅ Messages database connected successfully.');
    }
});

// 🔔 New: Connect to the image cache database.
const imageDb = new sqlite3.Database(imageDbPath, (err) => {
    if (err) {
        logger.error(`🚨 Error connecting to image cache database: ${err.message}`);
    } else {
        logger.info('✅ Image cache database connected successfully.');
    }
});

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
            if (err) return reject(err);
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
            if (err) return reject(err);
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
            if (err) return reject(err);
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
            if (err) return reject(err);
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
            if (err) return reject(err);
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
            if (err) return reject(err);
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
                    if (err) return reject(err);
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
        if (err) {
            logger.error(`🚨 Error closing the main database connection: ${err.message}`);
        } else {
            logger.info('✅ Main database connection closed successfully.');
        }
    });
    messagesDb.close((err) => {
        if (err) {
            logger.error(`🚨 Error closing the messages database connection: ${err.message}`);
        } else {
            logger.info('✅ Messages database connection closed successfully.');
        }
        // 🔔 New: Close the image cache database connection as well.
        imageDb.close((err) => {
            if (err) {
                logger.error(`🚨 Error closing the image cache database connection: ${err.message}`);
            } else {
                logger.info('✅ Image cache database connection closed successfully.');
            }
            process.exit(0);
        });
    });
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
            if (err) return reject(err);
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
            if (err) return reject(err);
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
            if (err) return reject(err);
            resolve(row || null);
        });
    });

module.exports = {
    runQuery,
    getAll,
    getOne,
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
};
