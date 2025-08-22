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
  const fileData = req.files[0];
  const type = fileData.mimetype;
  const { identifier, extension, prefix } = req.query || {};
  const tenant = req.headers.tenant;
  const service = getService(req.storage);
  const storage = req.storage;

  if (!service) {
    return res.end();
  }

  service.uploadFile(req.storage, { identifier, file: fileData.buffer, extension, prefix, type })
    .then((result) => {
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
