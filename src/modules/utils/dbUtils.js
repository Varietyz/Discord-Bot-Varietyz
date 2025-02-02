/* eslint-disable jsdoc/require-returns */
/* eslint-disable no-undef */
// @ts-nocheck
/**
 * @fileoverview
 * **SQLite Database Utility Functions** 💾
 *
 * This module provides utility functions for interacting with the SQLite database in the Varietyz Bot.
 * It includes functions to execute SQL queries, retrieve data, run transactions, and manage configuration values.
 * Additionally, it handles graceful database closure on process termination.
 *
 * **Key Features:**
 * - **SQL Query Execution**: Execute INSERT, UPDATE, DELETE, and SELECT queries.
 * - **Data Retrieval**: Retrieve all matching rows (`getAll`) or a single row (`getOne`).
 * - **Transaction Support**: Run multiple queries in a transaction.
 * - **Configuration Management**: Get and set configuration values in the database.
 * - **Graceful Shutdown**: Closes the database connection on SIGINT.
 *
 * **External Dependencies:**
 * - **sqlite3**: For interacting with the SQLite database.
 * - **logger**: For logging database operations and errors.
 *
 * @module utils/dbUtils
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger'); // Import the logger

/**
 * Path to the SQLite database file.
 * @constant {string}
 */
const dbPath = path.join(__dirname, '../../data/database.sqlite');

/**
 * Initializes and maintains the SQLite database connection.
 * Logs the connection status using the logger.
 *
 * @constant {sqlite3.Database}
 */
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logger.error(`Error connecting to SQLite: ${err.message}`);
    } else {
        logger.info('Database connected successfully.');
    }
});

/**
 * Executes a SQL query that modifies data (e.g., INSERT, UPDATE, DELETE).
 *
 * @function runQuery
 * @param {string} query - The SQL query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<sqlite3.RunResult>} A promise that resolves to the result of the query.
 *
 * @example
 * // Insert a new user:
 * runQuery('INSERT INTO users (name, age) VALUES (?, ?)', ['Alice', 30])
 *   .then(result => {
 *     logger.info(`Rows affected: ${result.changes}`);
 *   })
 *   .catch(err => {
 *     logger.error(err);
 *   });
 */
const runQuery = (query, params = []) =>
    new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });

/**
 * Executes a SQL SELECT query and retrieves all matching rows.
 *
 * @function getAll
 * @param {string} query - The SQL SELECT query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of rows.
 *
 * @example
 * // Retrieve users older than 25:
 * getAll('SELECT * FROM users WHERE age > ?', [25])
 *   .then(rows => {
 *     logger.info(rows);
 *   })
 *   .catch(err => {
 *     logger.error(err);
 *   });
 */
const getAll = (query, params = []) =>
    new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });

/**
 * Executes a SQL SELECT query and retrieves a single matching row.
 *
 * @function getOne
 * @param {string} query - The SQL SELECT query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<Object|null>} A promise that resolves to a single row object or `null` if no row matches.
 *
 * @example
 * // Retrieve a user with id 1:
 * getOne('SELECT * FROM users WHERE id = ?', [1])
 *   .then(row => {
 *     logger.info(row);
 *   })
 *   .catch(err => {
 *     logger.error(err);
 *   });
 */
const getOne = (query, params = []) =>
    new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) return reject(err);
            resolve(row || null);
        });
    });

/**
 * Executes a SQL transaction with multiple queries.
 *
 * @function runTransaction
 * @param {Array<{query: string, params: Array<any>}>} queries - An array of query objects with their parameters.
 * @returns {Promise<void>} A promise that resolves when the transaction is complete.
 *
 * @example
 * // Execute multiple queries as a transaction:
 * await runTransaction([
 *   { query: 'INSERT INTO users (name) VALUES (?)', params: ['Alice'] },
 *   { query: 'INSERT INTO users (name) VALUES (?)', params: ['Bob'] }
 * ]);
 */
const runTransaction = async (queries) => {
    try {
        await db.exec('BEGIN TRANSACTION');
        for (const { query, params } of queries) {
            // Using runQuery to execute each query.
            await new Promise((resolve, reject) => {
                db.run(query, params, (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        }
        await db.exec('COMMIT');
    } catch (error) {
        await db.exec('ROLLBACK');
        logger.error(`Error running transaction: ${error.message}`);
        throw error;
    }
};

/**
 * Gracefully closes the SQLite database connection upon receiving a SIGINT signal.
 * Logs the closure status and exits the process.
 *
 * @listens process#SIGINT
 * @returns {void}
 */
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            logger.error(`Error closing the database connection: ${err.message}`);
        } else {
            logger.info('Database connection closed successfully.');
        }
        // eslint-disable-next-line no-process-exit
        process.exit(0);
    });
});

/**
 * Fetches a configuration value from the database.
 * If the key is not found, returns a default value.
 *
 * @function getConfigValue
 * @param {string} key - The configuration key.
 * @param {any} [defaultValue=null] - The default value to return if key is not found.
 * @returns {Promise<any>} A promise that resolves to the configuration value or the default.
 *
 * @example
 * const prefix = await getConfigValue('bot_prefix', '!');
 */
async function getConfigValue(key, defaultValue = null) {
    const row = await getOne(
        `
    SELECT value
    FROM config
    WHERE key = ?
  `,
        [key],
    );

    if (!row) return defaultValue;
    return row.value; // Note: Stored as text; convert if necessary.
}

/**
 * Sets a configuration key's value in the database.
 * Inserts a new record if the key does not exist, or updates it otherwise.
 *
 * @function setConfigValue
 * @param {string} key - The configuration key.
 * @param {any} value - The value to set for the key.
 *
 * @example
 * await setConfigValue('bot_prefix', '!');
 */
async function setConfigValue(key, value) {
    // Ensure the value is a string.
    const valStr = String(value);

    // Upsert using "INSERT OR REPLACE".
    await runQuery(
        `
    INSERT OR REPLACE INTO config (key, value)
    VALUES (?, ?)
  `,
        [key, valStr],
    );
}

module.exports = { runQuery, getAll, getOne, runTransaction, getConfigValue, setConfigValue };
