import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getGlobalLogger as logger } from "./global-logger-helper.js";
import _lodash from "lodash";
import templateHelper from "./template-helper.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileHelper = {
  /**
   * Creates a comprehensive README.md file for the project
   * @param {string} projectPath - Path to the project directory
   * @param {Object} options - Project options and metadata
   * @param {string} [options.projectName] - Name of the project
   * @param {string} [options.structure] - Project structure type (layered/modular)
   * @param {boolean} [options.hasDatabase=false] - Whether database is configured
   * @param {string} [options.databaseType] - Type of database (mysql/postgres)
   * @param {string} [options.repositoryUrl] - Repository URL for cloning instructions
   * @param {boolean} [options.hasTest=false] - Whether test endpoints are included
   */
  _createReadmeFile: (projectPath, options = {}) => {
    try {
      const {
        projectName,
        structure,
        hasDatabase = false,
        databaseType = null,
        repositoryUrl = null,
        hasTest = false
      } = options;

      // Generate dynamic content based on project configuration
      const templateData = {
        projectName: projectName || path.basename(projectPath),
        structure: structure || 'layered',
        databaseSetup: hasDatabase ? _getDatabaseSetup(databaseType) : '',
        databaseConfig: hasDatabase ? _getDatabaseConfig(databaseType) : ''
      };

      // Read and process the README template
      const templatePath = path.join(__dirname, "../templates/README.md");
      const template = fs.readFileSync(templatePath, "utf8");
      const compiledTemplate = _lodash.template(template);
      const readmeContent = compiledTemplate(templateData);

      // Write README.md to project directory
      const readmePath = path.join(projectPath, "README.md");
      fs.writeFileSync(readmePath, readmeContent, "utf8");
      
      logger().success("README.md created successfully");
    } catch (error) {
      logger().warn(`Could not create README.md: ${error.message}`);
    }
  },

  /**
   * Creates the main project directory
   * @param {string} projectName - Name of the project directory to create
   */
  _createProjectDirectory: (projectName) => {
    try {
      if (fs.existsSync(projectName)) {
        logger().error(`Directory "${projectName}" already exists.`);
        process.exit(1);
      }
      fs.mkdirSync(projectName);
      logger().success(`Created directory: ${projectName}`);
    } catch (error) {
      logger().error(`Error creating project directory: ${error.message}`);
      process.exit(1);
    }
  },

  /**
   * Creates project directories and files based on structure configuration
   * @param {string} projectPath - Path where project should be created
   * @param {Array} structure - Array of directory and file configurations
   */
  _addDirsAndFiles: (projectPath, structure) => {
    try {
      // Create directories
      structure.forEach((item) => {
        if (item.type === "dir") {
          item.name.forEach((dir) => {
            const dirPath = path.join(projectPath, dir);
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
              logger().success(`Created directory: ${dir}`);
            }
          });
        }
      });

      // Create files from templates
      structure.forEach((item) => {
        if (item.type === "file") {
          const filePath = path.join(projectPath, item.name);
          if (!fs.existsSync(filePath)) {
            let content = item.content || "";

            if (_lodash.isEmpty(content) && item.template) {
              // If template is specified, copy from template
              const templatePath = path.join(
                __dirname,
                "..",
                "templates",
                item.template
              );
              if (fs.existsSync(templatePath)) {
                content = fs.readFileSync(templatePath, "utf8");

                // Process template with data if provided
                if (item.templateData) {
                  content = templateHelper._renderTemplate(
                    content,
                    item.templateData
                  );
                }

                fs.writeFileSync(filePath, content, { recursive: true });
                logger().success(`Created file from template: ${item.name}`);
              } else {
                logger().error(`Template not found: ${item.template}`);
                process.exit(1);
              }
            } else {
              // If no template or direct content provided, create empty file
              fs.writeFileSync(filePath, content);
              logger().success(`Created file: ${item.name}`);
            }
          }
        }
      });
    } catch (error) {
      logger().error(`Error creating project structure: ${error.message}`);
      process.exit(1);
    }
  },

  /**
   * Writes content to a file
   * @param {string} filePath - Path where file should be written
   * @param {string} content - Content to write to file
   */
  _writeFile: (filePath, content) => {
    try {
      fs.writeFileSync(filePath, content);
      logger().success(`Created file: ${path.basename(filePath)}`);
    } catch (error) {
      logger().error(`Error writing file ${filePath}: ${error.message}`);
      process.exit(1);
    }
  },

  /**
   * Checks if a file is valid JSON
   * @param {string} filePath - Path to the JSON file
   * @returns {Object} Object with isValidJson boolean and error message if invalid
   */
  _isFileValidJson: (filePath) => {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      JSON.parse(content);
      return { isValidJson: true };
    } catch (error) {
      return { isValidJson: false, error: error.message };
    }
  },

  /**
   * Update existing files with provided content
   * @param {Array} files - Array of objects which contains file details to be updated
   * @return {void}
   */
  _updateContentToFiles(files) {
    let i = 0;
    while (i < files.length) {
      let fileMeta = files[i];
      // Check if file exist
      if (fs.existsSync(fileMeta.path) && fileMeta.content) {
        // Check for content replacement
        if (!_lodash.isEmpty(fileMeta.contentReplace)) {
          // Replace the content
          fileMeta.content = templateHelper._renderTemplate(
            fileMeta.content,
            fileMeta.contentReplace
          );
        }

        this._appendContent(fileMeta.path, {
          content: fileMeta.content,
          appendAt: fileMeta.appendAt || "last",
          appendLine: fileMeta.appendLine || "",
        });
      }
      i++;
    }
  },

  /**
   * Appends content to a file at a specified position.
   * @param {string} filePath - The path to the file where content will be appended.
   * @param {Object} options - Options for appending content.
   * @param {string} options.content - The content to append to the file.
   * @param {string} [options.appendAt] - Position to append content:
   * "after" to append after a specific line, "before" to append before a specific line, or "last" to append at the end of the file.
   * @param {string} [options.appendLine] - The line to match for appending before or after.
   * @returns {void}
   */
  _appendContent(filePath, options) {
    try {
      // Check if file exist and content is not empty
      if (fs.existsSync(filePath) && !_lodash.isEmpty(options.content)) {
        // Read the file content
        const fileContent = fs.readFileSync(filePath, "utf8");

        if (options.appendAt === "before") {
          // Append before
          // Find the position of the append line
          const appendIndex = fileContent.lastIndexOf(options.appendLine);

          if (appendIndex === -1) {
            logger().error(
              `Failed append: "${options.appendLine}" line not found in the file at ${filePath}.`
            );
            return;
          }

          // Split the file content into two parts
          const beforeContent = fileContent.slice(0, appendIndex);
          const afterContent = fileContent.slice(appendIndex);

          // Add the new content with a line break
          const updatedContent = `${beforeContent}\n${options.content}\n${afterContent}`;

          // Write the updated content back to the file
          fs.writeFileSync(filePath, updatedContent, "utf8");
        } else if (options.appendAt === "after") {
          // Append after
          const lines = fileContent.split("\n");
          let found = false;

          const modifiedLines = lines.reduce((acc, line) => {
            acc.push(line);
            if (line.trim().startsWith(options.appendLine)) {
              found = true;
              acc.push(options.content);
            }
            return acc;
          }, []);

          if (!found) {
            logger().error(
              `No line starting with "${options.appendLine}" found.`
            );
            return;
          }

          fs.writeFileSync(filePath, modifiedLines.join("\n"), "utf-8");
        } else {
          // Append content at last in file
          fs.appendFileSync(filePath, options.content);
        }
        logger().success(`Content appended successfully at ${filePath}`);
      } else {
        logger().error(`File not found at ${filePath} or content is empty`);
        throw new Error(`File not found at ${filePath} or content is empty`);
      }
    } catch (error) {
      logger().error(`Failed appending content: ${error.message}`);
      throw error;
    }
  },
};

// Helper functions for README generation


/**
 * Generates database setup instructions for README
 * @param {string} databaseType - Type of database (mysql/postgres)
 * @returns {string} Formatted setup instructions with code blocks
 */
function _getDatabaseSetup(databaseType) {
  const setups = {
    mysql: `
3. Set up MySQL database:
\`\`\`bash
mysql -u root -p -e "CREATE DATABASE your_database_name;"
\`\`\``,
    postgres: `
3. Set up PostgreSQL database:
\`\`\`bash
createdb your_database_name
\`\`\``
  };
  return setups[databaseType] || '';
}


/**
 * Generates database configuration documentation for README
 * @param {string} databaseType - Type of database (mysql/postgres)
 * @returns {string} Formatted database configuration examples
 */
function _getDatabaseConfig(databaseType) {
  const configs = {
    mysql: `
## Database Configuration

Configure your database settings in \\\`.env\\\`:
\\\`\\\`\\\`env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
\\\`\\\`\\\``,
    postgres: `
## Database Configuration

Configure your database settings in \\\`.env\\\`:
\\\`\\\`\\\`env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
\\\`\\\`\\\``
  };
  return configs[databaseType] || '';
}



export default fileHelper;
