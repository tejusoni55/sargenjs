const promClient = require("prom-client");
const winston = require("winston");
const LokiTransport = require("winston-loki");
const responseTime = require("response-time");

class Logger {
  constructor() {
    this.logger = winston.createLogger({
      level: "info",
      transports: [
        new LokiTransport({
          host: process.env.LOKI_URL || "http://localhost:3100",
          labels: { job: "<%= projectName %>" },
          json: true,
          format: winston.format.json(),
        }),
      ],
    });
  }
}

class MonitorMiddleware {
  /**
   * Constructor for MonitorMiddleware
   */
  constructor() {
    // Initialize Prometheus Registry
    this.register = new promClient.Registry();
    promClient.collectDefaultMetrics({ register: this.register });

    // Initialize HTTP Request Duration Metric
    this.httpRequestDuration = new promClient.Histogram({
      name: "http_request_duration_milliseconds",
      help: "Request duration in milliseconds",
      labelNames: ["method", "route", "status", "body", "params", "query"],
      buckets: [1, 10, 50, 100, 200, 500, 1000, 2000, 5000], // Milliseconds bucket values
    });
    this.register.registerMetric(this.httpRequestDuration);

    // Initialize Winston Logger
    this.logger = new Logger().logger;
  }

  /**
   * Setup Prometheus middleware
   * @param {import("express").Application} app - The express application
   */
  setupPrometheusMiddleware(app) {
    app.use(
      responseTime((req, res, time) => {
        const route = req.route?.path || req.path;
        const body = JSON.stringify(req.body || {});
        const params = JSON.stringify(req.params || {});
        const query = JSON.stringify(req.query || {});
        
        this.httpRequestDuration
          .labels(req.method, route, res.statusCode, body, params, query)
          .observe(time); // time is in milliseconds
      })
    );

    app.get("/metrics", async (req, res) => {
      res.set("Content-Type", this.register.contentType);
      res.send(await this.register.metrics());
    });
  }

  /**
   * Setup Loki middleware
   * @param {import("express").Application} app - The express application
   */
  setupLokiMiddleware(app) {
    // Request logging
    app.use((req, res, next) => {
      const start = Date.now();
      res.once("finish", () => {
        this.logger.info({
          msg: "HTTP Request",
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Date.now() - start,
        });
      });
      next();
    });

    // Error logging
    app.use((err, req, res, next) => {
      this.logger.error({
        msg: "Error",
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        error: err.stack,
      });
      next(err);
    });
  }

  /**
   * Attach the middleware to the app
   * @param {import("express").Application} app - The express application
   */
  attach(app) {
    this.setupPrometheusMiddleware(app);
    this.setupLokiMiddleware(app);
  }
}

// Export a function that creates and returns a new instance
module.exports = {
  attachMonitoring(app) {
    const monitor = new MonitorMiddleware();
    monitor.attach(app);
  },

  logger: new Logger().logger,
};
