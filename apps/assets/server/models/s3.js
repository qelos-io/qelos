const { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand, Upload } = require('@aws-sdk/client-s3');
const { getSecret } = require('../services/secrets-management');
const ASSET_TYPES = require('../utils/asset-types.json');
const logger = require('../services/logger');
const { emitPlatformEvent } = require("@qelos/api-kit");
const { createResettableStream } = require('../controllers/stream-reset');

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
          // Add configuration to help with XAmzContentSHA256Mismatch errors
          computeChecksums: true,
          checksumAlgorithm: 'SHA256',
          // Increase timeouts for large file uploads
          requestHandler: {
            connectionTimeout: 60000, // 60 seconds
            socketTimeout: 300000 // 5 minutes
          }
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
    let abortController = null;
    let retryCount = 0;
    const maxRetries = 2; // Maximum number of retries for checksum errors
    
    try {
      // Set up cleanup function for connection termination
      const setupCleanup = () => {
        if (file.req && file.req.socket) {
          const cleanup = () => {
            if (!uploadAborted) {
              uploadAborted = true;
              logger.log('Connection terminated during upload, cleaning up resources');
              
              if (uploadObj && typeof uploadObj.abort === 'function') {
                try {
                  uploadObj.abort();
                } catch (abortError) {
                  // Ignore abort errors
                }
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
          
          return () => {
            // Remove event listeners
            file.req.socket.removeListener('close', cleanup);
            file.req.removeListener('close', cleanup);
            file.req.removeListener('end', cleanup);
            file.req.removeListener('error', cleanup);
          };
        }
        return () => {}; // No-op if no req/socket
      };
      
      // Retry loop for handling checksum errors
      while (retryCount <= maxRetries) {
        // Create a new abort controller for each attempt
        abortController = new AbortController();
        
        try {
          // Set up cleanup handlers for this attempt
          const removeListeners = setupCleanup();
          
          // Set smaller part size for better memory management with large files
          const partSize = 2 * 1024 * 1024; // 2MB parts
          
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
            queueSize: 1, // Reduce to 1 for more reliable uploads
            leavePartsOnError: false, // Clean up parts on error
            maxAttempts: 3 // Retry failed parts up to 3 times
          };
          
          // Use the Upload utility with abort controller
          uploadObj = new Upload({
            client: this._client,
            params,
            abortSignal: abortController.signal
          });

          // Set up progress monitoring with garbage collection
          let lastGcTime = Date.now();
          uploadObj.on('httpUploadProgress', (progress) => {
            // Periodic garbage collection for large files
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
          
          // Set up a timeout for very large uploads
          const timeoutPromise = new Promise((_, reject) => {
            const timeoutId = setTimeout(() => {
              abortController.abort();
              reject(new Error('Upload timeout exceeded'));
            }, 30 * 60 * 1000); // 30 minutes
            
            // Clear timeout if upload completes
            uploadPromise.then(() => clearTimeout(timeoutId)).catch(() => clearTimeout(timeoutId));
          });
          
          // Wait for upload to complete or timeout
          const result = await Promise.race([uploadPromise, timeoutPromise]);
          
          // Clean up event listeners
          removeListeners();
          
          // Explicitly clear references to help garbage collection
          file.fileStream = null;
          uploadObj = null;
          
          return result;
          
        } catch (error) {
          // Clean up the current attempt
          if (uploadObj && typeof uploadObj.abort === 'function') {
            try {
              uploadObj.abort();
            } catch (abortError) {
              // Ignore abort errors
            }
          }
          
          // Check if we should retry based on error type
          if (error.Code === 'XAmzContentSHA256Mismatch' && retryCount < maxRetries) {
            retryCount++;
            logger.log(`S3 upload failed with checksum mismatch. Retrying (${retryCount}/${maxRetries})...`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            
            // Reset file stream if possible
            if (file.resetStream && typeof file.resetStream === 'function') {
              await file.resetStream();
            } else {
              // If we can't reset the stream, we can't retry
              throw error;
            }
            
            continue; // Try again
          }
          
          // If we get here, either it's not a retryable error or we've exhausted retries
          throw error;
        }
      }
      
    } catch (error) {
      // Final error handling
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
      
      // Clear references
      file.fileStream = null;
      uploadObj = null;
      
      // Force garbage collection
      if (global.gc) global.gc();
      
      // Log detailed error information
      logger.error('S3 upload error:', error);
      
      // Throw standardized error
      throw { 
        message: 'could not upload asset stream to storage: ' + this.name, 
        originalError: error,
        code: error.Code || error.code
      };
    }
  }
  
  async disconnect() {
    this._client.destroy();
  }
}

module.exports = S3;
