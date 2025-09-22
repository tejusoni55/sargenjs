import { Builder } from "../src/sargen.js";
import { Logger, setGlobalLogger } from "../helpers/global-logger-helper.js";

export default function initCommand(program) {
  program
    .command("init <project-name>")
    .description("Creates a new Express.js project with the specified name")
    .option(
      "--struct <type>",
      "Project structure type (layered or modular)",
      "layered"
    )
    .option("--test", "Add test API endpoint")
    .option(
      "--security [security...]",
      "Flag to setup security configuration (.i.e rateLimit)"
    )
    .option("-v, --verbose", "Enable verbose logging")
    .action((projectName, options) => {
      const logger = new Logger({ verbose: options.verbose || false });
      setGlobalLogger(logger);

      const builder = new Builder(projectName);
      options.security = !options.security
        ? []
        : options.security === true
        ? ["rateLimit"]
        : options.security;

      builder._initializeProject(options);
    });
}
