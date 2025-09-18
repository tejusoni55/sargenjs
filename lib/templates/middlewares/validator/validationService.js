const Validator = require("fastest-validator");
const fs = require("fs");
const path = require("path");

class ValidationService {
  constructor() {
    this.validator = new Validator();
    this.compiledSchemas = new Map();
    this.autoRegisterDTOs();
  }

  // Auto-register DTOs from <%= dtoPath %> and src/modules/*/dto
  autoRegisterDTOs() {
    const projectRoot = process.cwd();
    const dtoPaths = [path.join(projectRoot, "<%= dtoPath %>")];

    dtoPaths.forEach((dtoPath) => {
      if (fs.existsSync(dtoPath)) {
        this.scanForDTOs(dtoPath);
      }
    });
  }

  // Scan directory for DTO files
  scanForDTOs(dirPath) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    items.forEach((item) => {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        // Check for dto subdirectory in modules
        const dtoDir = path.join(fullPath, "dto");
        if (fs.existsSync(dtoDir)) {
          this.scanForDTOs(dtoDir);
        }
      } else if (item.isFile() && item.name.endsWith(".dto.js")) {
        this.registerDTOFile(fullPath);
      }
    });
  }

  // Register schemas from DTO file
  registerDTOFile(filePath) {
    try {
      const dtoModule = require(filePath);

      Object.entries(dtoModule).forEach(([schemaName, schema]) => {
        // Check if schema name already exists
        if (this.compiledSchemas.has(schemaName)) {
          console.warn(
            "Schema name '" +
              schemaName +
              "' already exists. Please use unique schema names across all DTO files."
          );
          return;
        }

        // Register schema with just the key name (no filename prefix)
        this.registerSchema(schemaName, schema);
      });
    } catch (error) {
      console.warn("Failed to register DTO file: " + filePath, error.message);
    }
  }

  // Manual schema registration
  registerSchema(name, schema) {
    const compiled = this.validator.compile(schema);
    this.compiledSchemas.set(name, compiled);
    return compiled;
  }

  // Get compiled schema
  getSchema(name) {
    return this.compiledSchemas.get(name);
  }

  // Main validation middleware
  validate(schemaName, options = {}) {
    return (req, res, next) => {
      const schema = this.getSchema(schemaName);
      if (!schema) {
        return res.status(500).json({
          success: false,
          message: "Validation schema '" + schemaName + "' not found",
        });
      }

      const result = schema(req.body || {}, options);

      if (result === true) {
        req.validatedData = req.body;
        next();
      } else {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result,
        });
      }
    };
  }

  // Validate query parameters
  validateQuery(schemaName, options = {}) {
    return (req, res, next) => {
      const schema = this.getSchema(schemaName);
      if (!schema) {
        return res.status(500).json({
          success: false,
          message: "Validation schema '" + schemaName + "' not found",
        });
      }

      const result = schema(req.query || {}, options);

      if (result === true) {
        req.validatedQuery = req.query;
        next();
      } else {
        return res.status(400).json({
          success: false,
          message: "Query validation failed",
          errors: result,
        });
      }
    };
  }
}

valdiationService = new ValidationService();
// bind the methods to the instance (preserving "this" context)
valdiationService.validate = valdiationService.validate.bind(valdiationService);
valdiationService.validateQuery = valdiationService.validateQuery.bind(valdiationService);
module.exports = valdiationService;
