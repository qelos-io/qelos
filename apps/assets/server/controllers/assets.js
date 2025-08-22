const ftpService = require('../services/ftp');
const gcsService = require('../services/gcs');
const s3Service = require('../services/s3');
const cloudinaryService = require('../services/cloudinary');
const { wrapWithStreaming } = require('../services/streaming-adapter');
const { emitPlatformEvent } = require("@qelos/api-kit");
const logger = require('../services/logger');
const { createResettableStream } = require('./stream-reset');

// Wrap all services with streaming adapter
const wrappedServices = {
  gcs: wrapWithStreaming(gcsService),
  ftp: wrapWithStreaming(ftpService),
  s3: wrapWithStreaming(s3Service),
  cloudinary: wrapWithStreaming(cloudinaryService)
};

const getService = ({ kind }) => wrappedServices[kind] || null;

function getStorageAssets(req, res) {
  const identifier = req.query.identifier;
  const service = getService(req.storage);

  if (!service) {
    return res.end();
  }
  service.loadFiles(req.storage, identifier)
    .then(list => res.json(list).end())
    .catch(() => {
      res.status(500).json({ message: 'could not get assets' }).end();
    });
}

async function uploadStorageAssets(req, res) {
  const fileData = req.files[0];
  const type = fileData.mimetype;
  const { identifier, extension, prefix } = req.query || {};
  const tenant = req.headers.tenant;
  const service = getService(req.storage);
  const storage = req.storage;
  let uploadAborted = false;
  let enhancedFile = null;

  if (!service) {
    return res.end();
  }
  
  // Check if this is a streaming upload (has fileStream) or buffer upload
  const isStreamingUpload = fileData.fileStream !== undefined;
  
  // For streaming uploads, create a resettable stream to support retries
  if (isStreamingUpload && storage.kind === 's3') {
    try {
      // Create a resettable stream that can be reset on retry attempts
      enhancedFile = await createResettableStream({
        fileStream: fileData.fileStream,
        type,
        req
      });
      
      // Replace the original file data with our enhanced version
      fileData.fileStream = enhancedFile.fileStream;
      fileData.resetStream = enhancedFile.resetStream;
      fileData.cleanup = enhancedFile.cleanup;
      
      logger.info('Created resettable stream for S3 upload to handle potential retries');
    } catch (err) {
      logger.error('Failed to create resettable stream:', err);
      // Continue with original stream if resettable stream creation fails
    }
  }
  
  // Handle connection termination events
  const handleConnectionTermination = () => {
    uploadAborted = true;
    
    // Clean up any resources that might be in memory
    if (fileData) {
      // Clean up resettable stream if it exists
      if (fileData.cleanup && typeof fileData.cleanup === 'function') {
        fileData.cleanup();
      }
      
      // Clean up fileStream if it exists
      if (fileData.fileStream && typeof fileData.fileStream.destroy === 'function') {
        fileData.fileStream.destroy();
      }
      
      // Clean up any other streams
      if (fileData.streams) {
        fileData.streams.forEach(stream => {
          if (stream && typeof stream.destroy === 'function') {
            stream.destroy();
          }
        });
      }
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  };
  
  // Listen for connection close events
  req.on('close', handleConnectionTermination);
  req.on('end', () => req.removeListener('close', handleConnectionTermination));
  req.on('error', handleConnectionTermination);
  
  if (req.socket) {
    req.socket.on('close', handleConnectionTermination);
    req.socket.on('error', handleConnectionTermination);
  }

  // Prepare the file object for the service call
  const fileForUpload = isStreamingUpload ? fileData : fileData.buffer;
  
  service.uploadFile(req.storage, { identifier, file: fileForUpload, extension, prefix, type })
    .then((result) => {
      // Clean up resettable stream if it exists
      if (enhancedFile && enhancedFile.cleanup) {
        enhancedFile.cleanup().catch(err => {
          logger.warn('Error cleaning up temporary file:', err);
        });
      }
      
      // Don't try to send a response if the connection was aborted
      if (uploadAborted) {
        logger.info('Upload completed but connection was already closed');
        return;
      }
      
      res.status(200).json(result).end();
      emitPlatformEvent({
        tenant,
        user: req.user._id,
        source: 'assets',
        kind: 'asset-operation',
        eventName: 'asset-uploaded',
        description: `asset updated: ${identifier}`,
        metadata: {
          identifier,
          extension,
          prefix,
          type,
          ...result,
          storage: {
            _id: storage._id,
            kind: storage.kind,
            name: storage.name
          }
        }
      }).catch(() => logger.error('could not emit platform event'))
    })
    .catch((error) => {
      // Clean up resettable stream if it exists
      if (enhancedFile && enhancedFile.cleanup) {
        enhancedFile.cleanup().catch(err => {
          logger.warn('Error cleaning up temporary file after error:', err);
        });
      }
      
      // Don't try to send a response if the connection was aborted
      if (uploadAborted) {
        logger.error(`Upload error after connection terminated: ${error.message}`);
        return;
      }
      
      // Log detailed error information for S3 uploads with SHA256 issues
      if (storage.kind === 's3' && error.code === 'XAmzContentSHA256Mismatch') {
        logger.error('S3 SHA256 mismatch error details:', {
          errorCode: error.code,
          errorMessage: error.message,
          storageType: storage.kind,
          isDigitalOcean: storage.metadata?.bucketUrl?.includes('digitaloceanspaces.com') || false
        });
      }
      
      res.status(500).json({ message: error.message || 'could not upload asset' }).end();
    })
    .finally(() => {
      // Clean up event listeners
      req.removeListener('close', handleConnectionTermination);
      req.removeListener('error', handleConnectionTermination);
      
      if (req.socket) {
        req.socket.removeListener('close', handleConnectionTermination);
        req.socket.removeListener('error', handleConnectionTermination);
      }
    });
}

function removeStorageAsset(req, res) {
  const identifier = req.query.identifier;
  const service = getService(req.storage);

  if (!service) {
    return res.end();
  }
  service.removeFile(req.storage, identifier, req.body.file)
    .then(() => res.end())
    .catch(() => res.status(500).json({ message: 'could not remove asset' }).end());
}

function renameStorageAssets(req, res) {
  const identifier = req.query.identifier;
  const newFilename = req.body.newFilename;
  const service = getService(req.storage);

  if (!service) {
    return res.end();
  }

  service.renameFile(req.storage, identifier, newFilename)
    .then(() => res.end())
    .catch(() => res.status(500).json({ message: 'could not rename asset' }).end());
}

function verifyIdentifier(req, res, next) {
  if (!req.query.identifier) {
    return res
      .status(500)
      .json({ message: 'Must supply asset identifier' })
      .end();
  }
  next();
}

module.exports = { getService, getStorageAssets, removeStorageAsset, verifyIdentifier, uploadStorageAssets, renameStorageAssets };
