import { Setup } from "../src/sargen.js";
import { Logger, setGlobalLogger } from "../helpers/global-logger-helper.js";

export default function setupCommand(program) {
  program
    .command("setup")
    .description("Setup sargen.json file for an existing Express.js project")
    .option("-v, --verbose", "Enable verbose logging")
    .action((options) => {
      const logger = new Logger({ verbose: options.verbose || false });
      setGlobalLogger(logger);
      
      const setup = new Setup();
      setup._setupSargen();
    });
} 