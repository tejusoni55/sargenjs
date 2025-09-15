import { getGlobalLogger as logger } from "./global-logger-helper.js";
import { execSync, exec } from "child_process";

export default {
  /**
   * Execute command asynchronously
   * @param {String} command
   * @param {Object} options
   * @returns {Promise<Object>} Object with success, stdout, stderr, code
   */
  _runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      // Add memory protection options
      const processOptions = {
        timeout: 40000, // 40 second timeout
        maxBuffer: 2 * 1024 * 1024, // 2MB buffer limit
        ...options,
      };

      const process = exec(command, processOptions);

      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data;
        logger().verbose(data.trim());
      });

      process.stderr.on("data", (data) => {
        stderr += data;
        logger().verbose(data.trim());
      });

      process.on("close", (code) => {
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          code: code,
        });
      });

      process.on("error", (error) => {
        reject({
          success: false,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          error: error.message,
        });
      });
    });
  },

  /**
   * Execute command synchronously
   * @param {String} command
   * @param {Object} options
   * @returns {void}
   */
  _runCommandSync(command, options = {}) {
    try {
      // Add memory protection options
      const processOptions = {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024, // 1MB buffer limit
        stdio: logger().isVerbose() ? "inherit" : "ignore",
        ...options,
      };

      execSync(command, processOptions);
    } catch (error) {
      logger().error(error.message);
      throw new Error(error);
    }
  },
};
