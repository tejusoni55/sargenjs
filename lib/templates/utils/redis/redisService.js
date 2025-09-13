const Redis = require("ioredis");

// Main Redis Client
class RedisClient {
  constructor() {
    if (!RedisClient.instance) {
      this.client = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      // Handle connection errors
      this.client.on("error", (err) => {
        console.error("Redis error", err);
        if (err.code === "ECONNREFUSED") {
          console.error("Unable to connect with redis server");
        } else {
          console.error("Something went wrong with redis connection", err);
        }
      });

      // Handle connection success
      this.client.on("connect", () => {
        console.log("Redis client connected successfully");
      });

      // Handle connection end
      this.client.on("end", () => {
        console.log("Redis client connection closed");
      });

      // Handle connection closed
      this.client.on("close", () => {
        console.warn("Redis connection closed");
      });

      RedisClient.instance = this;
    }
    return RedisClient.instance;
  }

  getClient() {
    return this.client;
  }
}

// Cache Service
class RedisCache {
  constructor(client) {
    this.client = client;
  }

  async get(key) {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key, value, ttl = 3600) {
    await this.client.set(key, JSON.stringify(value), "EX", ttl);
  }

  async delete(key) {
    await this.client.del(key);
  }
}

// Rate Limiter Service
class RedisRateLimiter {
  constructor(client) {
    this.client = client;
  }

  /**
   * Rate limit middleware
   * @param {string} key - The key to rate limit
   * @param {number} limit - The limit of requests
   * @param {number} window - The window of time in seconds
   * @returns {Promise<{allowed: boolean, remaining: number, ttl: number}>}
   */
  async _rateLimit(key, limit, window) {
    const current = await this.client.incr(key);
    if (current === 1) {
      await this.client.expire(key, window);
    }

    if (current > limit) {
      return { allowed: false, remaining: 0 };
    }

    const ttl = await this.client.ttl(key);
    return { allowed: true, remaining: limit - current, ttl };
  }

  /**
   * Rate limit middleware
   * @param {number} limit - The limit of requests
   * @param {number} window - The window of time in seconds
   * @returns {Function} - The middleware function
   */
  rateLimitMiddleware = (limit, window) => {
    return async (req, res, next) => {
      const key = `rateLimit:${req.ip}`;

      const { allowed, remaining, ttl } = await this._rateLimit(
        key,
        limit,
        window
      );

      if (!allowed)
        return res.status(429).json({ message: "Too many requests" });

      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", ttl);

      next();
    };
  };
}

/**
 * Redis Services
 * @class RedisServices
 * @description Redis Services
 * @exports RedisServices
 */
module.exports = {
  createCacheService() {
    return new RedisCache(new RedisClient().getClient());
  },

  createRateLimitService() {
    return new RedisRateLimiter(new RedisClient().getClient());
  },

  createCacheMiddleware() {
    const cacheService = new RedisCache(new RedisClient().getClient());

    return async (req, res, next) => {
      try {
        const key = `cache:api:${req.method}:${req.originalUrl}`;

        const cachedData = await cacheService.get(key);
        if (cachedData) return res.status(200).json(cachedData);

        res.sendResponse = res.json;
        res.json = async (body) => {
          await cacheService.set(key, body);
          res.sendResponse(body);
        };

        next();
      } catch (error) {
        console.error("Error in redis cache middleware", error.message);
        next(error);
      }
    };
  },
};
