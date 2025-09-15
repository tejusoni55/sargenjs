const express = require("express");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
<%= importMiddlewares %>

// Load environment variables dynamically based on NODE_ENV
const environmentFile = process.env.NODE_ENV
  ? ".env." + process.env.NODE_ENV
  : ".env";

require("dotenv").config({ path: environmentFile });

const app = express();
const port = process.env.PORT || 3000;

// Security middlewares
app.use(helmet());

// CORS configuration with IP and domain validation
const corsOptions = {
  origin: function (origin, callback) {
    // Get allowed origins from environment variable (JSON array or default to *)
    let allowedOrigins;
    try {
      allowedOrigins = process.env.ALLOWED_ORIGINS ? JSON.parse(process.env.ALLOWED_ORIGINS) : ['*'];
    } catch (error) {
      allowedOrigins = ['*']; // Fallback to allow all if JSON parsing fails
    }
    
    // In development, allow all origins (including no origin)
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // For production and test, require origin validation
    if (!origin) {
      return callback(new Error('Origin required for security'), false);
    }
    
    // Check if origin is allowed
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Add additional security middlewares
<%= useMiddlewares %>

// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Dynamically load all module routes
const modulesPath = path.join(__dirname, "src/modules");
fs.readdirSync(modulesPath).forEach((module) => {
  const routePath = path.join(
    modulesPath,
    module,
    "routes",
    module + "Route.js"
  );
  if (fs.existsSync(routePath)) {
    const moduleRoutes = require(routePath);
    app.use("/api/v1/" + module, moduleRoutes);
  }
});

// Base route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to your Express.js API!",
    apiVersion: "v1",
    apiEndpoint: "/api/v1",
    structure: "modular",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource does not exist",
  });
});

// Start server
app.listen(port, () => {
  console.log("Server is running on port " + port);
});
