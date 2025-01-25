/* eslint-disable no-process-exit */
/**
 * @fileoverview Configures and exports a Winston logger instance with daily log rotation.
 * The logger handles logging to both the console and log files organized by year and month.
 * It also manages uncaught exceptions and unhandled promise rejections.
 *
 * @module modules/functions/logger
 */

const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

/**
 * Custom log format combining timestamp and log level with the message.
 *
 * @constant {winston.Format}
 */
const logFormat = winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level}] ${message}`;
});

/**
 * Generates the directory path for logs based on the current year and month.
 *
 * @function getYearMonthPath
 * @returns {string} - The path to the log directory for the current year and month.
 * @example
 * const logPath = getYearMonthPath();
 * // logPath might be 'logs/2025/january'
 */
const getYearMonthPath = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('default', { month: 'long' });
    return path.join('logs', year.toString(), month.toLowerCase());
};

/**
 * Ensures that the necessary log directories exist.
 * Creates year/month folders and a dedicated handler directory for audit files if they don't exist.
 *
 * @function createLogDirectories
 * @returns {void}
 * @example
 * createLogDirectories();
 */
const createLogDirectories = () => {
    const dirPath = getYearMonthPath();
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true }); // Create year/month folder if it doesn't exist
    }

    // Ensure the 'logs/handler' directory exists for the audit file
    const dataDir = path.join('logs', 'handler');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
};

/**
 * Creates and configures the Winston logger instance.
 * The logger writes logs to the console and to daily rotated log files.
 *
 * @constant {winston.Logger}
 * @example
 * logger.info('This is an info message');
 * logger.error('This is an error message');
 */
const logger = winston.createLogger({
    level: 'info', // Default log level
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat // Custom log format
    ),
    transports: [
        /**
         * Console transport for logging to the terminal.
         * Uses colorized output for better readability.
         */
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat // Custom format for console output
            )
        }),

        /**
         * DailyRotateFile transport for logging to files with daily rotation.
         * Logs are stored in directories structured by year and month.
         * Each log file is limited to 20MB and kept for 7 days.
         */
        new winston.transports.DailyRotateFile({
            filename: path.join(getYearMonthPath(), '%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '7d',
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                logFormat
            ),
            dirname: getYearMonthPath(), // Ensure directory path for logs
            auditFile: path.join('logs', 'handler', 'audit.json') // Place the audit file in logs/handler
        })
    ]
});

/**
 * Initializes the logging system by ensuring necessary directories exist.
 * Must be called before any logging occurs.
 *
 * @function initializeLogger
 * @returns {void}
 * @example
 * initializeLogger();
 */
const initializeLogger = () => {
    createLogDirectories();
};

// Initialize logger directories
initializeLogger();

/**
 * Handles uncaught exceptions by logging the error and exiting the process.
 *
 * @event module:modules/functions/logger~logger
 * @param {Error} error - The uncaught exception.
 * @returns {void}
 * @example
 * // This is handled automatically by the logger configuration.
 */
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    process.exit(1); // Exit to prevent unpredictable behavior
});

/**
 * Handles unhandled promise rejections by logging the reason and the promise.
 *
 * @event module:modules/functions/logger~logger
 * @param {any} reason - The reason for the rejection.
 * @param {Promise} promise - The promise that was rejected.
 * @returns {void}
 * @example
 * // This is handled automatically by the logger configuration.
 */
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Export logger instance for use in other modules
module.exports = logger;
