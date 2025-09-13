import fs from "fs";
import path from "path";
import _lodash from "lodash";
import { getGlobalLogger as logger } from "./global-logger-helper.js";
import cliHelper from "./command-helper.js";

const npmHelper = {
  /**
   * Initializes a new npm project
   * @param {string} projectPath - Path to the project directory
   */
  _initializeNpm(projectPath) {
    try {
      logger().info("Initializing npm project...");
      process.chdir(projectPath);
      cliHelper._runCommandSync("npm init -y", { cwd: projectPath });
      // logger().success("Initialized npm project");
    } catch (error) {
      logger().error(`Error initializing npm: ${error.message}`);
      process.exit(1);
    }
  },

  /**
   * Get and filter existing dependencies
   * @param {string} projectPath - Path to the project directory
   * @param {Array} dependencies - List of production dependencies
   * @param {Array} devDependencies - List of development dependencies
   * @returns {Object} - Object contains new dependencies and dev dependencies
   */
  _getAndFilterExistingDependencies(
    projectPath,
    dependencies,
    devDependencies
  ) {
    try {
      const packageJsonPath = path.join(projectPath, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const existingDependencies = packageJson.dependencies;
      const existingDevDependencies = packageJson.devDependencies;

      if (!_lodash.isEmpty(existingDependencies)) {
        dependencies = dependencies.filter((dep) => !existingDependencies[dep]);
      }

      if (!_lodash.isEmpty(existingDevDependencies)) {
        devDependencies = devDependencies.filter(
          (dep) => !existingDevDependencies[dep]
        );
      }

      return {
        dependencies,
        devDependencies,
      };
    } catch (error) {
      logger().error(
        `Error getting and filtering existing dependencies: ${error.message}`
      );
    }
  },

  /**
   * Installs project dependencies
   * @param {string} projectPath - Path to the project directory
   * @param {Array} dependencies - List of production dependencies
   * @param {Array} devDependencies - List of development dependencies
   */
  _addUpdateDependencies(projectPath, dependencies = [], devDependencies = []) {
    try {
      process.chdir(projectPath);

      const {
        dependencies: newDependencies,
        devDependencies: newDevDependencies,
      } = this._getAndFilterExistingDependencies(
        projectPath,
        dependencies,
        devDependencies
      );

      // Install dependencies
      if (newDependencies.length > 0) {
        logger().verbose(`Installing dependencies... ${newDependencies.join(", ")}`);
        cliHelper._runCommandSync(`npm install ${newDependencies.join(" ")}`, {
          cwd: projectPath,
        });
      } else {
        logger().verbose("No dependencies to install");
      }

      // Install dev dependencies
      if (newDevDependencies.length > 0) {
        logger().verbose(
          `Installing dev dependencies... ${newDevDependencies.join(", ")}`
        );
        cliHelper._runCommandSync(
          `npm install -D ${newDevDependencies.join(" ")}`,
          { cwd: projectPath }
        );
      } else {
        logger().verbose("No dev dependencies to install");
      }
    } catch (error) {
      logger().error(`Error installing dependencies: ${error.message}`);
      process.exit(1);
    }
  },

  /**
   * Updates package.json with new configuration
   * @param {string} projectPath - Path to the project directory
   * @param {string} key - Key to update in package.json
   * @param {Object} value - Value to set for the key
   */
  _updatePackageJson(projectPath, key, value) {
    try {
      const packageJsonPath = path.join(projectPath, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      packageJson[key] = value;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      logger().success(`Updated package.json ${key}`);
    } catch (error) {
      logger().error(`Error updating package.json: ${error.message}`);
      process.exit(1);
    }
  },
};

export default npmHelper;
