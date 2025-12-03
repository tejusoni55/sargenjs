import { Generate } from "../src/sargen.js";
import { Logger, setGlobalLogger } from "../helpers/global-logger-helper.js";

export default function genCommand(program) {
  // Setup database
  program
    .command("gen:db")
    .description(
      "Set up Sequelize ORM with MySQL2 or PostgreSQL adapter. Default: MySQL2. Future support for TypeORM will be added."
    )
    .option("--orm <name>", "ORM to use", "sequelize")
    .option("--adapter <name>", "Database adapter to use", "mysql")
    .option("--docker", "Set up database with Docker Compose configuration")
    .option("-v, --verbose", "Enable verbose logging")
    .action((options) => {
      const logger = new Logger({ verbose: options.verbose || false });
      setGlobalLogger(logger);
      
      const generator = new Generate();
      generator._setupDatabaseConfiguration(options);
    });

  // Generate module
  program
    .command("gen:module <module-name>")
    .option("--crud", "Generate module with CRUD operations")
    .option("--no-model", "Skip model generation (only create controller, route, service)")
    .option("--model-attributes <attributes>", "Define model attributes (format: name:string,email:string,phone:number)")
    .option("-v, --verbose", "Enable verbose logging")
    .description(
      "Generate a new module with controller, route, service and model"
    )
    .action((moduleName, options) => {
      const logger = new Logger({ verbose: options.verbose || false });
      setGlobalLogger(logger);
      
      const generator = new Generate();
      generator._generateModule(moduleName, options);
    });

  // Generate middleware
  program
    .command("gen:middleware <middleware-name>")
    .option("-v, --verbose", "Enable verbose logging")
    .description("Generate a new middleware")
    .action((middlewareName, options) => {
      const logger = new Logger({ verbose: options.verbose || false });
      setGlobalLogger(logger);
      
      const generator = new Generate();
      generator._generateMiddleware(middlewareName);
    });

  // Generate util
  program
    .command("gen:util <util-name>")
    .description("Generate a new util")
    .option("--docker", "Generate a new util with docker compose file")
    .option("--cloud <provider>", "Cloud provider for fileupload (aws or gcp)")
    .option("--force", "Overwrite existing fileupload service file if it exists")
    .option("-v, --verbose", "Enable verbose logging")
    .action(async (utilName, options) => {
      const logger = new Logger({ verbose: options.verbose || false });
      setGlobalLogger(logger);
      
      // Validate cloud provider if provided
      if (options.cloud && !['aws', 'gcp'].includes(options.cloud)) {
        logger.error('Invalid cloud provider. Valid values: aws, gcp');
        process.exit(1);
      }
      
      // Map 'aws' to 's3' for internal use
      const cloudProvider = options.cloud === 'aws' ? 's3' : options.cloud;
      
      const generator = new Generate();
      await generator._generateUtilService(utilName, { ...options, cloudProvider });
    });

  // Setup git repository
  program
    .command("gen:git")
    .description("Initialize git repository and setup remote (creates private repo by default)")
    .option("--remote <url>", "Remote repository URL (GitHub/GitLab/Bitbucket)")
    .option("--branch <name>", "Initial branch name", "main")
    .option("--message <msg>", "Initial commit message")
    .option("--public", "Create public repository (default: private)")
    .option("--description <desc>", "Repository description")
    .option("--no-push", "Don't push to remote repository")
    .option("-v, --verbose", "Enable verbose logging")
    .action(async (options) => {
      const logger = new Logger({ verbose: options.verbose || false });
      setGlobalLogger(logger);
      
      const generator = new Generate();
      await generator._setupGitRepository(options);
    });
}
