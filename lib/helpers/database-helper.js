import { getGlobalLogger as logger } from "../helpers/global-logger-helper.js";
import npmHelper from "../helpers/npm-helper.js";
import path from "path";
import sargenHelper from "../helpers/sargen-helper.js";
import cliHelper from "../helpers/command-helper.js";
import chalk from "chalk";
import fs from "fs";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration object for supported ORMs and their adapters
 */
const DB_CONFIG = {
  sequelize: {
    adapters: {
      mysql: {
        dependencies: ["sequelize", "mysql2"],
        devDependencies: ["sequelize-cli"],
        initCommandOptions: {
          layered: "npx sequelize-cli init",
          modular:
            "npx sequelize-cli init --models-path common/models --migrations-path common/migrations --seeders-path common/seeders",
        },
      },
      postgres: {
        dependencies: ["sequelize", "pg", "pg-hstore"],
        devDependencies: ["sequelize-cli"],
        initCommandOptions: {
          layered: "npx sequelize-cli init",
          modular:
            "npx sequelize-cli init --models-path common/models --migrations-path common/migrations --seeders-path common/seeders",
        },
      },
    },
  },
  // Add more ORMs here
  // typeorm: {
  //   adapters: {
  //     mysql: {
  //       dependencies: ["typeorm", "mysql2"],
  //       devDependencies: ["@types/node", "typescript", "ts-node"],
  //       initCommand: "typeorm init"
  //     }
  //   }
  // }
};

export default {
  /**
   * Validates if the specified ORM is supported
   * @param {string} orm - The ORM to validate
   * @throws {Error} If ORM is not supported
   */
  _validateOrm(orm) {
    if (!DB_CONFIG[orm]) {
      throw new Error(`Unsupported ORM: ${orm}`);
    }
  },

  /**
   * Validates if the specified adapter is supported for the ORM
   * @param {string} orm - The ORM to check
   * @param {string} adapter - The adapter to validate
   * @throws {Error} If adapter is not supported for the ORM
   */
  _validateAdapter(orm, adapter) {
    if (!DB_CONFIG[orm].adapters[adapter]) {
      throw new Error(`Unsupported adapter '${adapter}' for ORM '${orm}'`);
    }
  },

  /**
   * Gets the dependencies required for the specified ORM and adapter
   * @param {string} orm - The ORM to get dependencies for
   * @param {string} adapter - The adapter to get dependencies for
   * @returns {Object} Object containing dependencies and devDependencies arrays
   */
  _getDependencies(orm, adapter) {
    const config = DB_CONFIG[orm].adapters[adapter];
    return {
      dependencies: config.dependencies,
      devDependencies: config.devDependencies,
    };
  },

  /**
   * Gets the initialization command for the specified ORM and adapter
   * @param {string} orm - The ORM to get init command for
   * @param {string} adapter - The adapter to get init command for
   * @returns {string} The initialization command
   */
  _getInitCommand(orm, adapter, structure = "layered") {
    return DB_CONFIG[orm].adapters[adapter].initCommandOptions[structure];
  },

  /**
   * Checks if config.json already exists in the project's src/config directory
   * @param {string} projectPath - Path to the project directory
   * @returns {boolean} True if config.json exists, false otherwise
   */
  _checkConfigExists(projectPath) {
    const configPath = path.join(projectPath, "src", "config", "config.json");
    return fs.existsSync(configPath);
  },

  /**
   * Sets up the database ORM for the project using specified ORM and adapter.
   *
   * @param {Object} options - Configuration for database setup
   * @param {string} [options.orm="sequelize"] - ORM to use
   * @param {string} [options.adapter="mysql"] - Database adapter to use
   * @throws {Error} If dependency installation or ORM setup fails.
   */
  _setupDatabase(options = {}) {
    try {
      logger().info("Setting up database...");

      // Check for orm and adapter
      const orm = options.orm || "sequelize";
      const adapter = options.adapter || "mysql";

      // Check for project path
      if (!options.projectPath) {
        throw new Error("Project path is required to setup database");
      }

      // Check if config.json already exists in src/config
      if (this._checkConfigExists(options.projectPath)) {
        logger().error("Database configuration already exists:");
        logger().error("- Found existing config.json in src/config directory");
        process.exit(1);
      }

      // Validate ORM and adapter
      this._validateOrm(orm);
      this._validateAdapter(orm, adapter);

      // Get dependencies for the selected ORM and adapter
      const { dependencies, devDependencies } = this._getDependencies(
        orm,
        adapter
      );

      // Install dependencies
      npmHelper._addUpdateDependencies(
        options.projectPath,
        dependencies,
        devDependencies
      );

      // Create Sequelize configuration file
      // Check for src directory
      let srcDir = path.join(options.projectPath, "src");
      if (!sargenHelper._isDirectory(srcDir)) {
        srcDir = options.projectPath;
      }

      // Run and setup ORM using command helper
      const initCommand = this._getInitCommand(
        orm,
        adapter,
        options.structure || "layered"
      );
      cliHelper._runCommandSync(initCommand, { cwd: srcDir });

      // Create custom config.json with correct dialect
      this._createCustomConfig(srcDir, adapter);

      // Update sargen metadata
      sargenHelper._updateSargenMetadata({
        dbConf: {
          orm,
          adapter,
        },
      });

      logger().success(`Database setup completed successfully at ${srcDir}:`);
      logger().success(`- ORM: ${orm}`);
      logger().success(`- Adapter: ${adapter}`);
    } catch (error) {
      logger().error(`Error setting up database: ${error}`);
      process.exit(1);
    }
  },

  /**
   * Creates a custom config.json with the correct dialect based on the adapter
   * @param {string} srcDir - Source directory path
   * @param {string} adapter - Database adapter (mysql or postgres)
   */
  _createCustomConfig(srcDir, adapter) {
    try {
      const configPath = path.join(srcDir, "config", "config.json");
      
      // Determine dialect and port based on adapter
      const dialect = adapter === "postgres" ? "postgres" : "mysql";
      const port = adapter === "postgres" ? 5432 : 3306;
      
      // Read the template
      const templatePath = path.join(__dirname, "../templates/database/config.json");
      const template = fs.readFileSync(templatePath, "utf8");
      
      // Render template with dialect and port
      let renderedConfig = template.replace(/<%= dialect %>/g, dialect);
      renderedConfig = renderedConfig.replace(/<%= port %>/g, port);
      
      // Write the custom config
      fs.writeFileSync(configPath, renderedConfig);
      
      logger().verbose(`Created custom config.json with ${dialect} dialect and port ${port}`);
    } catch (error) {
      logger().warn(`Could not create custom config.json: ${error.message}`);
    }
  },

  /**
   * Fetches the database configuration based on the installed dependencies
   * @returns {Object} Database configuration object
   */
  _fetchDbConf() {
    try {
      let dbConf = {};
      // Check if sequelize or typeorm is installed as dependencies
      const packageJsonPath = path.join(process.cwd(), "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      if (packageJson.dependencies["sequelize"]) {
        dbConf.orm = "sequelize";
        if (packageJson.dependencies["mysql2"]) {
          dbConf.adapter = "mysql";
        } else if (packageJson.dependencies["pg"]) {
          dbConf.adapter = "postgres";
        }
      } else if (packageJson.dependencies["typeorm"]) {
        dbConf.orm = "typeorm";
        if (packageJson.dependencies["mysql2"]) {
          dbConf.adapter = "mysql";
        } else if (packageJson.dependencies["pg"]) {
          dbConf.adapter = "postgres";
        }
      }

      return dbConf;
    } catch (error) {
      logger().warn(`Not able to fetch database configuration: ${error.message}`);
      logger().warn(
        `You can manually add the database configuration keys to the .sargen.json file at last.
        Example:
          "dbConf": {
            "orm": "sequelize",
            "adapter": "mysql" // or "postgres"
          }`
      );
      return {};
    }
  },
};
