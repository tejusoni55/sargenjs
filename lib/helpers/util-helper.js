import { getGlobalLogger as logger } from "./global-logger-helper.js";
import fileHelper from "./file-helper.js";
import npmHelper from "./npm-helper.js";
import commandHelper from "./command-helper.js";
import path from "path";


const utilConfiguration = {
  /**
   * Redis utility configuration
   * @param {string} utilPath - The path of the util
   * @param {boolean} docker - The flag to add docker configuration
   * @returns {Object} - The util config
   */
  redis: ({ utilPath, docker }) => {
    const files = [
      {
        type: "file",
        name: `${utilPath}/redis.js`,
        template: "utils/redis/redisService.js",
      },
    ];

    const infoMessages = [
      `Add keys "REDIS_HOST" and "REDIS_PORT" in .env file before running the project`,
      `Default host is "localhost" and port is "6379"`,
    ];

    // Add Docker configuration if docker flag is true
    if (docker) {
      files.push(
        {
          type: "dir",
          name: [`${utilPath}/__redisConfig`],
        },
        {
          type: "file",
          name: `${utilPath}/__redisConfig/docker-compose.yml`,
          template: "utils/redis/docker-compose.yml",
        }
      );

      infoMessages.push(
        `Docker Compose file created for Redis in ${utilPath}/__redisConfig/`,
        `Go to ${utilPath}/__redisConfig/ directory and run 'docker-compose up -d' to start Redis container`,
        `Redis will be available at localhost:6379`
      );
    } else {
      infoMessages.push(`Start your redis server before running the project`);
    }

    return {
      files,
      dependencies: ["ioredis"],
      infoMessages,
    };
  },

  /**
   * SMTP email utility configuration
   * @param {string} utilPath - The path of the util
   * @returns {Object} - The util config
   */
  smtp: ({ utilPath }) => {
    const files = [
      {
        type: "file",
        name: `${utilPath}/emailService.js`,
        template: "utils/smtp/emailService.js",
      },
    ];

    const infoMessages = [
      `Add email configuration in .env file before running the project`,
      `Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS`,
      `Optional: SMTP_SECURE (true/false), SMTP_FROM_NAME`,
    ];

    return {
      files,
      dependencies: ["nodemailer"],
      infoMessages,
    };
  },

  /**
   * Push notification utility configuration
   * @param {string} utilPath - The path of the util
   * @returns {Object} - The util config
   */
  notification: ({ utilPath }) => {
    const files = [
      {
        type: "file",
        name: `${utilPath}/notificationService.js`,
        template: "utils/notification/notificationService.js",
      },
    ];

    const infoMessages = [
      `Add Firebase configuration in .env file before running the project`,
      `Required: FIREBASE_SERVICE_ACCOUNT_PATH (path to your Firebase service account JSON file)`,
      `Optional: FIREBASE_DATABASE_URL`,
      `To configure Firebase service account:`,
      `1. Go to Firebase Console (https://console.firebase.google.com)`,
      `2. Select your project > Project Settings > Service Accounts`,
      `3. Click "Generate New Private Key" to download the JSON file`,
      `4. Place the JSON file in your project directory`,
      `5. Set FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/your-service-account.json in .env`,
    ];

    return {
      files,
      dependencies: ["firebase-admin"],
      infoMessages,
    };
  },
};

const utilHelper = {
  /**
   * Generate util configuration
   * @param {string} utilName - The name of the util
   * @param {string} utilPath - The path of the util
   * @param {boolean} dockerFlag - The flag to add docker file
   * @returns {Object} - The util config
   */
  _generateUtilConfig(utilName, utilPath, dockerFlag) {
    try {
      // Check if the util name is valid
      if (!(`${utilName}` in utilConfiguration)) {
        const availableUtils = Object.keys(utilConfiguration).join(', ');
        throw new Error(`Invalid Utils Name: ${utilName}. \nAvailable utilities: ${availableUtils}`);
      }

      return utilConfiguration[utilName]({ utilPath, docker: dockerFlag });
    } catch (error) {
      throw Error(error);
    }
  },

  /**
   * Check if Docker CLI is available
   * @returns {Promise<boolean>} - Whether Docker CLI is available
   */
  async _checkDockerCLI() {
    try {
      const result = await commandHelper._runCommand("docker --version");
      return result.success;
    } catch (error) {
      return false;
    }
  },

  /**
   * Execute Docker Compose command
   * @param {string} composePath - Path to docker-compose.yml file
   * @returns {Promise<boolean>} - Whether Docker Compose executed successfully
   */
  async _executeDockerCompose(composePath) {
    try {
      logger().verbose("Starting Redis container with Docker Compose...");
      const result = await commandHelper._runCommand("docker-compose up -d", {
        cwd: composePath,
      });
      
      if (result.success) {
        logger().success("Redis container started successfully!");
        return true;
      } else {
        logger().warn(`Docker Compose failed: ${result.stderr}`);
        return false;
      }
    } catch (error) {
      logger().warn(`Failed to execute Docker Compose: ${error.message}`);
      return false;
    }
  },

  /**
   * Generate util
   * @param {string} utilName - The name of the util
   * @param {string} projectPath - The path of the project
   * @param {string} structure - The structure of the project
   * @param {boolean} dockerFlag - The flag to add docker file
   * @returns {Object} - The util
   */
  async _generateUtil(utilName, projectPath, structure, dockerFlag = false) {
    try {
      const utilPath =
        structure === "layered" ? "src/utils" : "src/common/utils";

      // Generate util config
      const utilConfigMeta = this._generateUtilConfig(
        utilName,
        utilPath,
        dockerFlag
      );

      logger().verbose(`Generating utils service for ${utilName}...`);

      // Check for dependencies to add along with the util
      const dependencies = utilConfigMeta.dependencies || [];
      if (dependencies.length > 0) {
        npmHelper._addUpdateDependencies(projectPath, dependencies);
      }

      // Create util files from template
      fileHelper._addDirsAndFiles(projectPath, [
        {
          type: "dir",
          name: [utilPath],
        },
        ...utilConfigMeta.files,
      ]);

      // Handle Docker execution if docker flag is true
      if (dockerFlag && utilName === "redis") {
        const dockerComposePath = path.join(projectPath, utilPath, "__redisConfig");
        
        // Check if Docker CLI is available
        const dockerAvailable = await this._checkDockerCLI();
        
        if (dockerAvailable) {
          // Execute Docker Compose
          const dockerSuccess = await this._executeDockerCompose(dockerComposePath);
          
          if (!dockerSuccess) {
            logger().info("Docker Compose execution failed. You can manually run:");
            logger().info(`cd ${utilPath}/__redisConfig && docker-compose up -d`);
          }
        } else {
          logger().info("Docker CLI not found. Please install Docker and run:");
          logger().info(`cd ${utilPath}/__redisConfig && docker-compose up -d`);
        }
      }

      logger().success(`Util '${utilName}' generated successfully!`);

      // Add info messages if any
      if (utilConfigMeta.infoMessages && utilConfigMeta.infoMessages.length > 0) {
        utilConfigMeta.infoMessages.forEach((message) => {
          logger().info(message);
        });
      }
    } catch (error) {
      throw error;
    }
  },
};

export default utilHelper;
