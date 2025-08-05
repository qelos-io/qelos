const mongoose = require('mongoose')

// define the Storage model schema
const StorageSchema = new mongoose.Schema({
  tenant: {
    type: String,
    index: true,
    required: true,
  },
  kind: {
    type: String,
    enum: ['s3', 'gcs', 'ftp', 'cloudinary'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  metadata: {
    publicUrl: {
      type: String,
      required: false
    },
    basePath: {
      type: String,
      default: '/',
      required: true
    },
    bucketName: {
      type: String,
    },
    bucketUrl: {
      type: String,
    },
    signatureVersion: {
      type: String,
    },
  },
  isDefault: { type: Boolean, default: false },
  authentication: String
})

module.exports = mongoose.model('Storage', StorageSchema)
