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
    return new Promise((resolve) => {
      const process = exec(command, options);

      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data;
        if (options.verbose) {
          logger().verbose(data.trim());
        }
      });

      process.stderr.on("data", (data) => {
        stderr += data;
        if (options.verbose) {
          logger().verbose(data.trim());
        }
      });

      process.on("close", (code) => {
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          code: code
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
  _runCommandSync(command, options) {
    try {
      options.stdio = logger().isVerbose() ? "inherit" : "ignore";
      execSync(command, options);
    } catch (error) {
      logger().error(error.message);
      throw new Error(error);
    }
  },
};
