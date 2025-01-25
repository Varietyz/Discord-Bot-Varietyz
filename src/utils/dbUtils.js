// @ts-nocheck
/**
 * @fileoverview Utility functions for interacting with the SQLite database.
 * Provides functions to execute queries and handle database operations.
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
const dbPath = path.join(__dirname, '../data/database.sqlite');

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
 * Returns the result object containing metadata about the operation.
 *
 * @param {string} query - The SQL query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<sqlite3.RunResult>} - A promise that resolves to the result of the query.
 * @example
 * runQuery('INSERT INTO users (name, age) VALUES (?, ?)', ['Alice', 30])
 * .then(result => {
 * logger.info(`Rows affected: ${result.changes}`);
 * })
 * .catch(err => {
 * logger.error(err);
 * });
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
 * @param {string} query - The SQL SELECT query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of rows.
 * @example
 * getAll('SELECT * FROM users WHERE age > ?', [25])
 * .then(rows => {
 * logger.info(rows);
 * })
 * .catch(err => {
 * logger.error(err);
 * });
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
 * @param {string} query - The SQL SELECT query to execute.
 * @param {Array<any>} [params=[]] - The parameters to bind to the SQL query.
 * @returns {Promise<Object>} - A promise that resolves to a single row object.
 * @example
 * getOne('SELECT * FROM users WHERE id = ?', [1])
 * .then(row => {
 * logger.info(row);
 * })
 * .catch(err => {
 * logger.error(err);
 * });
 */
const getOne = (query, params = []) =>
    new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });

/**
 * Gracefully closes the SQLite database connection upon receiving a SIGINT signal.
 * Logs the closure status using the logger and exits the process.
 *
 * @listens process#SIGINT
 */
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            logger.error(
                `Error closing the database connection: ${err.message}`
            );
        } else {
            logger.info('Database connection closed successfully.');
        }
        // eslint-disable-next-line no-process-exit
        process.exit(0);
    });
});

module.exports = { runQuery, getAll, getOne };
