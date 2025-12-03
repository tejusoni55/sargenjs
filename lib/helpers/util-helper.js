import { getGlobalLogger as logger } from "./global-logger-helper.js";
import fileHelper from "./file-helper.js";
import npmHelper from "./npm-helper.js";
import dockerHelper from "./docker-helper.js";
import path from "path";
import fs from "fs";


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

    if (docker) {
      infoMessages.push(
        `Docker setup created in docker/ directory`,
        `To start Redis service:`,
        `  • Start all services: docker-compose -f docker/docker-compose.yml up -d`,
        `  • Stop services: docker-compose -f docker/docker-compose.yml down`,
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

  /**
   * File upload utility configuration
   * @param {string} utilPath - The path of the util
   * @param {string} cloudProvider - Cloud provider (s3, gcp, or null for local)
   * @returns {Object} - The util config
   */
  fileupload: ({ utilPath, cloudProvider }) => {
    const files = [
      {
        type: "file",
        name: `${utilPath}/fileupload/fileUploadService.js`,
        template: "utils/fileupload/fileUploadService.js",
        templateData: {
          cloudProvider: cloudProvider || null
        }
      }
    ];

    const dependencies = ["multer"];
    const infoMessages = [
      `File upload service generated successfully!`,
      `Usage:`,
      `  • As middleware: uploadService.middleware('file')`,
      `  • As function: await uploadService.upload(req.file)`,
      `Default upload directory: ./uploads`,
      `Supported file types: images, videos, documents`,
      `Default max file size: 10MB`,
    ];

    // Add cloud-specific dependencies and messages
    if (cloudProvider === 's3') {
      dependencies.push("@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner");
      infoMessages.push(
        `AWS S3 storage configured`,
        `Add AWS credentials in .env or config:`,
        `  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET`
      );
    } else if (cloudProvider === 'gcp') {
      dependencies.push("@google-cloud/storage");
      infoMessages.push(
        `Google Cloud Storage configured`,
        `Add GCP config in .env or config:`,
        `  GCP_BUCKET, GCP_PROJECT_ID (optional), GCP_KEY_FILENAME (optional)`
      );
    } else {
      infoMessages.push(
        `Using local storage. Files will be stored in ./uploads directory`
      );
    }

    return {
      files,
      dependencies,
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
   * @param {string} cloudProvider - Cloud provider for fileupload (s3, gcp, or null)
   * @returns {Object} - The util config
   */
  _generateUtilConfig(utilName, utilPath, dockerFlag, cloudProvider = null) {
    try {
      // Check if the util name is valid
      if (!(`${utilName}` in utilConfiguration)) {
        const availableUtils = Object.keys(utilConfiguration).join(', ');
        throw new Error(`Invalid Utils Name: ${utilName}. \nAvailable utilities: ${availableUtils}`);
      }

      return utilConfiguration[utilName]({ utilPath, docker: dockerFlag, cloudProvider });
    } catch (error) {
      throw Error(error);
    }
  },


  /**
   * Generate util
   * @param {string} utilName - The name of the util
   * @param {string} projectPath - The path of the project
   * @param {string} structure - The structure of the project
   * @param {boolean} dockerFlag - The flag to add docker file
   * @param {string} cloudProvider - Cloud provider for fileupload (s3, gcp, or null)
   * @param {boolean} force - Whether to overwrite existing fileupload service file
   * @returns {Object} - The util
   */
  async _generateUtil(utilName, projectPath, structure, dockerFlag = false, cloudProvider = null, force = false) {
    try {
      const utilPath =
        structure === "layered" ? "src/utils" : "src/common/utils";

      // Check if fileupload file already exists (only for fileupload util)
      if (utilName === 'fileupload') {
        const fileUploadPath = path.join(projectPath, `${utilPath}/fileupload/fileUploadService.js`);
        if (fs.existsSync(fileUploadPath) && !force) {
          logger().error(`File upload service already exists at: ${utilPath}/fileupload/fileUploadService.js`);
          logger().error(`If you want to overwrite it, run the command with --force option.`);
          throw new Error('File upload service already exists. Use --force to overwrite.');
        }
      }

      // Generate util config
      const utilConfigMeta = this._generateUtilConfig(
        utilName,
        utilPath,
        dockerFlag,
        cloudProvider
      );

      logger().info(`Generating utils service for ${utilName}...`);

      // Check for dependencies to add along with the util
      const dependencies = utilConfigMeta.dependencies || [];
      if (dependencies.length > 0) {
        npmHelper._addUpdateDependencies(projectPath, dependencies);
      }

      // Create util files from template
      const dirsToCreate = [
        {
          type: "dir",
          name: [utilPath],
        },
      ];

      // Add subdirectory for fileupload (only fileupload directory, no nested dirs)
      if (utilName === 'fileupload') {
        dirsToCreate.push({
          type: "dir",
          name: [`${utilPath}/fileupload`],
        });
      }

      // Add force flag to file items for fileupload
      const filesToCreate = utilConfigMeta.files.map(file => {
        if (utilName === 'fileupload' && force) {
          return { ...file, force: true };
        }
        return file;
      });

      fileHelper._addDirsAndFiles(projectPath, [
        ...dirsToCreate,
        ...filesToCreate,
      ]);

      // Handle Docker setup for Redis
      if (dockerFlag && utilName === "redis") {
        const projectName = path.basename(projectPath);
        dockerHelper._addRedisService(projectPath, projectName);
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
