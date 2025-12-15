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
  imageOptimization: {
    type: {
      enabled: {
        type: Boolean,
        default: true,
      },
      quality: {
        type: Number,
        default: 85,
        min: 0,
        max: 100,
      },
      formats: {
        type: [String],
        default: ['jpeg', 'jpg', 'png', 'webp', 'gif']
      },
    },
    default: {
      enabled: true,
      quality: 100,
      formats: ['jpeg', 'jpg', 'png', 'webp', 'gif']
    },
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
