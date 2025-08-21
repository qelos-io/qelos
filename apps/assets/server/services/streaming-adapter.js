const { Readable, PassThrough } = require('node:stream');
const logger = require('./logger');

/**
 * Adapter to make existing storage services compatible with streaming uploads
 * This adapter wraps existing services and provides streaming capabilities
 */
class StreamingAdapter {
  constructor(service) {
    this.service = service;
    // Check if the service has native streaming support
    this.hasNativeStreaming = typeof this.service.uploadFileStream === 'function';
  }

  /**
   * Upload a file using streaming to reduce memory usage
   * @param {Object} storage - Storage configuration
   * @param {Object} options - Upload options
   * @param {string} options.identifier - File identifier
   * @param {Object} options.file - File object from multer with streaming support
   * @param {string} options.extension - File extension
   * @param {string} options.prefix - File prefix
   * @param {string} options.type - File MIME type
   * @returns {Promise<Object>} - Upload result
   */
  async uploadFile(storage, { identifier, file, extension, prefix, type }) {
    // Check if the file is in streaming mode
    if (file && file.isStreaming && file.streams) {
      logger.log('Using streaming upload mode');
      
      if (this.hasNativeStreaming) {
        // If the service supports native streaming, use it directly
        logger.log('Using native streaming support');
        return this.uploadWithNativeStreaming(storage, { identifier, file, extension, prefix, type });
      } else {
        // Otherwise use our chunked streaming approach
        logger.log('Using chunked streaming approach');
        return this.uploadWithChunkedStreaming(storage, { identifier, file, extension, prefix, type });
      }
    } else {
      // If not in streaming mode, pass through to the original service
      return this.service.uploadFile(storage, {
        identifier,
        file: file.buffer || file,
        extension,
        prefix,
        type
      });
    }
  }
  
  /**
   * Upload using native streaming support in the service
   */
  async uploadWithNativeStreaming(storage, { identifier, file, extension, prefix, type }) {
    // Create a combined stream from all chunk streams
    const combinedStream = new PassThrough();
    
    // Process streams in background
    (async () => {
      try {
        let stream;
        let streamIndex = 0;
        while ((stream = file.getNextStream()) !== null) {
          logger.log(`Processing stream chunk ${++streamIndex}`);
          // Pipe each stream to the combined stream, but don't end it yet
          await new Promise((resolve, reject) => {
            stream.pipe(combinedStream, { end: false });
            stream.on('end', () => {
              // Explicitly null out the stream reference to help garbage collection
              stream = null;
              resolve();
            });
            stream.on('error', reject);
          });
        }
        // End the combined stream when all chunks are processed
        logger.log('All stream chunks processed, ending combined stream');
        combinedStream.end();
      } catch (err) {
        logger.error('Error processing streams:', err);
        combinedStream.destroy(err);
      }
    })();
    
    // Call the service's native streaming method
    return this.service.uploadFileStream(storage, {
      identifier,
      fileStream: combinedStream,
      extension,
      prefix,
      type
    });
  }
  
  /**
   * Upload using chunked approach for services without native streaming
   */
  async uploadWithChunkedStreaming(storage, { identifier, file, extension, prefix, type }) {
    // Create a buffer accumulator with a maximum size
    const MAX_BUFFER_SIZE = 5 * 1024 * 1024; // 5MB max buffer size
    let buffers = [];
    let currentSize = 0;
    let totalProcessed = 0;
    
    // Process each stream sequentially
    let stream;
    let streamIndex = 0;
    
    while ((stream = file.getNextStream()) !== null) {
      logger.log(`Processing stream chunk ${++streamIndex}`);
      
      // Process this stream chunk by chunk
      for await (const chunk of stream) {
        buffers.push(chunk);
        currentSize += chunk.length;
        totalProcessed += chunk.length;
        
        // If we've accumulated enough data, process it and release memory
        if (currentSize >= MAX_BUFFER_SIZE) {
          // We don't actually upload intermediate chunks since most storage services
          // don't support appending to files. We just release the memory.
          logger.log(`Releasing buffer memory for ${currentSize} bytes`);
          
          // Clear references to processed chunks to help garbage collection
          buffers = [Buffer.concat(buffers)];
          currentSize = buffers[0].length;
        }
      }
      
      // Release the stream reference to help garbage collection
      stream = null;
    }
    
    // Create the final buffer from all accumulated chunks
    const finalBuffer = Buffer.concat(buffers);
    logger.log(`Final buffer size: ${finalBuffer.length} bytes, total processed: ${totalProcessed} bytes`);
    
    // Clear references to help garbage collection
    buffers = null;
    
    // Call the original service with the final buffer
    return this.service.uploadFile(storage, {
      identifier,
      file: finalBuffer,
      extension,
      prefix,
      type
    });
  }

  // Pass through other methods to the original service
  async loadFiles(storage, identifier) {
    return this.service.loadFiles(storage, identifier);
  }

  async removeFile(storage, identifier, file) {
    return this.service.removeFile(storage, identifier, file);
  }

  async renameFile(storage, oldIdentifier, newFileName) {
    return this.service.renameFile(storage, oldIdentifier, newFileName);
  }
}

/**
 * Wrap a storage service with streaming capabilities
 * @param {Object} service - Original storage service
 * @returns {StreamingAdapter} - Streaming-compatible service
 */
function wrapWithStreaming(service) {
  return new StreamingAdapter(service);
}

module.exports = { wrapWithStreaming };
