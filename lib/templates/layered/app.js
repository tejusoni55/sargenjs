const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const routes = require("./src/routes");
<%= importMiddlewares %>

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Security middlewares
app.use(helmet());
app.use(cors());

// Add additional security middlewares
<%= useMiddlewares %>

// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API Routes
app.use("/api/v1", routes);

// Base route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to your Express.js API!",
    apiVersion: "v1",
    apiEndpoint: "/api/v1",
    structure: "layered",
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
