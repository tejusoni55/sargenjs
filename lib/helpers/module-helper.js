import { getGlobalLogger as logger } from "./global-logger-helper.js";
import path from "path";
import fs from "fs";
import templateHelper from "./template-helper.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const moduleHelper = {
  /**
   * Data type mapping from user-friendly names to Sequelize DataTypes
   */
  _dataTypeMapping: {
    string: 'STRING',
    number: 'BIGINT',
    integer: 'INTEGER',
    bool: 'BOOLEAN',
    boolean: 'BOOLEAN',
    float: 'FLOAT',
    date: 'DATE'
  },

  /**
   * Parses and validates model attributes string
   * @param {string} attributesString - Attributes string (e.g., "name:string,email:string")
   * @returns {Array} Array of attribute objects with name and type
   */
  _parseModelAttributes(attributesString) {
    if (!attributesString || attributesString.trim() === '') {
      return [];
    }

    // Validate input size to prevent memory issues
    const MAX_ATTRIBUTES = 30;
    const MAX_INPUT_LENGTH = 2000; // 2KB limit for input string
    
    if (attributesString.length > MAX_INPUT_LENGTH) {
      throw new Error(`Input too large. Maximum ${MAX_INPUT_LENGTH} characters allowed.`);
    }

    const attributes = [];
    const attributePairs = attributesString.split(',');

    // Check attribute count limit
    if (attributePairs.length > MAX_ATTRIBUTES) {
      throw new Error(`Too many attributes. Maximum ${MAX_ATTRIBUTES} attributes allowed.`);
    }

    for (const pair of attributePairs) {
      const trimmedPair = pair.trim();
      if (!trimmedPair) continue;

      const [columnName, dataType] = trimmedPair.split(':');
      
      if (!columnName || !dataType) {
        throw new Error(`Invalid attribute format: "${trimmedPair}". Expected format: "columnName:dataType"`);
      }

      const trimmedColumnName = columnName.trim();
      const trimmedDataType = dataType.trim().toLowerCase();

      if (!this._dataTypeMapping[trimmedDataType]) {
        const supportedTypes = Object.keys(this._dataTypeMapping).join(', ');
        throw new Error(`Unsupported data type: "${trimmedDataType}". Supported types: ${supportedTypes}`);
      }

      // Validate column name format
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedColumnName)) {
        throw new Error(`Invalid column name: "${trimmedColumnName}". Use only letters, numbers, and underscores.`);
      }

      attributes.push({
        name: trimmedColumnName,
        type: this._dataTypeMapping[trimmedDataType]
      });
    }

    return attributes;
  },

  /**
   * Validates module name
   * @param {string} moduleName - Name to validate
   * @returns {boolean} - True if valid, throws error if invalid
   */
  _validateModuleName(moduleName) {
    if (moduleName.length > 20) {
      let errorMsg = `Module name must be less than 20 characters`;
      logger().error(errorMsg);
      throw new Error(errorMsg);
    }

    // Validate module name format: lowercase, '_', or camelCase
    const validFormat = /^[a-z][a-zA-Z_]*$/;
    if (!validFormat.test(moduleName)) {
      let errorMsg = `Invalid module name format: ${moduleName}, use only lowercase letters, camelCase, or '_'`;
      logger().error(errorMsg);
      throw new Error(errorMsg);
    }

    return true;
  },

  /**
   * Checks if module structure already exists
   * @param {string} structure - Project structure type ('layered' or 'modular')
   * @param {string} basePath - Project base path
   * @param {string} moduleName - Name of the module
   * @param {boolean} skipModel - Whether to skip model validation
   * @throws {Error} If module structure already exists
   */
  _validateModuleNotExists(structure, basePath, moduleName, skipModel = false) {
    const moduleNameCapitalized =
      moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

    if (structure === "modular") {
      const modulePath = path.join(basePath, "src", "modules", moduleName);
      if (fs.existsSync(modulePath)) {
        throw new Error(
          `Operation aborted, Module '${moduleName}' already exists in modular structure at ${modulePath}`
        );
      }
    } else {
      // For layered structure, check if any of the module files exist
      const fileTypes = ["controller", "route", "service"];
      
      // Add model to check only if --no-model flag is not used
      if (!skipModel) {
        fileTypes.push("model");
      }
      
      const files = fileTypes.map((type) =>
        path.join(
          basePath,
          "src",
          `${type}s`,
          `${moduleNameCapitalized}${
            type.charAt(0).toUpperCase() + type.slice(1)
          }.js`
        )
      );

      const existingFiles = files.filter((file) => fs.existsSync(file));
      if (existingFiles.length > 0) {
        throw new Error(
          `Operation aborted, Module files already exist:\n${existingFiles.join(
            "\n"
          )}`
        );
      }
    }
  },

  /**
   * Fetches module template based on module name and ORM
   * @param {string} typeName - Name of the file type (controller, route, service, model)
   * @param {string} orm - ORM to use ('sequelize' or 'typeorm')
   * @returns {string} - Template path
   */
  _fetchModuleTemplate(typeName, orm) {
    // If model, fetch model template based on ORM
    if (typeName === "model") {
      // Check if ORM is Sequelize
      if (orm === "sequelize") {
        return `module/models/sequelize.model.js`;
      } else if (orm === "typeorm") {
        return `module/models/typeorm.model.js`;
      } else {
        return `module/model.js`;
      }
    }

    return `module/${typeName}.js`;
  },

  /**
   * Gets module file configurations based on structure type
   * @param {string} structure - Project structure type ('layered' or 'modular')
   * @param {string} moduleName - Name of the module
   * @param {string} orm - ORM to use
   * @param {boolean} crud - Whether to include CRUD operations
   * @param {boolean} skipModel - Whether to skip model generation
   * @param {Array} modelAttributes - Array of model attributes
   * @returns {Array} Array of file and directory configurations
   */
  _getModuleConfig(structure, moduleName, orm, crud, skipModel = false, modelAttributes = []) {
    const moduleFiles = ["controller", "route", "service"];
    
    // Add model only if --no-model flag is not used
    if (!skipModel) {
      moduleFiles.push("model");
    }

    const basePath = "src";

    // Check if crud is true
    let crudData = {
      crudRoutes: "",
      crudMethods: "",
      crudServices: "",
    };
    if (crud) {
      crudData = this._fetchCrudData(moduleName, modelAttributes);
    }

    if (structure === "modular") {
      return {
        dirs: [
          {
            type: "dir",
            name: [
              `${basePath}/modules/${moduleName}`,
              `${basePath}/modules/${moduleName}/controllers`,
              `${basePath}/modules/${moduleName}/routes`,
              `${basePath}/modules/${moduleName}/services`,
              `${basePath}/modules/${moduleName}/models`,
              `${basePath}/modules/${moduleName}/dto`,
            ],
          },
        ],
        files: moduleFiles.map((type) => ({
          type: "file",
          name: `${basePath}/modules/${moduleName}/${type}s/${moduleName}${
            type.charAt(0).toUpperCase() + type.slice(1)
          }.js`,
          template: this._fetchModuleTemplate(type, orm),
          templateData: {
            moduleName:
              moduleName.charAt(0).toUpperCase() + moduleName.slice(1),
            controllerImport: `const ${moduleName}Controller = require("../controllers/${moduleName}Controller.js");`,
            serviceImport: `const ${moduleName}Service = require("../services/${moduleName}Service.js");`,
            modelImport: `const db = require("../../../common/models/index.js");`,
            crudRoutes: crudData.crudRoutes,
            crudMethods: crudData.crudMethods,
            crudServices: crudData.crudServices,
            modelAttributes: modelAttributes,
          },
        })),
      };
    }

    // For layered structure
    return {
      dirs: [
        {
          type: "dir",
          name: [
            `${basePath}/controllers`,
            `${basePath}/routes`,
            `${basePath}/services`,
            `${basePath}/models`,
          ],
        },
      ],
      files: moduleFiles.map((type) => ({
        type: "file",
        name: `${basePath}/${type}s/${moduleName}${
          type.charAt(0).toUpperCase() + type.slice(1)
        }.js`,
        template: this._fetchModuleTemplate(type, orm),
        templateData: {
          moduleName,
          controllerImport: `const ${moduleName}Controller = require("../controllers/${moduleName}Controller.js");`,
          serviceImport: `const ${moduleName}Service = require("../services/${moduleName}Service.js");`,
          modelImport: `const db = require("../models/index.js");`,
          crudRoutes: crudData.crudRoutes,
          crudMethods: crudData.crudMethods,
          crudServices: crudData.crudServices,
          modelAttributes: modelAttributes,
        },
      })),
    };
  },

  /**
   * Fetches crud data
   * @returns {Object} - Crud data
   */
  _fetchCrudData(moduleName, modelAttributes = []) {
    let crudData = {
      crudMethods: "",
      crudServices: "",
      crudRoutes: "",
    };

    // Fetch crud methods
    let crudMethodsPath = path.join(
      __dirname,
      "../templates",
      "module",
      "cruds",
      "crud.methods.js"
    );
    if (fs.existsSync(crudMethodsPath)) {
      const crudMethods = fs.readFileSync(crudMethodsPath, "utf8");
      crudData.crudMethods = templateHelper._renderTemplate(crudMethods, {
        moduleName,
        modelAttributes,
      });
    }

    // Fetch crud routes
    let crudRoutesPath = path.join(
      __dirname,
      "../templates",
      "module",
      "cruds",
      "crud.routes.js"
    );
    if (fs.existsSync(crudRoutesPath)) {
      const crudRoutes = fs.readFileSync(crudRoutesPath, "utf8");
      crudData.crudRoutes = templateHelper._renderTemplate(crudRoutes, {
        moduleName,
        modelAttributes,
      });
    }

    // Fetch crud services
    let crudServicesPath = path.join(
      __dirname,
      "../templates",
      "module",
      "cruds",
      "crud.services.js"
    );
    if (fs.existsSync(crudServicesPath)) {
      const crudServices = fs.readFileSync(crudServicesPath, "utf8");
      crudData.crudServices = templateHelper._renderTemplate(crudServices, {
        moduleName,
        modelAttributes,
      });
    }

    return crudData;
  },
};

export default moduleHelper;
