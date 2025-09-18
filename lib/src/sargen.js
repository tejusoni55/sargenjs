import path from "path";
import { getGlobalLogger as logger } from "../helpers/global-logger-helper.js";
import fileHelper from "../helpers/file-helper.js";
import npmHelper from "../helpers/npm-helper.js";
import templateHelper from "../helpers/template-helper.js";
import sargenHelper from "../helpers/sargen-helper.js";
import config from "../helpers/config-helper.js";
import dbHelper from "../helpers/database-helper.js";
import fs from "fs";
import moduleHelper from "../helpers/module-helper.js";
import cliHelper from "../helpers/command-helper.js";
import middlewareHelper from "../helpers/middleware-helper.js";
import utilHelper from "../helpers/util-helper.js";
import gitHelper from "../helpers/git-helper.js";

/**
 * Main builder class for creating Express.js projects
 */
class Builder {
  /**
   * Creates a new Builder instance
   * @param {string} projectName - Name of the project to create
   */
  constructor(projectName) {
    this.projectName = projectName;
    this.projectPath = path.join(process.cwd(), projectName);
  }

  /**
   * Validates if the given structure type is supported
   * @param {string} structType - Type of project structure (layered/modular)
   */
  _validateStructureType(structType) {
    const validTypes = Object.keys(config.initialDirsFiles);
    if (!validTypes.includes(structType)) {
      logger().error(
        `Invalid structure type "${structType}". Valid types are: ${validTypes.join(
          ", "
        )}`
      );
      process.exit(1);
    }
  }

  /**
   * Initializes a new Express.js project with the specified structure
   * @param {Object} options - Options for project initialization
   * @param {string} options.struct - Type of project structure to create
   * @param {boolean} options.test - Whether to add test endpoint
   * @param {string} options.security - Security middlewares configuration (helmet, cors, rateLimit)
   */
  _initializeProject(options) {
    try {
      const {
        struct: structType,
        test: addTest,
        security,
      } = options;
      // Validate structure type
      this._validateStructureType(structType);

      // Create project directory
      fileHelper._createProjectDirectory(this.projectName);

      // Add security middlewares
      middlewareHelper._addSecurityMiddlewares(config, structType, security);

      // Create project structure (including files from templates)
      fileHelper._addDirsAndFiles(
        this.projectPath,
        config.initialDirsFiles[structType]
      );

      // Initialize npm project
      npmHelper._initializeNpm(this.projectPath);

      // Install dependencies
      npmHelper._addUpdateDependencies(
        this.projectPath,
        config.dependencies,
        config.devDependencies
      );

      // Update package.json scripts
      npmHelper._updatePackageJson(this.projectPath, "scripts", config.scripts);

      // Create .env file
      if (config.envFile.default) {
        templateHelper._createEnvFile(
          this.projectPath,
          config.envFile.attributes
        );
      }

      // Create .gitignore file
      gitHelper._createGitignore(this.projectPath);

      // Create README.md file
      fileHelper._createReadmeFile(this.projectPath, {
        projectName: this.projectName,
        structure: structType,
        hasDatabase: false,
        databaseType: null, // Default to mysql if db is enabled
        hasTest: addTest,
      });

      // Add .sargen.json file
      sargenHelper._writeSargenMetadata({
        projectName: this.projectName,
        projectPath: this.projectPath,
        structure: structType,
        newApp: true,
      });

      // Add test endpoint if requested
      if (addTest) {
        templateHelper._setTemplateStructure({
          projectPath: this.projectPath,
          structure: structType,
          paths: config.sargenMetadata[structType].paths,
          templateName: "test",
          name: "test",
          controller: true,
        });
      }


      logger().success(
        `Project "${this.projectName}" initialized successfully with ${structType} structure!`
      );
      logger().info(
        `\nTo get started, Run:\n  cd ${this.projectName} && npm run dev`
      );

      if (addTest) {
        logger().info(
          `Check test API at: http://localhost:8000/api/v1/test/test-api`
        );
      }
    } catch (error) {
      logger().error(`Error initializing project: ${error.message}`);
      process.exit(1);
    }
  }
}

/**
 * Generate class to handle project structure generation
 */
class Generate {
  constructor() {
    try {
      // Validate sargen project
      let metadata = sargenHelper._isSargenProject();
      this.projectName = metadata.projectName;
      this.projectPath = metadata.projectPath;
      this.structure = metadata.structure;

      // Get ORM and adapter from metadata
      this.orm = metadata?.dbConf?.orm || "";
      this.adapter = metadata?.dbConf?.adapter || "";
    } catch (error) {
      logger().error(error.message);
      process.exit(1);
    }
  }

  /**
   * Sets up the database configuration for the project.
   *
   * @param {Object} options - Configuration for database setup
   * @param {string} [options.orm="sequelize"] - ORM to use
   * @param {string} [options.adapter="mysql"] - Database adapter to use
   */
  _setupDatabaseConfiguration(options = {}) {
    try {
      dbHelper._setupDatabase({
        ...options,
        projectPath: this.projectPath,
        structure: this.structure,
      });
    } catch (error) {
      logger().error(`Error setting up database: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Populates migration file with dynamic attributes
   * @param {string} moduleName - Name of the module
   * @param {Array} modelAttributes - Array of model attributes
   */
  _populateMigrationFile(moduleName, modelAttributes) {
    try {
      // Get migrations directory path
      const migrationsPath = this.structure === "layered" 
        ? path.join(this.projectPath, "src", "migrations")
        : path.join(this.projectPath, "src", "common", "migrations");
      
      if (!fs.existsSync(migrationsPath)) {
        logger().warn("Migrations directory not found");
        return;
      }

      // Find the latest migration file for this module
      const migrationFiles = fs.readdirSync(migrationsPath)
        .filter(file => file.includes(`create-${moduleName}`) && file.endsWith('.js'))
        .sort()
        .reverse();

      if (migrationFiles.length === 0) {
        logger().warn(`No migration file found for module ${moduleName}`);
        return;
      }

      const migrationFile = path.join(migrationsPath, migrationFiles[0]);
      logger().verbose(`Populating migration file: ${migrationFiles[0]}`);

      // Generate migration content
      const migrationContent = this._generateMigrationContent(moduleName, modelAttributes);
      
      // Write the migration file
      fs.writeFileSync(migrationFile, migrationContent);
      logger().verbose(`Migration populated with ${modelAttributes.length} attributes`);

    } catch (error) {
      logger().error(`Error populating migration: ${error.message}`);
    }
  }

  /**
   * Generates migration file content
   * @param {string} moduleName - Name of the module
   * @param {Array} modelAttributes - Array of model attributes
   * @returns {string} Migration file content
   */
  _generateMigrationContent(moduleName, modelAttributes) {
    // Generate attributes string
    const attributesString = modelAttributes.map(attr => {
      return `      ${attr.name}: {
        type: Sequelize.${attr.type},
        allowNull: true
      }`;
    }).join(',\n');

    return `'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('${moduleName}', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
${attributesString},
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('${moduleName}');
  }
};`;
  }

  /**
   * Generates a new module with controller, route, service and model
   * @param {string} moduleName - Name of the module to generate
   */
  _generateModule(moduleName, options = {}) {
    try {
      // Validate module name
      moduleHelper._validateModuleName(moduleName);

      // Parse model attributes if provided
      let modelAttributes = [];
      if (options.modelAttributes) {
        // Check if Sequelize ORM is set up
        if (this.orm !== "sequelize") {
          logger().warn("⚠️  --model-attributes option requires Sequelize ORM to be set up first.");
          logger().warn("   Run 'sargen gen:db' command to configure Sequelize ORM and database.");
          logger().warn("   Model will be generated without custom attributes.");
        } else {
          // Check if models/index.js exists for dynamic queries
          const modelsPath = this.structure === "layered" 
            ? path.join(this.projectPath, "src", "models", "index.js")
            : path.join(this.projectPath, "src", "common", "models", "index.js");
          
          if (!fs.existsSync(modelsPath)) {
            logger().warn("⚠️  Database models not found. Dynamic queries will not work.");
            logger().warn("   Run 'sargen gen:db' command to set up database models first.");
            logger().warn("   Module will be generated with placeholder CRUD methods.");
            modelAttributes = []; // Clear attributes to use placeholder methods
          } else {
            modelAttributes = moduleHelper._parseModelAttributes(options.modelAttributes);
            logger().verbose(`Parsed model attributes: ${JSON.stringify(modelAttributes)}`);
          }
        }
      }

      // Check if module already exists
      moduleHelper._validateModuleNotExists(
        this.structure,
        this.projectPath,
        moduleName,
        !options.model
      );

      // Get module configuration based on structure
      const moduleConfig = moduleHelper._getModuleConfig(
        this.structure,
        moduleName,
        this.orm,
        options.crud,
        !options.model,
        modelAttributes,
        this.projectPath
      );

      // Create directories and files using file helper
      fileHelper._addDirsAndFiles(this.projectPath, [
        ...moduleConfig.dirs,
        ...moduleConfig.files,
      ]);

      // Add module to routes index.js
      let routeIndexPath =
        this.structure === "layered"
          ? path.join(this.projectPath, "src", "routes", "index.js")
          : path.join(this.projectPath, "src", "common", "routes", "index.js");

      if (fs.existsSync(routeIndexPath)) {
        logger().verbose(`Adding ${moduleName} to routes index.js...`);

        // Fetch route file path
        let routeFilePath =
          this.structure === "layered"
            ? `../routes/${moduleName}Route.js`
            : `../modules/${moduleName}/routes/${moduleName}Route.js`;

        // Append content to route index.js
        fileHelper._appendContent(routeIndexPath, {
          content: `router.use("/${moduleName}", require("${routeFilePath}"));`,
          appendAt: "before",
          appendLine: "module.exports",
        });
      }

        // Check to add migrations for model or not
        if (["sequelize", "typeorm"].includes(this.orm) && options.model) {
        logger().verbose(`Generating migration file for ${moduleName}...`);

        // Run migration command to generate migration file
        let migrationFilePath =
          this.structure === "layered"
            ? "--migrations-path src/migrations"
            : "--migrations-path src/common/migrations";
        cliHelper._runCommandSync(
          `npx sequelize-cli migration:generate --name create-${moduleName} ${migrationFilePath}`,
          { cwd: this.projectPath }
        );

        // Populate migration with dynamic attributes if provided
        if (modelAttributes && modelAttributes.length > 0) {
          this._populateMigrationFile(moduleName, modelAttributes);
        }
      }

      logger().success(`Module '${moduleName}' generated successfully!`);
      
      // Show migration guidance if model was generated with attributes
      if (options.model && modelAttributes && modelAttributes.length > 0) {
        logger().info("📋 Next steps for database migration:");
        logger().info("   1. Go to src/ directory");
        logger().info("   2. Run: npx sequelize-cli db:migrate");
        logger().info("   This will create the table in your database with the defined attributes.");
      }
      
      // Show guidance for CRUD without model attributes
      if (options.crud && (!modelAttributes || modelAttributes.length === 0)) {
        logger().info("📋 Next steps for CRUD functionality:");
        logger().info("   1. Manually update migration files with your database schema");
        logger().info("   2. Manually update model files with your database attributes");
        logger().info("   3. Run: npx sequelize-cli db:migrate");
        logger().info("   This will enable the generated CRUD operations to work with your database.");
      }
    } catch (error) {
      logger().error(`Error generating module: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Generates a new middleware
   * @param {string} middlewareName - Name of the middleware to generate
   */
  _generateMiddleware(middlewareName) {
    try {
      // Validate middleware name
      middlewareHelper._generateMiddleware(
        middlewareName,
        this.projectPath,
        this.structure
      );
    } catch (error) {
      logger().error(`Error generating middleware: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Generates a new util service
   * @param {string} utilName - Name of the util to generate
   */
  async _generateUtilService(utilName, options = {}) {
    try {
      await utilHelper._generateUtil(
        utilName,
        this.projectPath,
        this.structure,
        options.docker
      );
    } catch (error) {
      logger().error(`Error generating util: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Sets up git repository with fault tolerance
   * @param {Object} options - Git setup options
   */
  async _setupGitRepository(options = {}) {
    try {
      await gitHelper._setupGitRepository(this.projectPath, options);
    } catch (error) {
      logger().error(`Error setting up git repository: ${error.message}`);
      process.exit(1);
    }
  }
}

/**
 * Setup class to handle sargen.json creation for existing projects
 */
class Setup {
  constructor() {
    this.projectName = path.basename(process.cwd());
    this.projectPath = process.cwd();
  }

  /**
   * Detects the project structure by analyzing directories and files
   * @returns {string} The detected structure type ('layered', 'modular', or '')
   */
  _detectProjectStructure() {
    try {
      // Check for layered structure indicators
      const layeredIndicators = {
        hasRoutesDir: fs.existsSync(
          path.join(this.projectPath, "src", "routes")
        ),
        hasControllersDir: fs.existsSync(
          path.join(this.projectPath, "src", "controllers")
        ),
        hasServicesDir: fs.existsSync(
          path.join(this.projectPath, "src", "services")
        ),
      };

      // Check for modular structure indicators
      const modularIndicators = {
        hasModulesDir: fs.existsSync(
          path.join(this.projectPath, "src", "modules")
        ),
        hasCommonDir: fs.existsSync(
          path.join(this.projectPath, "src", "common")
        ),
      };

      // Determine structure based on indicators
      if (
        layeredIndicators.hasRoutesDir &&
        layeredIndicators.hasControllersDir
      ) {
        return "layered";
      } else if (
        modularIndicators.hasModulesDir &&
        modularIndicators.hasCommonDir
      ) {
        return "modular";
      }

      // If no clear structure is detected
      return "";
    } catch (error) {
      logger().error(`Error detecting project structure: ${error.message}`);
      return "";
    }
  }

  /**
   * Validates that the current directory is a proper Express.js project
   * @throws {Error} If not a valid Express.js project directory
   */
  _validateNodeProject() {
    const packageJsonPath = path.join(this.projectPath, "package.json");
    
    if (!fs.existsSync(packageJsonPath)) {
      logger().error("No package.json found in the current directory.");
      logger().error("Please run this command from the root of your Node.js project.");
      process.exit(1);
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      
      // Check if it has basic Node.js project structure
      if (!packageJson.name) {
        logger().error("Invalid package.json: missing 'name' field.");
        logger().error("Please ensure you're in a valid Node.js project directory.");
        process.exit(1);
      }

      // Check for ESModule compatibility
      if (packageJson.type === "module") {
        logger().error("SargenJS setup is not compatible with ESModule projects.");
        logger().error("Please use a CommonJS project (without 'type: module' in package.json).");
        process.exit(1);
      }

      // Check for Express.js dependency
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (!dependencies.express) {
        logger().error("Express.js not found in dependencies.");
        logger().error("SargenJS requires an Express.js project. Please install Express.js first:");
        logger().error("  npm install express");
        process.exit(1);
      }

      // Check for other essential dependencies that SargenJS might use
      const recommendedDeps = ['dotenv', 'body-parser', 'helmet', 'cors'];
      const missingDeps = recommendedDeps.filter(dep => !dependencies[dep]);
      
      if (missingDeps.length > 0) {
        logger().warn(`Missing recommended dependencies: ${missingDeps.join(', ')}`);
        logger().warn("Consider installing them for better SargenJS compatibility:");
        logger().warn(`  npm install ${missingDeps.join(' ')}`);
      }

      // Check for basic Express.js project structure
      const hasAppFile = fs.existsSync(path.join(this.projectPath, "app.js")) || 
                        fs.existsSync(path.join(this.projectPath, "server.js")) ||
                        fs.existsSync(path.join(this.projectPath, "index.js"));
      
      if (!hasAppFile) {
        logger().warn("No main application file found (app.js, server.js, or index.js).");
        logger().warn("SargenJS works best with standard Express.js project structure.");
      }

      logger().verbose(`Validated Express.js project: ${packageJson.name}`);
      logger().verbose(`Express version: ${dependencies.express}`);
    } catch (error) {
      logger().error("Invalid package.json file.");
      logger().error("Please ensure you're in a valid Node.js project directory.");
      process.exit(1);
    }
  }

  /**
   * Sets up the sargen project by generating a new sargen.json file
   * @throws {Error} If writing the sargen.json file fails
   */
  _setupSargen() {
    try {
      // Validate that this is a proper Node.js project
      this._validateNodeProject();

      // Check if .sargen.json already exists
      const sargenPath = path.join(this.projectPath, ".sargen.json");
      if (fs.existsSync(sargenPath)) {
        logger().error("A .sargen.json file already exists in this directory.");
        process.exit(1);
      }

      // Detect project structure
      const structure = this._detectProjectStructure();
      logger().verbose(`Detected project structure: ${structure || "unknown"}`);

      // Fetch database configuration from package.json
      let dbConf = dbHelper._fetchDbConf();

      // Create .gitignore file if it doesn't exist
      const gitignorePath = path.join(this.projectPath, ".gitignore");
      if (!fs.existsSync(gitignorePath)) {
        gitHelper._createGitignore(this.projectPath);
      }

      // Write sargen metadata
      sargenHelper._writeSargenMetadata({
        projectName: this.projectName,
        projectPath: this.projectPath,
        structure: structure,
        newApp: false,
        dbConf,
      });

      logger().success(
        `Successfully created .sargen.json file at ${this.projectPath}`
      );
      logger().info("You can now use other sargen commands in this project.");
    } catch (error) {
      logger().error(`Error setting up project: ${error.message}`);
      process.exit(1);
    }
  }
}

export { Builder, Generate, Setup };
