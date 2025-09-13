import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper to load JSON config files in ES modules
 * Uses Node's createRequire to handle JSON imports
 */
const require = createRequire(import.meta.url);
const config = require('../config/config.json');

export default config; 