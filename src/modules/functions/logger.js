const winston = require("winston");
require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");

// Define custom log formats
const logFormat = winston.format.printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level}] ${message}`;
});

// Get the current year and month dynamically
const getYearMonthPath = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.toLocaleString("default", { month: "long" });
  return path.join("logs", year.toString(), month.toLowerCase());
};

// Create the 'logs' and 'logs/data' directories if they don't exist
const createLogDirectories = () => {
  const dirPath = getYearMonthPath();
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true }); // Create year/month folder if it doesn't exist
  }

  // Ensure the 'logs/data' directory exists for the audit file
  const dataDir = path.join("logs", "handler");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Create the logger instance
const logger = winston.createLogger({
  level: "info", // Default log level
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat, // Custom log format
  ),
  transports: [
    // Console transport for logging to the terminal
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat, // Custom format for console output
      ),
    }),

    // Daily log file rotation into year/month folder with .log files
    new winston.transports.DailyRotateFile({
      filename: path.join(getYearMonthPath(), "%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "7d",
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat,
      ),
      dirname: getYearMonthPath(), // Ensure directory path for logs
      auditFile: path.join("logs", "handler", "audit.json"), // Place the audit file in logs/data
    }),
  ],
});

// Ensure the necessary directories are created before logging begins
createLogDirectories();

// Handle uncaught exceptions and unhandled promise rejections
process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1); // Exit to prevent unpredicted behavior
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Export logger instance
module.exports = logger;
