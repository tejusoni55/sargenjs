import chalk from "chalk";

/**
 * Helper for consistent console logging with colors
 */
const logger = {
  /**
   * Logs a plain message
   * @param {string} message - Message to log
   */
  log: (message) => {
    console.log(chalk.blue(`[INFO]: ${message}`));
  },

  /**
   * Logs an info message in blue
   * @param {string} message - Message to log
   */
  info: (message) => {
    console.info(chalk.blue(`[INFO]: ${message}`));
  },

  /**
   * Logs a verbose message
   * @param {string} message - Message to log
   */
  verbose: (message) => {
    console.log(chalk.gray(`[VERBOSE]: ${message}`));
  },

  /**
   * Logs a success message in green
   * @param {string} message - Message to log
   */
  success: (message) => {
    console.log(chalk.green(`[SUCCESS]: ${message}`));
  },

  /**
   * Logs an error message in red
   * @param {string} message - Message to log
   */
  error: (message) => {
    console.error(chalk.red(`[ERROR]: ${message}`));
  },

  /**
   * Logs a warning message in yellow
   * @param {string} message - Message to log
   */
  warn: (message) => {
    console.warn(chalk.yellow(`[WARN]: ${message}`));
  },
};

export default logger;
