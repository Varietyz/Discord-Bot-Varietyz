// utils/dbUtils.js

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const logger = require("../modules/functions/logger"); // Import the logger

const dbPath = path.join(__dirname, "../data/database.sqlite");

// Initialize database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error(`Error connecting to SQLite: ${err.message}`);
  } else {
    logger.info("Database connected successfully.");
  }
});

/**
 * Executes a query that modifies data (INSERT, UPDATE, DELETE).
 * Returns the result object.
 *
 * @param {string} query - The SQL query.
 * @param {Array} params - The query parameters.
 * @returns {Promise<Object>} - Result of the query.
 */
const runQuery = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

/**
 * Executes a SELECT query and returns all rows.
 *
 * @param {string} query - The SQL query.
 * @param {Array} params - The query parameters.
 * @returns {Promise<Array>} - Array of rows.
 */
const getAll = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

/**
 * Executes a SELECT query and returns a single row.
 *
 * @param {string} query - The SQL query.
 * @param {Array} params - The query parameters.
 * @returns {Promise<Object>} - Single row object.
 */
const getOne = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

/**
 * Gracefully closes the database connection on process termination.
 */
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      logger.error(`Error closing the database connection: ${err.message}`);
    } else {
      logger.info("Database connection closed successfully.");
    }
    process.exit(0);
  });
});

module.exports = { runQuery, getAll, getOne };
