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
    // Create a combined stream with a smaller buffer to reduce memory usage
    const combinedStream = new PassThrough({
      highWaterMark: 32 * 1024 // 32KB buffer size to reduce memory usage (reduced from 64KB)
    });
    
    // Track if the upload has been aborted
    let uploadAborted = false;
    let totalBytesProcessed = 0;
    
    // Handle connection termination
    const handleAbort = (reason) => {
      if (!uploadAborted) {
        uploadAborted = true;
        
        // Destroy the combined stream
        if (combinedStream && typeof combinedStream.destroy === 'function') {
          combinedStream.destroy(new Error(reason || 'Upload aborted'));
        }
        
        // Clean up file streams
        if (file.streams) {
          file.streams.forEach(s => s && typeof s.destroy === 'function' && s.destroy());
          file.streams = null;
        }
        
        // Force garbage collection
        if (global.gc) global.gc();
      }
    };
    
    // Set up connection termination handlers if request object is available
    if (file.req) {
      file.req.on('close', () => handleAbort('Connection closed'));
      file.req.on('error', () => handleAbort('Connection error'));
      if (file.req.socket) {
        file.req.socket.on('close', () => handleAbort('Socket closed'));
      }
    }
    
    // Process streams in background
    const streamProcessing = (async () => {
      try {
        let stream;
        let streamIndex = 0;
        while ((stream = file.getNextStream()) !== null) {
          
          // Use pipeline with backpressure handling instead of direct pipe
          await new Promise((resolve, reject) => {
            // Skip if already aborted
            if (uploadAborted) {
              resolve();
              return;
            }
            
            const onData = (chunk) => {
              // Skip if aborted
              if (uploadAborted) return;
              
              totalBytesProcessed += chunk.length;
              
              // Handle backpressure
              if (!combinedStream.write(chunk)) {
                stream.pause();
              }
            };
            
            const onEnd = () => {
              stream.removeListener('data', onData);
              stream.removeListener('error', onError);
              combinedStream.removeListener('drain', onDrain);
              resolve();
            };
            
            const onError = (err) => {
              stream.removeListener('data', onData);
              stream.removeListener('end', onEnd);
              combinedStream.removeListener('drain', onDrain);
              reject(err);
            };
            
            const onDrain = () => {
              if (!uploadAborted && stream.isPaused && stream.isPaused()) {
                stream.resume();
              }
            };
            
            // Set up event listeners
            stream.on('data', onData);
            stream.on('end', onEnd);
            stream.on('error', onError);
            combinedStream.on('drain', onDrain);
          });
          
          // Clear reference to processed stream
          if (file.streams && file.streams[streamIndex]) {
            file.streams[streamIndex] = null;
          }
          streamIndex++;
          
          // Force garbage collection periodically for very large files
          if (global.gc && totalBytesProcessed > 500 * 1024 * 1024 && totalBytesProcessed % (100 * 1024 * 1024) < 1024 * 1024) {
            global.gc();
          }
        }
        
        // Only end the stream if we haven't aborted
        if (!uploadAborted) {
          combinedStream.end();
        }
        
        // Clear streams array to help garbage collection
        if (file.streams) {
          file.streams.forEach(s => s && typeof s.destroy === 'function' && s.destroy());
          file.streams = null;
        }
      } catch (err) {
        if (!uploadAborted) {
          combinedStream.destroy(err);
        }
      }
    })();
    
    try {
      // Create a file object with the combined stream
      const processedFile = {
        fileStream: combinedStream,
        type: type || 'application/octet-stream',
        req: file.req // Pass the request object for connection tracking
      };
      
      // Upload the combined stream
      const result = await storage.uploadStream(
        `/${prefix || 'uploads'}/${identifier}.${extension || 'bin'}`,
        processedFile
      );
      
      // Wait for stream processing to complete
      await streamProcessing;
      
      return result;
    } catch (error) {
      // Ensure we clean up on error
      handleAbort('Upload error');
      throw error;
    }
  }
  
  /**
   * Upload using chunked approach for services without native streaming
   */
  async uploadWithChunkedStreaming(storage, { identifier, file, extension, prefix, type }) {
    // Track upload status
    let uploadAborted = false;
    
    // Create a buffer accumulator with a smaller maximum size
    const MAX_BUFFER_SIZE = 2 * 1024 * 1024; // 2MB max buffer size
    let buffers = [];
    let currentSize = 0;
    let totalProcessed = 0;
    
    // Handle connection termination
    const handleAbort = (reason) => {
      if (!uploadAborted) {
        uploadAborted = true;
        
        // Clean up buffers to free memory immediately
        if (buffers && buffers.length > 0) {
          buffers = null;
        }
        
        // Clean up file streams
        if (file.streams) {
          file.streams.forEach(s => s && typeof s.destroy === 'function' && s.destroy());
          file.streams = null;
        }
        
        // Force garbage collection
        if (global.gc) global.gc();
      }
    };
    
    // Set up connection termination handlers if request object is available
    if (file.req) {
      file.req.on('close', () => handleAbort('Connection closed'));
      file.req.on('error', () => handleAbort('Connection error'));
      if (file.req.socket) {
        file.req.socket.on('close', () => handleAbort('Socket closed'));
      }
    }
    
    try {
      let stream;
      let streamIndex = 0;
      
      // Process each stream until complete or aborted
      while (!uploadAborted && (stream = file.getNextStream()) !== null) {
        // Process this stream chunk by chunk
        for await (const chunk of stream) {
          // Skip if upload was aborted
          if (uploadAborted) break;
          
          buffers.push(chunk);
          currentSize += chunk.length;
          totalProcessed += chunk.length;
          
          // If we've accumulated enough data, process it and release memory
          if (currentSize >= MAX_BUFFER_SIZE) {
            // Clear references to processed chunks to help garbage collection
            // Instead of keeping a concatenated buffer, we'll just keep the last chunk
            // This reduces memory usage by not keeping large concatenated buffers
            buffers = [Buffer.concat(buffers)];
            currentSize = buffers[0].length;
            
            // Force garbage collection periodically for very large files
            if (global.gc && totalProcessed > 500 * 1024 * 1024 && totalProcessed % (100 * 1024 * 1024) < MAX_BUFFER_SIZE) {
              global.gc();
            }
          }
        }
        
        // Skip further processing if aborted
        if (uploadAborted) break;
        
        // Clear reference to processed stream
        if (file.streams && file.streams[streamIndex]) {
          file.streams[streamIndex] = null;
        }
        streamIndex++;
      }
      
      // Skip upload if aborted
      if (uploadAborted) {
        throw new Error('Upload aborted due to connection termination');
      }
      
      // Create the final buffer from all accumulated chunks
      const finalBuffer = Buffer.concat(buffers);

      // Clear references to help garbage collection
      buffers = null;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Upload the final buffer
      const result = await storage.upload({
        buffer: finalBuffer,
        identifier,
        extension,
        prefix,
        type
      });
      return result;
    } catch (error) {
      // Ensure we abort if not already aborted
      handleAbort('Upload error');
      
      // Clean up resources on error
      buffers = null;
      if (file.streams) {
        file.streams.forEach(s => s && typeof s.destroy === 'function' && s.destroy());
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
