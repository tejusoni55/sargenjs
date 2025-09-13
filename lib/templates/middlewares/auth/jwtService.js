const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

/**
 * JWT Service
 * This service provides methods for generating key pairs, hashing passwords, signing tokens,
 * verifying tokens, decoding tokens, and authenticating users.
 */
class JwtService {
  constructor() {
    this.keysPath = path.join(process.cwd(), "src/config");
    this.privateKeyPath = path.join(this.keysPath, "jwt.private.key");
    this.publicKeyPath = path.join(this.keysPath, "jwt.public.key");

    try {
      this.privateKey = fs.readFileSync(this.privateKeyPath, "utf8");
      this.publicKey = fs.readFileSync(this.publicKeyPath, "utf8");
    } catch (error) {
      // Generate new key pair if keys don't exist
      this.generateKeyPair();
    }
  }

  /**
   * Generate new RSA key pair for JWT signing
   */
  generateKeyPair() {
    try {
      const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
          cipher: "aes-256-cbc",
          passphrase: process.env.JWT_PASSPHRASE || "jwt_passphrase",
        },
      });

      // Create keys directory if it doesn't exist
      fs.mkdirSync(this.keysPath, { recursive: true });

      // Save keys
      fs.writeFileSync(this.privateKeyPath, privateKey);
      fs.writeFileSync(this.publicKeyPath, publicKey);

      this.privateKey = privateKey;
      this.publicKey = publicKey;
    } catch (error) {
      throw new Error(`Failed to generate key pair: ${error.message}`);
    }
  }

  /**
   * Hash a password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a password with its hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Sign a JWT token
   * @param {Object} payload - Payload to sign
   * @param {Object} options - Options for the JWT token
   * @returns {string} Signed JWT token
   */
  signToken(payload, options = {}) {
    // Check if the private key exists
    if (!fs.existsSync(this.privateKeyPath)) {
      console.error(
        "Failed to sign token: Private key not found at",
        this.privateKeyPath
      );
      throw Error("Failed to sign token: Private key not found");
    }

    return jwt.sign(
      payload,
      {
        key: this.privateKey,
        passphrase: process.env.JWT_PASSPHRASE || "jwt_passphrase",
      },
      {
        algorithm: "RS256",
        expiresIn: process.env.JWT_EXPIRATION || "24h",
        ...options,
      }
    );
  }

  /**
   * Verify a JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded JWT payload
   */
  verifyToken(token) {
    try {
      if (!fs.existsSync(this.publicKeyPath)) {
        console.error(
          "Failed to verify token: Public key not found at",
          this.publicKeyPath
        );
        throw Error("Failed to verify token: Public key not found");
      }

      return jwt.verify(token, this.publicKey, { algorithms: ["RS256"] });
    } catch (err) {
      throw new Error("Invalid Token");
    }
  }

  /**
   * Decode a JWT token
   * @param {string} token - JWT token to decode
   * @returns {Object} Decoded JWT payload
   */
  decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = new JwtService();
