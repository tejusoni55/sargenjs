const jwtService = require("./jwtService.js");

/**
 * Auth Middleware
 * This middleware provides JWT authentication and authorization functionality
 * It includes methods for generating key pairs, hashing passwords, signing tokens,
 * verifying tokens, decoding tokens, and authenticating users.
 */
class AuthMiddleware {
  constructor() {
    // AuthMiddleware constructor
  }

  /**
   * Authenticate a user by verifying the JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   * @returns {Promise<void>}
   */
  authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwtService.verifyToken(token);
      req.user = decoded; // Attach user data to the request object
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired JWT token." });
    }
  }

  /**
   * Authenticate a user by verifying the JWT token and checking if the user has the required role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   * @returns {Promise<void>}
   */
  authenticateRole(roles = []) {
    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ error: "Access denied. No token provided." });
      }

      const token = authHeader.split(" ")[1];

      try {
        const decoded = jwtService.verifyToken(token);
        req.user = decoded; // Attach user data to the request object

        if (!roles.length || roles.includes(req.user.role)) {
          return next();
        }

        return res
          .status(403)
          .json({ error: "Forbidden: Insufficient permissions." });
      } catch (err) {
        return res.status(401).json({ error: "Invalid or expired JWT token." });
      }
    };
  }
}

module.exports = new AuthMiddleware();
