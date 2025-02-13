/* eslint-disable no-process-exit */
/**
 * @fileoverview
 * **Winston Logger Utility** 📝
 *
 * This module configures and exports a Winston logger instance with daily log rotation and enhanced error handling.
 * It writes log messages to both the console and log files, organizes logs by year and month, and gracefully handles
 * uncaught exceptions and unhandled promise rejections.
 *
 * **Key Features:**
 * - **Console Logging:** Provides colorized output for easy readability.
 * - **Daily Log Rotation:** Organizes log files into directories by year and month, rotates files daily, limits file size, and retains logs for 7 days.
 * - **Error Handling:** Captures uncaught exceptions and unhandled promise rejections, logs them, and exits the process.
 * - **Log Directory Management:** Ensures required directories exist for storing log files and audit information.
 *
 * **External Dependencies:**
 * - **winston:** Core logging library.
 * - **winston-daily-rotate-file:** Transport for daily rotating log files.
 * - **path:** For handling file paths.
 * - **fs:** For file system operations.
 *
 * @module utils/logger
 */

const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const logFormat = winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level}] ${message}`;
});

/**
 * Generates the directory path for logs based on the current year and month.
 *
 * @function getYearMonthPath
 * @returns {string} The log directory path for the current year and month.
 *
 * @example
 * const logPath = getYearMonthPath();
 * // e.g., 'logs/2025/january'
 */
const getYearMonthPath = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('default', { month: 'long' });
    return path.join('logs', year.toString(), month.toLowerCase());
};

/**
 * Ensures that necessary log directories exist. Creates directories for year/month logs and a dedicated audit folder.
 *
 * @function createLogDirectories
 * @returns {void}
 *
 * @example
 * createLogDirectories();
 */
const createLogDirectories = () => {
    const dirPath = getYearMonthPath();
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    const auditDir = path.join('logs', 'handler');
    if (!fs.existsSync(auditDir)) {
        fs.mkdirSync(auditDir, { recursive: true });
    }
};

/**
 * Creates and configures the Winston logger instance.
 *
 * The logger writes logs to the console with colorized output and to daily rotated log files.
 *
 * @constant {winston.Logger}
 *
 * @example
 * logger.info('This is an informational message');
 * logger.error('This is an error message');
 */
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), logFormat),
        }),
        new winston.transports.DailyRotateFile({
            filename: path.join(getYearMonthPath(), '%DATE%.md'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '7d',
            level: 'debug',
            format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
            auditFile: path.join('logs', 'handler', 'audit.json'),
        }),
    ],
});

/**
 * Initializes the logging system by ensuring that necessary directories exist.
 *
 * @function initializeLogger
 * @returns {void}
 *
 * @example
 * initializeLogger();
 */
const initializeLogger = () => {
    createLogDirectories();
};

initializeLogger();

/**
 * Handles uncaught exceptions by logging the error and exiting the process.
 *
 * @event uncaughtException
 * @param {Error} error - The uncaught exception.
 * @returns {void}
 */
process.on('uncaughtException', (error) => {
    logger.error(`🚨 **Uncaught Exception:** ${error.message}`);
    process.exit(1);
});

/**
 * Handles unhandled promise rejections by logging the promise and its reason.
 *
 * @event unhandledRejection
 * @param {any} reason - The reason for the rejection.
 * @param {Promise} promise - The promise that was rejected.
 * @returns {void}
 */
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`🚨 **Unhandled Rejection:** at ${promise}, reason: ${reason}`);
});

module.exports = logger;
