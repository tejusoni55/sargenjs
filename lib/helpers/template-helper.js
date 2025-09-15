import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import _lodash from 'lodash';
import fileHelper from './file-helper.js';
import { getGlobalLogger as logger } from './global-logger-helper.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template cache to avoid recompiling the same templates
const templateCache = new Map();

const templateHelper = {
  /**
   * Gets the full path to a template file
   * @param {string} templateName - Name/path of the template
   * @returns {string} Full path to the template file
   */
  _getTemplatePath: (templateName) => {
    // Handle both structure-specific and common templates
    const templatePath = path.join(__dirname, '..', 'templates', templateName);
    if (fs.existsSync(templatePath)) {
      return templatePath;
    }
    
    logger().error(`Template ${templateName} not found`);
    process.exit(1);
  },

  /**
   * Validates a name based on the following criteria:
   * - Maximum length of 20 characters
   * - Can be in camelCase or lowercase format
   * - Must not contain special characters except dash (-) and underscore (_)
   * @param {string} name - The name to validate
   * @returns {boolean} Whether the name is valid
   */
  _validateName: (name) => {
    const maxLength = 20;
    const nameRegex = /^[a-z][a-zA-Z0-9_-]*$/;
    return name.length <= maxLength && nameRegex.test(name);
  },

  /**
   * Renders a template with the given data
   * @param {string} content - Template content
   * @param {Object} data - Data to render template with
   * @returns {string} Rendered template
   */
  _renderTemplate: (content, data = {}) => {
    try {
      // Check if template is already compiled and cached
      let template = templateCache.get(content);
      
      if (!template) {
        // Compile template and cache it
        template = _lodash.template(content);
        templateCache.set(content, template);
        logger().verbose('Template compiled and cached');
      }
      
      return template(data);
    } catch (error) {
      logger().error(`Failed rendering template: ${error.message}`);
      throw error;
    }
  },

  /**
   * Clears the template cache (useful for testing or memory management)
   * @returns {void}
   */
  _clearTemplateCache: () => {
    templateCache.clear();
    logger().verbose('Template cache cleared');
  },

  /**
   * Gets the current cache size (useful for monitoring)
   * @returns {number} Number of cached templates
   */
  _getCacheSize: () => {
    return templateCache.size;
  },

  /**
   * Creates environment files with the given attributes
   * @param {string} projectPath - Path to the project
   * @param {Object} attributes - Environment variables
   */
  _createEnvFile: (projectPath, attributes) => {
    try {
      // Create multiple environment files
      const envFiles = [
        { name: '.env', nodeEnv: 'development' },
        { name: '.env.test', nodeEnv: 'test' },
        { name: '.env.production', nodeEnv: 'production' }
      ];

      envFiles.forEach(envFile => {
        let envContent = '';
        for (const [key, value] of Object.entries(attributes)) {
          if (key.toUpperCase() === 'NODE_ENV') {
            envContent += `${key.toUpperCase()}=${envFile.nodeEnv}\n`;
          } else {
            envContent += `${key.toUpperCase()}=${value}\n`;
          }
        }
        
        // Add ALLOWED_ORIGINS based on environment
        if (envFile.nodeEnv === 'development') {
          envContent += 'ALLOWED_ORIGINS=["*"]\n';
        } else if (envFile.nodeEnv === 'test') {
          envContent += 'ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:3001"]\n';
        } else if (envFile.nodeEnv === 'production') {
          envContent += 'ALLOWED_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]\n';
        }
        
        fs.writeFileSync(path.join(projectPath, envFile.name), envContent);
      });

      logger().success('Created multiple environment files (.env, .env.test, .env.production)');
    } catch (error) {
      logger().error(`Error creating environment files: ${error.message}`);
      throw error;
    }
  },

  /**
   * Sets up template structure based on template metadata
   * @param {Object} template - Template metadata
   * @param {string} template.projectPath - Path to the project
   * @param {string} template.structure - Project structure (layered/modular)
   * @param {Object} template.paths - Project paths configuration
   * @param {string} template.templateName - Type of template (test, crud, etc.)
   * @param {string} template.name - Name of the component
   * @param {boolean} template.controller - Whether to create a controller
   */
  _setTemplateStructure: (template) => {
    try {
      // Validate project path
      if (!template.projectPath) {
        throw new Error('Project path is required');
      }

      // Handle different template types
      switch (template.templateName) {
        case 'test':
          const files = [];
          const isModular = template.structure === 'modular';
          const basePath = isModular ? `src/modules/test` : 'src';
          
          // Create module directories for modular structure
          if (isModular) {
            ['controllers', 'routes', 'services', 'models', 'dto'].forEach(dir => {
              files.push({
                type: 'dir',
                name: [path.join(basePath, dir)]
              });
            });
          }

          // Add controller file
          files.push({
            type: 'file',
            name: path.join(basePath, 'controllers/testController.js'),
            template: 'test/testController.js'
          });

          // Add route file
          const controllerImport = '../controllers/testController';
          files.push({
            type: 'file',
            name: path.join(basePath, 'routes/testRoute.js'),
            template: 'test/testRoute.js',
            templateData: {
              controllerPath: controllerImport
            }
          });

          // Create files and directories
          fileHelper._addDirsAndFiles(template.projectPath, files);

          // Update route index using _updateContentToFiles
          const testRouteImport = isModular
            ? '../modules/test/routes/testRoute'
            : './testRoute';
          
          fileHelper._updateContentToFiles([{
            path: path.join(template.projectPath, 'src/routes/index.js'),
            content: `router.use('/test', require('${testRouteImport}'));`,
            appendAt: 'before',
            appendLine: 'module.exports = router;'
          }]);

          logger().info('Added test endpoint at /api/v1/test/test-api');
          break;

        // Add more template types here (crud, middleware, etc.)
        default:
          throw new Error(`Unknown template type: ${template.templateName}`);
      }
    } catch (error) {
      logger().error(`Error setting up template structure: ${error.message}`);
      throw error;
    }
  }
};

export default templateHelper; 