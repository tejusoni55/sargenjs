#!/usr/bin/env node
import { program } from "commander";
import {
  setGlobalLogger,
  Logger,
} from "../lib/helpers/global-logger-helper.js";

// Import and load commands BEFORE parsing
import initCommand from "../lib/commands/initialize.js";
import genCommand from "../lib/commands/generate.js";
import setupCommand from "../lib/commands/setup.js";

program
  .version("1.0.0")
  .description("A CLI tool for generating Express.js project boilerplates");

// Load Commands (no need to pass logger instance)
initCommand(program);
genCommand(program);
setupCommand(program);

// Parse the command-line arguments AFTER commands are registered
program.parseAsync(process.argv);
