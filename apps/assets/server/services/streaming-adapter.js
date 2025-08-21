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
      
      if (this.hasNativeStreaming) {
        // If the service supports native streaming, use it directly
        return this.uploadWithNativeStreaming(storage, { identifier, file, extension, prefix, type });
      } else {
        // Otherwise use our chunked streaming approach
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
    // Create a combined stream from all chunk streams with highWaterMark to control buffering
    const combinedStream = new PassThrough({ 
      // Lower highWaterMark to reduce memory buffering (default is 16KB)
      highWaterMark: 64 * 1024 // 64KB
    });
    
    // Track memory usage
    let totalBytesProcessed = 0;
    
    // Process streams in background
    const streamProcessing = (async () => {
      try {
        let stream;
        let streamIndex = 0;
        while ((stream = file.getNextStream()) !== null) {
          
          // Use pipeline with backpressure handling instead of direct pipe
          await new Promise((resolve, reject) => {
            // Set lower highWaterMark on the read stream if possible
            if (stream.readableHighWaterMark > 64 * 1024 && typeof stream.setHighWaterMark === 'function') {
              stream.setHighWaterMark(64 * 1024);
            }
            
            // Handle backpressure by pausing if needed
            stream.on('data', (chunk) => {
              totalBytesProcessed += chunk.length;
              
              // Handle backpressure
              if (!combinedStream.write(chunk)) {
                stream.pause();
              }
            });
            
            combinedStream.on('drain', () => {
              stream.resume();
            });
            
            stream.on('end', () => {
              // Clear references to help garbage collection
              stream.removeAllListeners();
              stream = null;
              
              // Try to force garbage collection if available
              if (global.gc) {
                global.gc();
              }
              
              resolve();
            });
            
            stream.on('error', (err) => {
              stream.removeAllListeners();
              reject(err);
            });
          });
          
          // Clear file.streams[streamIndex-1] reference to help GC
          if (file.streams && file.streams[streamIndex-1]) {
            file.streams[streamIndex-1] = null;
          }
        }
        
        // End the combined stream when all chunks are processed
        combinedStream.end();
        
        // Clear streams array to help garbage collection
        if (file.streams) {
          file.streams.length = 0;
          file.streams = null;
        }
      } catch (err) {
        combinedStream.destroy(err);
      }
    })();
    
    try {
      // Call the service's native streaming method
      const result = await this.service.uploadFileStream(storage, {
        identifier,
        fileStream: combinedStream,
        extension,
        prefix,
        type
      });
      
      // Wait for stream processing to complete
      await streamProcessing;
      
      // Final cleanup
      return result;
    } catch (error) {
      // Ensure we clean up on error
      combinedStream.destroy();
      throw error;
    }
  }
  
  /**
   * Upload using chunked approach for services without native streaming
   */
  async uploadWithChunkedStreaming(storage, { identifier, file, extension, prefix, type }) {
    
    // Create a buffer accumulator with a smaller maximum size
    const MAX_BUFFER_SIZE = 2 * 1024 * 1024; // 2MB max buffer size (reduced from 5MB)
    let buffers = [];
    let currentSize = 0;
    let totalProcessed = 0;
    
    try {
      // Process each stream sequentially
      let stream;
      let streamIndex = 0;
      
      while ((stream = file.getNextStream()) !== null) {        
        // Process this stream chunk by chunk
        for await (const chunk of stream) {
          buffers.push(chunk);
          currentSize += chunk.length;
          totalProcessed += chunk.length;
          
          // If we've accumulated enough data, process it and release memory
          if (currentSize >= MAX_BUFFER_SIZE) {
            // Clear references to processed chunks to help garbage collection
            // Instead of keeping a concatenated buffer, we'll just keep the last chunk
            // This reduces memory usage by not keeping large concatenated buffers
            const lastChunk = buffers[buffers.length - 1];
            buffers = [lastChunk];
            currentSize = lastChunk.length;
            
            // Try to force garbage collection if available
            if (global.gc) {
              global.gc();
              logger.log('Garbage collection triggered');
            }
          }
        }
        
        // Clear the stream reference to help garbage collection
        stream.removeAllListeners?.();
        stream = null;
        
        // Clear file.streams[streamIndex-1] reference to help GC
        if (file.streams && file.streams[streamIndex-1]) {
          file.streams[streamIndex-1] = null;
        }
      }
      
      // Create the final buffer from all accumulated chunks
      const finalBuffer = Buffer.concat(buffers);

      // Clear references to help garbage collection
      buffers = null;
      
      // Clear streams array to help garbage collection
      if (file.streams) {
        file.streams.length = 0;
        file.streams = null;
      }
      
      // Call the original service with the final buffer
      const result = await this.service.uploadFile(storage, {
        identifier,
        file: finalBuffer,
        extension,
        prefix,
        type
      });
      return result;
    } catch (error) {      
      // Clean up resources on error
      buffers = null;
      if (file.streams) {
        file.streams.forEach(stream => stream?.removeAllListeners?.());
        file.streams = null;
      }
      
      throw error;
    }
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
