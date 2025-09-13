import fs from "fs";
import path from "path";
import _lodash from "lodash";
import { getGlobalLogger as logger } from "./global-logger-helper.js";
import config from "./config-helper.js";
import fsHelper from "./file-helper.js";
import chalk from "chalk";


const sargenHelper = {
  /**
   * Create a new .sargen.json configuration file for project created with sargen
   * @param {Object} projectMeta - Project metadata containing projectName, projectPath, and structure
   * @returns {void}
   */
  _writeSargenMetadata(projectMeta) {
    try {
      // Validate projectMeta
      if (
        _lodash.isEmpty(projectMeta) ||
        _lodash.isEmpty(projectMeta.projectName) ||
        _lodash.isEmpty(projectMeta.projectPath)
      ) {
        let errorMessage = `Invalid project metadata. 'projectName' and 'projectPath' are required.`;
        logger().error(errorMessage);
        throw new Error(errorMessage);
      }

      // Get structure-specific metadata from config
      const structureConfig =
        config.sargenMetadata[projectMeta.structure || "layered"];
      if (!structureConfig) {
        throw new Error(`Invalid structure type: ${projectMeta.structure}`);
      }

      // Create metadata object
      const metadata = {
        projectName: projectMeta.projectName,
        projectPath: projectMeta.projectPath,
        structure: projectMeta.structure || "layered",
        createdAt: new Date().toISOString(),
        ...config.sargenMetadata.common,
        ...structureConfig,
      };

      // Add project creation timestamp for new apps
      // if (projectMeta.newApp) {
      //   metadata.projectCreatedAt = new Date().toISOString();
      // }

      // Add ORM and adapter to metadata
      if (projectMeta.dbConf) {
        metadata.dbConf = projectMeta.dbConf;
      }

      // Set path for file
      const metadataPath = path.join(projectMeta.projectPath, ".sargen.json");

      // Check if file exists for non-new apps
      if (!projectMeta.newApp && fs.existsSync(metadataPath)) {
        let errorMsg = `Failed setup ".sargen.json": metadata file already exists at ${metadataPath}.`;
        logger().error(errorMsg);
        throw new Error(errorMsg);
      }

      logger().verbose("Adding sargen metadata file: .sargen.json...");
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      logger().success("Created .sargen.json file");
    } catch (error) {
      logger().error(`Failed creating sargen configuration file`);
      throw error;
    }
  },

  /**
   * Check if project has valid sargen.json file and return metadata
   * @param {String} keyword - Fetch specific key from json meta config file if provided
   * @returns {Object} - Returns metadata json object of configuration file
   */
  _isSargenProject(keyword = "") {
    try {
      const metadataPath = path.join(process.cwd(), ".sargen.json");

      if (!fs.existsSync(metadataPath)) {
        console.error(
          chalk.red(
            `[ERROR]: Operation aborted. This does not appear to be a valid sargen project. Unable to find '.sargen.json' file at root dir`
          )
        );
        process.exit(1);
      }

      // Check if metadata file is valid json
      let fileCheck = fsHelper._isFileValidJson(metadataPath);
      if (!fileCheck.isValidJson) {
        console.error(
          chalk.red(
            `[ERROR]: Operation aborted. Invalid '.sargen.json' file. Should be a valid json file`
          )
        );
        process.exit(1);
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
      if (
        !metadata ||
        !metadata.projectName ||
        !metadata.projectPath ||
        !metadata.structure
      ) {
        console.error(
          chalk.red(`[ERROR]: Operation aborted. Invalid '.sargen.json' file.`)
        );
        process.exit(1);
      }

      // Check if keyword exists
      if (keyword && _lodash.isEmpty(metadata[keyword])) {
        console.error(
          chalk.red(
            `[ERROR]: Operation aborted. Unable to find keyword ${keyword} in '.sargen.json' file`
          )
        );
        process.exit(1);
      }

      return keyword ? metadata[keyword] : metadata;
    } catch (error) {
      logger().error(
        `Failed reading sargen configuration file: ${error.message}`
      );
      throw error;
    }
  },

  /**
   * Fetch configuration meta for different keys
   * @param {String} keyword - Keyword to fetch metadata for
   * @param {Object} options - Additional options for fetching/validating metadata
   * @returns {Object} - Object contains metadata of keyword from .sargen.json
   */
  _fetchMetadata(keyword, options = {}) {
    try {
      let keywordMeta = this._isSargenProject(keyword);

      // Validate based on project structure
      const metadata = this._isSargenProject();
      const structure = metadata.structure;

      // Structure-specific validation
      switch (keyword) {
        case "paths":
          if (structure === "layered") {
            if (
              !keywordMeta.routes ||
              !keywordMeta.controllers ||
              !keywordMeta.services
            ) {
              throw new Error(
                "Invalid paths configuration for layered structure"
              );
            }
          } else if (structure === "modular") {
            if (
              !keywordMeta.modules ||
              !keywordMeta.common ||
              !keywordMeta.config
            ) {
              throw new Error(
                "Invalid paths configuration for modular structure"
              );
            }
          }
          break;
        // Add more keyword validations as needed
      }

      return keywordMeta;
    } catch (error) {
      logger().error(`Error fetching metadata: ${error.message}`);
      throw error;
    }
  },

  /**
   * Check if provided path is a valid directory
   *
   * @param {String} path - Path to be validated
   * @returns {Boolean} - Flag indicates directory is valid or not
   */
  _isDirectory(path) {
    try {
      const stats = fs.statSync(path);
      return stats.isDirectory();
    } catch (err) {
      return false; // Path doesn't exist or is invalid
    }
  },

  /**
   * Check if provided file path is valid file
   *
   * @param {String} filePath - file path to be validated
   * @returns {Boolean} - Flag indicates file is valid js or ts file
   */
  _isFile(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return (
        stats.isFile() && (filePath.endsWith(".js") || filePath.endsWith(".ts"))
      );
    } catch (err) {
      return false; // Path doesn't exist or is invalid
    }
  },

  /**
   * Update the .sargen.json configuration file with new or updated values
   * @param {Object} updateData - Object containing the key-value pairs to update
   * @param {Boolean} merge - If true, merge with existing values, if false, replace them
   * @returns {Object} - Returns updated metadata
   */
  _updateSargenMetadata(updateData, merge = true) {
    try {
      if (_lodash.isEmpty(updateData)) {
        throw new Error("Update data cannot be empty");
      }

      const metadataPath = path.join(process.cwd(), ".sargen.json");
      
      // Check if .sargen.json exists
      if (!fs.existsSync(metadataPath)) {
        throw new Error("Operation aborted. Unable to find '.sargen.json' file at root dir");
      }

      // Read current metadata
      let currentMetadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));

      // Update metadata
      const updatedMetadata = merge 
        ? _lodash.merge({}, currentMetadata, updateData)
        : { ...currentMetadata, ...updateData };

      // Add updatedAt timestamp
      updatedMetadata.updatedAt = new Date().toISOString();

      // Write updated metadata back to file
      fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2));
      logger().success("Updated .sargen.json file successfully");

      return updatedMetadata;
    } catch (error) {
      logger().error(`Failed updating sargen configuration file: ${error.message}`);
      throw error;
    }
  },
};

export default sargenHelper;
