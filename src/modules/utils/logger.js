/* eslint-disable no-process-exit */
/**
 * @fileoverview Winston logger utility for the Varietyz Bot.
 * Configures and exports a Winston logger instance with daily log rotation and enhanced error handling.
 * This module provides logging functionality to output messages to the console and log files,
 * as well as manage log directories, rotate logs daily, and handle uncaught exceptions and unhandled promise rejections.
 *
 * Key Features:
 * - **Console Logging**: Colorized console output for easy readability of logs.
 * - **Daily Log Rotation**: Logs are written to files with daily rotation and retention, organized by year and month.
 * - **Error Handling**: Captures uncaught exceptions and unhandled promise rejections, logging the error and gracefully exiting.
 * - **Log Directory Management**: Ensures log directories exist and creates necessary folder structures.
 *
 * External Dependencies:
 * - **winston**: A powerful logging library for logging to both the console and file systems.
 * - **winston-daily-rotate-file**: A winston transport for logging to daily rotating files.
 * - **path**: Utility for handling file paths.
 * - **fs**: Node's file system module for checking and creating directories.
 *
 * @module utils/logger
 */

const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

/**
 * Custom log format combining a timestamp, log level, and message.
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
 * @returns {string} The path to the log directory for the current year and month.
 * @example
 * const logPath = getYearMonthPath();
 * // Example: 'logs/2025/january'
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
 * The logger writes logs to the console and daily rotated log files.
 *
 * @constant {winston.Logger}
 * @example
 * logger.info('This is an info message');
 * logger.error('This is an error message');
 */
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    transports: [
        /**
         * Console transport for logging to the terminal.
         * Uses colorized output for better readability.
         */
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), logFormat),
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
            level: 'debug',
            format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
            auditFile: path.join('logs', 'handler', 'audit.json'),
        }),
    ],
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
 * @event uncaughtException
 * @param {Error} error - The uncaught exception.
 * @returns {void}
 */
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    process.exit(1); // Exit to prevent unpredictable behavior
});

/**
 * Handles unhandled promise rejections by logging the reason and the promise.
 *
 * @event unhandledRejection
 * @param {any} reason - The reason for the rejection.
 * @param {Promise} promise - The promise that was rejected.
 * @returns {void}
 */
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Export logger instance for use in other modules
module.exports = logger;
