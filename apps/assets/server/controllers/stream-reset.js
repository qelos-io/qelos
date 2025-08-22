/**
 * Helper module to provide stream reset functionality for retrying uploads
 * This allows us to reset a stream to its beginning for retry attempts
 */

const fs = require('fs');
const { Readable } = require('stream');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const logger = require('../services/logger');

/**
 * Creates a resettable stream from a file upload
 * @param {Object} file - The file object with stream
 * @returns {Object} Enhanced file object with resetStream function
 */
async function createResettableStream(file) {
  if (!file || !file.fileStream) {
    throw new Error('Invalid file or missing fileStream');
  }

  // Create a temporary file to store the stream contents
  const tempFilePath = path.join(
    os.tmpdir(),
    `upload-${crypto.randomBytes(6).toString('hex')}-${Date.now()}.tmp`
  );

  // Create a write stream to the temp file
  const writeStream = fs.createWriteStream(tempFilePath);
  
  // Store original stream
  const originalStream = file.fileStream;
  
  // Pipe the original stream to the temp file
  return new Promise((resolve, reject) => {
    originalStream.pipe(writeStream)
      .on('error', (err) => {
        logger.error('Error creating resettable stream:', err);
        // Clean up temp file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupErr) {
          // Ignore cleanup errors
        }
        reject(err);
      })
      .on('finish', () => {
        // Replace the original stream with a function that creates a new readable stream
        const enhancedFile = {
          ...file,
          _tempFilePath: tempFilePath,
          fileStream: fs.createReadStream(tempFilePath),
          resetStream: async function() {
            // Close current stream if it exists
            if (this.fileStream && typeof this.fileStream.destroy === 'function') {
              this.fileStream.destroy();
            }
            
            // Create a new stream from the temp file
            this.fileStream = fs.createReadStream(this._tempFilePath);
            return this.fileStream;
          },
          cleanup: async function() {
            // Close stream if it exists
            if (this.fileStream && typeof this.fileStream.destroy === 'function') {
              this.fileStream.destroy();
            }
            
            // Remove temp file
            try {
              if (this._tempFilePath) {
                fs.unlinkSync(this._tempFilePath);
                this._tempFilePath = null;
              }
            } catch (err) {
              logger.warn('Error cleaning up temp file:', err);
            }
          }
        };
        
        resolve(enhancedFile);
      });
  });
}

module.exports = {
  createResettableStream
};
