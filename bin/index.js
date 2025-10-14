#!/usr/bin/env node
import { program } from "commander";

// Import version from package.json
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('../package.json');


// Import and load commands BEFORE parsing
import initCommand from "../lib/commands/initialize.js";
import genCommand from "../lib/commands/generate.js";
import setupCommand from "../lib/commands/setup.js";

program
  .version(`v${version}`)
  .description("A CLI tool for generating Express.js project boilerplates");

// Load Commands (no need to pass logger instance)
initCommand(program);
genCommand(program);
setupCommand(program);

// Parse the command-line arguments AFTER commands are registered
program.parseAsync(process.argv);
