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
 * It includes functions to execute SQL queries, retrieve data, run transactions, and manage configuration values.
 * Additionally, it handles graceful database closure on process termination.
 *
 * **Key Features:**
 * - **SQL Query Execution:** Execute INSERT, UPDATE, DELETE, and SELECT queries on either database.
 * - **Data Retrieval:** Retrieve all matching rows (`getAll`) or a single row (`getOne`).
 * - **Transaction Support:** Run multiple queries in a transaction.
 * - **Configuration Management:** Get and set configuration values in the main database.
 * - **Graceful Shutdown:** Closes the database connections on SIGINT.
 *
 * **External Dependencies:**
 * - **sqlite3:** For interacting with the SQLite databases.
 * - **logger:** For logging database operations and errors.
 *
 * @module utils/dbUtils
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger');

const mainDbPath = path.join(__dirname, '../../data/database.sqlite');
const messagesDbPath = path.join(__dirname, '../../data/messages.db');

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

/**
 * Executes a SQL query that modifies data (e.g., INSERT, UPDATE, DELETE) on the main database.
 *
 * @function runQuery
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
 * Executes a SQL SELECT query and retrieves all matching rows from the main database.
 *
 * @function getAll
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
 * Executes a SQL SELECT query and retrieves a single matching row from the main database.
 *
 * @function getOne
 * @param {string} query - The SQL SELECT query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<Object|null>} A promise that resolves to a single row object or `null` if no row matches.
 */
const getOne = (query, params = []) =>
    new Promise((resolve, reject) => {
        mainDb.get(query, params, (err, row) => {
            if (err) return reject(err);
            resolve(row || null);
        });
    });

/**
 * Executes a SQL query that modifies data on the messages database.
 *
 * @function messagesRunQuery
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
 * Executes a SQL SELECT query and retrieves all matching rows from the messages database.
 *
 * @function messagesGetAll
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
 * Executes a SQL SELECT query and retrieves a single matching row from the messages database.
 *
 * @function messagesGetOne
 * @param {string} query - The SQL SELECT query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<Object|null>} A promise that resolves to a single row object or `null` if no row matches.
 */
const messagesGetOne = (query, params = []) =>
    new Promise((resolve, reject) => {
        messagesDb.get(query, params, (err, row) => {
            if (err) return reject(err);
            resolve(row || null);
        });
    });

/**
 * Executes a SQL transaction with multiple queries on the main database.
 *
 * @function runTransaction
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
 * Gracefully closes both SQLite database connections upon receiving a SIGINT signal.
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
        process.exit(0);
    });
});

/**
 * Fetches a configuration value from the main database.
 *
 * @function getConfigValue
 * @param {string} key - The configuration key.
 * @param {any} [defaultValue=null] - The default value to return if key is not found.
 * @returns {Promise<any>} A promise that resolves to the configuration value or the default.
 */
async function getConfigValue(key, defaultValue = null) {
    const row = await getOne('SELECT value FROM config WHERE key = ?', [key]);
    if (!row) return defaultValue;
    return row.value; // Note: Stored as text; convert if necessary.
}

/**
 * Sets a configuration key's value in the main database.
 *
 * @function setConfigValue
 * @param {string} key - The configuration key.
 * @param {any} value - The value to set for the key.
 */
async function setConfigValue(key, value) {
    const valStr = String(value);
    await runQuery('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, valStr]);
}

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
};
