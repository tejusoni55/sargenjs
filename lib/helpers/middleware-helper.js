import { getGlobalLogger as logger } from "./global-logger-helper.js";
import fileHelper from "./file-helper.js";
import fs from "fs";
import path from "path";
import npmHelper from "./npm-helper.js";
import _lodash from "lodash";


const middlewareConfig = {
  /**
   * Auth middleware
   * @param {string} structure - The structure of the project
   * @returns {Object} - The middleware config
   */
  auth: ({ middlewarePath }) => {
    return {
      files: [
        {
          type: "file",
          name: `${middlewarePath}/authMiddleware.js`,
          template: "middlewares/auth/authMiddleware.js",
        },
        {
          type: "file",
          name: `${middlewarePath}/jwtService.js`,
          template: "middlewares/auth/jwtService.js",
        },
      ],
      path,
      dependencies: ["jsonwebtoken", "bcrypt"],
      infoMessages: [
        `Add keys "JWT_PASSPHRASE" (for jwt.private.key) and "JWT_EXPIRATION" in .env file before running the project`,
        `Default passphrase is "jwt_passphrase" and expiration is "24h"`,
      ],
    };
  },

  /**
   * ACL middleware
   * @param {string} structure - The structure of the project
   * @returns {Object} - The middleware config
   */
  acl: ({ middlewarePath, structure }) => {
    return {
      files: [
        {
          type: "file",
          name: `${middlewarePath}/aclMiddleware.js`,
          template: "middlewares/acl/aclMiddleware.js",
          templateData: {
            importACLJson:
              structure === "layered"
                ? "const acl = require('../config/acl.json');"
                : "const acl = require('../../config/acl.json');",
          },
        },
        {
          type: "file",
          name: "src/config/acl.json",
          template: "middlewares/acl/acl.json",
        },
      ],
    };
  },

  /**
   * Monitor middleware (Loki, Prometheus, Grafana)
   * @param {string} middlewarePath - The path of the middleware
   * @returns {Object} - The middleware config
   */
  monitor: ({ middlewarePath, projectName }) => {
    return {
      files: [
        {
          type: "dir",
          name: [`${middlewarePath}/__monitorConfig`],
        },
        {
          type: "file",
          name: `${middlewarePath}/monitorMiddleware.js`,
          template: "middlewares/monitor/monitorMiddleware.js",
          templateData: {
            projectName,
          },
        },
        {
          type: "file",
          name: `${middlewarePath}/__monitorConfig/prometheus.yml`,
          template: "middlewares/monitor/prometheus.yml",
          templateData: {
            projectName,
          },
        },
        {
          type: "file",
          name: `${middlewarePath}/__monitorConfig/docker-compose.yml`,
          template: "middlewares/monitor/docker-compose.yml",
        },
        {
          type: "file",
          name: `${middlewarePath}/__monitorConfig/loki-config.yml`,
          template: "middlewares/monitor/loki-config.yml",
        },
        {
          type: "file",
          name: `${middlewarePath}/__monitorConfig/datasources.yml`,
          template: "middlewares/monitor/datasources.yml",
        },
      ],
      dependencies: ["prom-client", "winston", "winston-loki", "response-time"],
      infoMessages: [
        `Docker Compose files created for monitoring in ${middlewarePath}/__monitorConfig/`,
        `Go to ${middlewarePath}/__monitorConfig/ directory and update "prometheus.yml" file with your Host IP and port`,
        `Run 'docker-compose up -d' to start the monitoring services`,
        "Import & attach monitorMiddleware in app.js file",
        `const { attachMonitoring, logger } = require('<path>/monitorMiddleware');
        attachMonitoring(app);`,
        `Go to http://localhost:3000 to view the grafana dashboard`,
      ],
    };
  },
};

const securityMiddlewarePackages = {
  rateLimit: "express-rate-limit",
};

/**
 * Middleware helper
 * This helper provides methods for validating middleware names
 */
const middlewareHelper = {
  /**
   * Add security middlewares
   * @param {string} projectPath - Path of the project
   * @param {string} securities - Security middlewares configuration (helmet, cors, rateLimit)
   * @returns {void}
   */
  _addSecurityMiddlewares(config, structType, securities = []) {
    try {
      let files = config?.initialDirsFiles[structType] || [];

      // Check if files are empty
      if (!_lodash.isEmpty(files)) {
        let templateData = {
          importMiddlewares: "",
          useMiddlewares: "",
        };

        // Add security middlewares
        securities.forEach((security) => {
          if (`${security}` in securityMiddlewarePackages) {
            // Add dependencies
            if (
              securityMiddlewarePackages[security] &&
              !config.dependencies.includes(
                securityMiddlewarePackages[security]
              )
            ) {
              config.dependencies.push(securityMiddlewarePackages[security]);
            }

            templateData.importMiddlewares += `const ${security} = require("${securityMiddlewarePackages[security]}");\n`;
            if (security === "rateLimit") {
              templateData.useMiddlewares += `app.use(rateLimit({windowMs: 1 * 60 * 1000, limit: 100, message: "Too many requests, please try again after a minute."}));`;
            } else {
              templateData.useMiddlewares += `app.use(${security}());\n`;
            }
          }
        });

        // Add templateData to files
        files.forEach((file) => {
          if (file.type === "file" && file.name === "app.js") {
            file.templateData = templateData;
          }
        });

        config.initialDirsFiles[structType] = files;
      }
    } catch (error) {
      logger().error(`Security middlewares addition failed, ${error.message}`);
      throw error;
    }
  },

  /**
   * Fetch middleware config
   * @param {string} middlewareName - Name of the middleware to fetch config for
   * @param {string} structure - The structure of the project
   * @returns {Object} - The middleware config
   */
  _fetchMiddlewareConfig(
    middlewareName,
    structure,
    projectName = "express-app"
  ) {
    let middlewarePath =
      structure === "layered" ? "src/middlewares" : "src/common/middlewares";

    // Validate middleware name
    if (!middlewareName) {
      throw Error("Middleware name is required");
    }

    // Check if middleware name is valid
    if (typeof middlewareConfig[middlewareName] !== "function") {
      throw Error(
        `Middleware name "${middlewareName}" is not a valid middleware`
      );
    }

    return {
      ...middlewareConfig[middlewareName]({
        middlewarePath,
        structure,
        projectName,
      }),
      path: middlewarePath,
    };
  },

  /**
   * Validate middleware name
   * @param {string} middlewareName - Name of the middleware to validate
   * @returns {void}
   */
  _generateMiddleware(middlewareName, projectPath, structure) {
    try {
      // Project name
      let projectName = path.basename(projectPath);

      // Fetch middleware config
      let middlewareMeta = this._fetchMiddlewareConfig(
        middlewareName,
        structure,
        projectName
      );

      // Check if middleware already exists and get the path
      middlewareMeta.files.map((file) => {
        if (file.type === "file") {
          if (fs.existsSync(path.join(projectPath, file.name))) {
            throw new Error(
              `Middleware ${middlewareName} already exists at ${file.name}`
            );
          }
        }
      });

      // Fetch dependencies to add along with the middleware
      const dependencies = middlewareMeta.dependencies || [];
      if (dependencies.length > 0) {
        npmHelper._addUpdateDependencies(projectPath, dependencies);
      }

      // Create middleware file from template
      fileHelper._addDirsAndFiles(projectPath, [
        {
          type: "dir",
          name: [middlewareMeta.path],
        },
        ...middlewareMeta.files,
      ]);

      logger().success(
        `Middleware "${middlewareName}.js" generated successfully at ${middlewareMeta.path}`
      );

      // Add info messages if any
      if (
        middlewareMeta.infoMessages &&
        middlewareMeta.infoMessages.length > 0
      ) {
        middlewareMeta.infoMessages.forEach((message) => {
          logger().info(message);
        });
      }
    } catch (error) {
      logger().error(`Middleware generation failed`);
      throw error;
    }
  },
};

export default middlewareHelper;
