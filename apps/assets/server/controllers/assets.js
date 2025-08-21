const ftpService = require('../services/ftp');
const gcsService = require('../services/gcs');
const s3Service = require('../services/s3');
const cloudinaryService = require('../services/cloudinary');
const { wrapWithStreaming } = require('../services/streaming-adapter');
const { emitPlatformEvent } = require("@qelos/api-kit");
const logger = require('../services/logger');

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

function uploadStorageAssets(req, res) {
  const file = req.files[0].buffer;
  const type = req.files[0].mimetype;
  const { identifier, extension, prefix } = req.query || {};
  const tenant = req.headers.tenant;
  const service = getService(req.storage);
  const storage = req.storage;
  let uploadAborted = false;

  if (!service) {
    return res.end();
  }
  
  // Handle connection termination events
  const handleConnectionTermination = () => {
    uploadAborted = true;
    logger.warn(`Upload connection terminated for ${identifier}`);
    
    // Clean up any resources that might be in memory
    if (file && file.streams) {
      logger.info('Cleaning up file streams due to connection termination');
      file.streams.forEach(stream => {
        if (stream && typeof stream.destroy === 'function') {
          stream.destroy();
        }
      });
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      logger.info('Garbage collection triggered after connection termination');
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

  service.uploadFile(req.storage, { identifier, file, extension, prefix, type })
    .then((result) => {
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
      // Don't try to send a response if the connection was aborted
      if (uploadAborted) {
        logger.error(`Upload error after connection terminated: ${error.message}`);
        return;
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
