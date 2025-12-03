const multer = require('multer');
const path = require('path');
const fs = require('fs');
<% if (cloudProvider && cloudProvider === 's3') { %>
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
<% } %>
<% if (cloudProvider && cloudProvider === 'gcp') { %>
const { Storage } = require('@google-cloud/storage');
<% } %>

// File type validation
const fileTypes = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  video: ['mp4', 'avi', 'mov', 'webm'],
  document: ['pdf', 'doc', 'docx', 'csv', 'txt', 'xlsx']
};

function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function isFileTypeAllowed(filename, allowedTypes = ['image', 'video', 'document']) {
  const extension = getFileExtension(filename);
  const allExtensions = allowedTypes.flatMap(type => fileTypes[type] || []);
  return allExtensions.includes(extension);
}

/**
 * File Upload Service
 * Simple file upload service for local or cloud storage
 */
class FileUploadService {
  constructor(config = {}) {
    this.config = {
      storage: config.storage || 'local',
      uploadPath: config.uploadPath || './uploads',
      maxFileSize: config.maxFileSize || '10MB',
      allowedTypes: config.allowedTypes || ['image', 'video', 'document'],
      ...config
    };

    // Initialize cloud storage clients if needed
    <% if (cloudProvider && cloudProvider === 's3') { %>
    if (this.config.storage === 's3') {
      this.s3Client = new S3Client({
        region: config.region || process.env.AWS_REGION,
        credentials: {
          accessKeyId: config.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      this.s3Bucket = config.bucket || process.env.AWS_S3_BUCKET;
    }
    <% } %>
    <% if (cloudProvider && cloudProvider === 'gcp') { %>
    if (this.config.storage === 'gcp') {
      const storageConfig = {};
      if (config.keyFilename || process.env.GCP_KEY_FILENAME) {
        storageConfig.keyFilename = config.keyFilename || process.env.GCP_KEY_FILENAME;
      }
      if (config.projectId || process.env.GCP_PROJECT_ID) {
        storageConfig.projectId = config.projectId || process.env.GCP_PROJECT_ID;
      }
      this.gcpStorage = new Storage(storageConfig);
      this.gcpBucket = this.gcpStorage.bucket(config.bucket || process.env.GCP_BUCKET);
    }
    <% } %>

    // Configure multer
    this.multer = this._configureMulter();
  }

  /**
   * Configure multer
   */
  _configureMulter() {
    const isLocal = this.config.storage === 'local';
    const destDir = isLocal ? this.config.uploadPath : path.join(process.cwd(), 'temp');

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, destDir),
      filename: (req, file, cb) => {
        // Simple filename: timestamp-originalname.ext
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const filename = Date.now() + "-" + name + ext;
        cb(null, filename);
      }
    });

    return multer({
      storage,
      limits: { fileSize: this._parseFileSize(this.config.maxFileSize) },
      fileFilter: (req, file, cb) => {
        if (!isFileTypeAllowed(file.originalname, this.config.allowedTypes)) {
          return cb(new Error("File type not allowed. Allowed: " + this.config.allowedTypes.join(', ')));
        }
        cb(null, true);
      }
    });
  }

  /**
   * Parse file size to bytes
   */
  _parseFileSize(sizeString) {
    if (typeof sizeString === 'number') return sizeString;
    const match = sizeString.match(/^(\d+)(MB|KB|GB)$/i);
    if (!match) throw new Error('Invalid file size format. Use "10MB", "5KB", "1GB"');
    const size = parseInt(match[1]);
    const unit = match[2].toUpperCase();
    return unit === 'KB' ? size * 1024 :
           unit === 'MB' ? size * 1024 * 1024 :
           unit === 'GB' ? size * 1024 * 1024 * 1024 : size;
  }

  /**
   * Create multer middleware
   * @param {string} fieldName - Form field name (default: 'file')
   * @returns {Function} - Multer middleware
   */
  middleware(fieldName = 'file') {
    return this.multer.single(fieldName);
  }

  /**
   * Upload single file (use after multer middleware)
   * @param {Object} file - File object from multer
   * @returns {Promise<Object>} - Upload result
   */
  async upload(file) {
    if (!file) throw new Error('No file provided');

    if (this.config.storage === 'local') {
      return await this._uploadLocal(file);
    }
    <% if (cloudProvider && cloudProvider === 's3') { %>
    if (this.config.storage === 's3') {
      return await this._uploadS3(file);
    }
    <% } %>
    <% if (cloudProvider && cloudProvider === 'gcp') { %>
    if (this.config.storage === 'gcp') {
      return await this._uploadGCP(file);
    }
    <% } %>
    throw new Error("Unsupported storage: " + this.config.storage);
  }

  /**
   * Upload multiple files
   * @param {Array} files - Array of file objects
   * @returns {Promise<Array>} - Array of upload results
   */
  async uploadMultiple(files) {
    if (!files || files.length === 0) throw new Error('No files provided');
    const results = [];
    for (const file of files) {
      results.push(await this.upload(file));
    }
    return results;
  }

  /**
   * Local storage upload
   */
  async _uploadLocal(file) {
    const filename = path.basename(file.filename);
    const filepath = path.join(this.config.uploadPath, filename);
    
    // File is already in uploads directory, just rename if needed
    if (file.path !== filepath) {
      fs.renameSync(file.path, filepath);
    }

    return {
      success: true,
      filename,
      originalname: file.originalname,
      path: filepath.replace(/\\/g, '/'),
      size: file.size,
      mimetype: file.mimetype,
      url: "/uploads/" + filename
    };
  }

  <% if (cloudProvider && cloudProvider === 's3') { %>
  /**
   * S3 storage upload
   */
  async _uploadS3(file) {
    const filename = path.basename(file.filename);
    const fileContent = fs.readFileSync(file.path);

    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.s3Bucket,
      Key: filename,
      Body: fileContent,
      ContentType: file.mimetype
    }));

    // Clean up temp file
    fs.unlinkSync(file.path);

    return {
      success: true,
      filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      bucket: this.s3Bucket
    };
  }

  /**
   * Generate S3 signed URL
   */
  async getFileSignedUrl(filename, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.s3Bucket,
      Key: filename
    });
    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  <% } %>

  <% if (cloudProvider && cloudProvider === 'gcp') { %>
  /**
   * GCP storage upload
   */
  async _uploadGCP(file) {
    const filename = path.basename(file.filename);

    await this.gcpBucket.upload(file.path, {
      destination: filename,
      metadata: { contentType: file.mimetype }
    });

    // Clean up temp file
    fs.unlinkSync(file.path);

    return {
      success: true,
      filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      bucket: this.gcpBucket.name
    };
  }

  /**
   * Generate GCP signed URL
   */
  async getFileSignedUrl(filename, expiresIn = 3600) {
    const file = this.gcpBucket.file(filename);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + (expiresIn * 1000)
    });
    return url;
  }

  <% } %>

  /**
   * Delete file (works for all storage types)
   */
  async delete(filename) {
    if (this.config.storage === 'local') {
      const filepath = path.join(this.config.uploadPath, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        return { success: true };
      }
      return { success: false, error: 'File not found' };
    }
    <% if (cloudProvider && cloudProvider === 's3') { %>
    if (this.config.storage === 's3') {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.s3Bucket,
        Key: filename
      }));
      return { success: true };
    }
    <% } %>
    <% if (cloudProvider && cloudProvider === 'gcp') { %>
    if (this.config.storage === 'gcp') {
      await this.gcpBucket.file(filename).delete();
      return { success: true };
    }
    <% } %>
    throw new Error("Unsupported storage: " + this.config.storage);
  }
}

module.exports = FileUploadService;
