import chalk from "chalk";

/**
 * Global logger management for SargenJS
 */
const LOGGER_KEY = Symbol.for("sargenjs.logger");

/**
 * Logger class for consistent console logging with colors and verbose support
 */
class Logger {
  constructor(options = {}) {
    this._verbose = options.verbose || false;
  }

  /**
   * Logs a plain message
   * @param {string} message - Message to log
   */
  log(message) {
    console.log(chalk.blue(`[INFO]: ${message}`));
  }

  /**
   * Logs a success message in green
   * @param {string} message - Message to log
   */
  success(message) {
    console.log(chalk.green(`[SUCCESS]: ${message}`));
  }

  /**
   * Logs an error message in red
   * @param {string} message - Message to log
   */
  error(message) {
    console.error(chalk.red(`[ERROR]: ${message}`));
  }

  /**
   * Logs a warning message in yellow
   * @param {string} message - Message to log
   */
  warn(message) {
    console.warn(chalk.yellow(`[WARN]: ${message}`));
  }

  /**
   * Logs an info message in blue
   * @param {string} message - Message to log
   */
  info(message) {
    console.info(chalk.blue(`[INFO]: ${message}`));
  }

  /**
   * Logs a verbose message in gray (only shows when verbose is enabled)
   * @param {string} message - Message to log
   */
  verbose(message) {
    if (this._verbose) {
      console.log(chalk.gray(`[VERBOSE]: ${message}`));
    }
  }

  /**
   * Sets the verbose mode
   * @param {boolean} verbose - Whether to enable verbose logging
   */
  setVerbose(verbose) {
    this._verbose = verbose;
  }

  /**
   * Gets the current verbose mode
   * @returns {boolean} - Whether verbose logging is enabled
   */
  isVerbose() {
    return this._verbose;
  }
}

/**
 * Sets the global logger instance
 * @param {Logger} logger - The logger instance to set as global
 */
function setGlobalLogger(logger) {
  globalThis[LOGGER_KEY] = logger;
}

/**
 * Gets the global logger instance
 * @returns {Logger} - The global logger instance
 * @throws {Error} - If global logger is not initialized
 */
function getGlobalLogger() {
  const logger = globalThis[LOGGER_KEY];
  if (!logger) {
    const defaultLogger = new Logger({ verbose: false });
    setGlobalLogger(defaultLogger);
    return defaultLogger;
    // throw new Error(
    //   "Global logger not initialized. Call setGlobalLogger() first."
    // );
  }
  return logger;
}

export { Logger, setGlobalLogger, getGlobalLogger };
