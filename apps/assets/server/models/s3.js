const { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand, Upload } = require('@aws-sdk/client-s3');
const { getSecret } = require('../services/secrets-management');
const ASSET_TYPES = require('../utils/asset-types.json');
const logger = require('../services/logger');
const { emitPlatformEvent } = require("@qelos/api-kit");

class S3 {
  constructor(storage) {
    this.storage = storage;
    this.name = storage.name;
    this.shouldUploadAsPublic = !!storage.metadata.publicUrl?.trim();
    this.ready = getSecret(storage.tenant, storage.authentication).then(
      (decrypted) => {
        const { accessKey, secretKey } = decrypted.value;

        let endpoint;
        try {
          if (storage.metadata.bucketUrl) {
            // e.g. https://fra1.digitaloceanspaces.com or fra1.digitaloceanspaces.com
            endpoint = storage.metadata.bucketUrl.includes('https://') ? storage.metadata.bucketUrl : 'https://' + storage.metadata.bucketUrl;
          }
        } catch (e) {
          logger.error('logging e', e);
        }

        // Extract region from endpoint URL for DigitalOcean Spaces if not explicitly provided
        let region = storage.metadata.region;
        if (!region && endpoint && endpoint.includes('digitaloceanspaces.com')) {
          // Extract region from URL like https://fra1.digitaloceanspaces.com
          const match = endpoint.match(/https?:\/\/([^.]+)\.digitaloceanspaces\.com/);
          if (match && match[1]) {
            region = match[1];
          }
        }
        
        // For DigitalOcean Spaces, ensure we're using the correct configuration
        const isDigitalOcean = endpoint && endpoint.includes('digitaloceanspaces.com');
        
        const clientConfig = {
          endpoint,
          region: isDigitalOcean ? region : (region || undefined),
          credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey
          },
          forcePathStyle: isDigitalOcean ? false : undefined,
        };
        
        this._client = new S3Client(clientConfig);
        this.bucket = { name: storage.metadata.bucketName.replace('s3://', '') };

      },
      () => {
        throw new Error('could not read AWS credentials');
      }
    );
  }

  async list(path) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket.name,
        Prefix: path.slice(1),
        Delimiter: "/",
      });
      
      const listedObjects = await this._client.send(command);

      const files = (listedObjects.Contents || []).map(content => ({
        ...content,
        metadata: {
          name: content.Key,
        }
      }));

      const folders = (listedObjects.CommonPrefixes || []).map(({ Prefix }) => ({
        metadata: {
          name: Prefix,
          kind: ASSET_TYPES.DIRECTORY
        }
      }));

      return [...folders, ...files];

    } catch (error) {
      logger.error('S3 list error:', error);
      throw { message: 'could not retrieve assets from storage: ' + this.name };
    }
  }

  async upload(fullPath, file) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket.name,
        Key: fullPath.slice(1),
        Body: file.buffer,
        ContentType: file.type,
        ACL: this.shouldUploadAsPublic ? 'public-read' : undefined,
        // Fix for XAmzContentSHA256Mismatch error
        ChecksumAlgorithm: 'SHA256'
      });
      
      return await this._client.send(command);

    } catch (error) {
      logger.error('S3 upload error:', error);
      emitPlatformEvent({
        tenant: this.storage.tenant,
        source: 'assets',
        kind: 'storage-connection-error',
        eventName: 's3-connection-error',
        description: `S3 connection error`,
        metadata: {
          storage: {
            _id: this.storage._id,
            kind: this.storage.kind,
            name: this.storage.name
          }
        }
      }).catch(() => null)
      throw { message: 'could not upload asset to storage: ' + this.name };
    }
  }

  async remove(file) {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucket.name,
        Prefix: file.slice(1),
        Delimiter: "/"
      });

      const listedObjects = await this._client.send(listCommand);

      if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

      // In AWS SDK v3, there's no direct deleteObjects command
      // We need to delete objects one by one
      for (const { Key } of listedObjects.Contents) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucket.name,
          Key
        });
        return await this._client.send(deleteCommand);
      }

      if (listedObjects.IsTruncated) await this.remove(file);

    } catch (error) {
      logger.error('S3 remove error:', error);
      throw { message: 'could not remove asset from storage: ' + file };
    }
  }

  async rename(oldFullPath, newFullPath) {
    try {
      // First, get the object to copy it
      const copyCommand = new PutObjectCommand({
        Bucket: this.bucket.name,
        CopySource: encodeURIComponent(`/${this.bucket.name}${oldFullPath}`),
        Key: newFullPath.slice(1),
      });

      await this._client.send(copyCommand);

      // Then remove the old object
      return await this.remove(oldFullPath);

    } catch (e) {
      logger.error('S3 rename error:', e);
      throw { message: 'could not rename asset: ' + oldFullPath };
    }
  }

  /**
   * Upload a file using streaming to reduce memory usage
   * @param {string} fullPath - Full path to upload to
   * @param {Object} file - File object with stream
   * @returns {Promise<Object>} - Upload result
   */
  async uploadStream(fullPath, file) {
    // Track upload for potential cleanup
    let uploadAborted = false;
    let uploadObj = null;
    let abortController = new AbortController();
    
    try {
      // Set smaller part size for better memory management with large files
      const partSize = 2 * 1024 * 1024; // 2MB parts (reduced from 5MB)
      
      // Add event listeners to detect connection close
      if (file.req && file.req.socket) {
        const cleanup = () => {
          if (!uploadAborted) {
            uploadAborted = true;
            if (uploadObj && typeof uploadObj.abort === 'function') {
              uploadObj.abort();
            }
            if (file.fileStream && typeof file.fileStream.destroy === 'function') {
              file.fileStream.destroy(new Error('Connection closed'));
            }
            // Force garbage collection
            if (global.gc) global.gc();
          }
        };
        
        // Listen for connection close events
        file.req.socket.on('close', cleanup);
        file.req.on('close', cleanup);
        file.req.on('end', cleanup);
        file.req.on('error', cleanup);
      }
      
      // Create upload parameters with optimized settings for large files
      const params = {
        Bucket: this.bucket.name,
        Key: fullPath.slice(1),
        Body: file.fileStream,
        ContentType: file.type,
        ACL: this.shouldUploadAsPublic ? 'public-read' : undefined,
        // Fix for XAmzContentSHA256Mismatch error
        ChecksumAlgorithm: 'SHA256',
        // Optimized settings for large files
        partSize: partSize,
        queueSize: 2, // Allow 2 concurrent parts for better throughput while controlling memory
        leavePartsOnError: false // Ensure parts are cleaned up on error
      };
      
      // Use the Upload utility with abort controller
      uploadObj = new Upload({
        client: this._client,
        params,
        abortSignal: abortController.signal
      });

      // Set up progress monitoring with more frequent garbage collection for large files
      let lastGcTime = Date.now();
      uploadObj.on('httpUploadProgress', (progress) => {
        // More aggressive garbage collection for very large files
        const now = Date.now();
        if (now - lastGcTime > 30000) { // Every 30 seconds
          if (global.gc) {
            global.gc();
            lastGcTime = now;
          }
        }
      });

      // Start the upload with timeout protection
      const uploadPromise = uploadObj.done();
      
      // Set up a timeout for very large uploads to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        // 30 minutes timeout for very large files
        const timeoutId = setTimeout(() => {
          abortController.abort();
          reject(new Error('Upload timeout exceeded'));
        }, 30 * 60 * 1000); // 30 minutes
        
        // Clear timeout if upload completes
        uploadPromise.then(() => clearTimeout(timeoutId)).catch(() => clearTimeout(timeoutId));
      });
      
      // Wait for upload to complete or timeout
      const result = await Promise.race([uploadPromise, timeoutPromise]);
      
      // Explicitly clear references to help garbage collection
      file.fileStream = null;
      uploadObj = null;
      
      return result;
    } catch (error) {
      // Ensure we clean up the stream and abort upload on error
      if (!uploadAborted) {
        uploadAborted = true;
        if (uploadObj && typeof uploadObj.abort === 'function') {
          try {
            uploadObj.abort();
          } catch (abortError) {
            // Ignore abort errors
          }
        }
      }
      
      if (file.fileStream && typeof file.fileStream.destroy === 'function') {
        file.fileStream.destroy();
      }
      file.fileStream = null;
      uploadObj = null;
      
      // Force garbage collection after error
      if (global.gc) global.gc();
      
      throw { message: 'could not upload asset stream to storage: ' + this.name, originalError: error };
    }
  }
  
  async disconnect() {
    this._client.destroy();
  }
}

module.exports = S3;
