const { Readable } = require('node:stream');
const logger = require('../services/logger');

/**
 * Custom streaming storage engine for Multer
 * Processes files in chunks to minimize memory usage
 */
class StreamingMemoryStorage {
  constructor(options = {}) {
    this.options = {
      chunkSize: 1024 * 1024, // Default 1MB chunks
      maxChunksInMemory: 5,  // Maximum number of chunks to keep in memory at once
      ...options
    };
  }

  _handleFile(req, file, cb) {
    // Store the request object for connection tracking
    file.req = req;
    
    // Create a PassThrough stream that we'll use to collect chunks
    const chunks = [];
    let fileSize = 0;
    let chunkCount = 0;
    
    // Track if the connection has been closed
    let connectionClosed = false;
    
    // Handle connection close events
    const handleConnectionClose = () => {
      connectionClosed = true;
      
      // Clean up chunks to free memory immediately
      if (chunks.length > 0) {
        chunks.length = 0;
      }
      
      // Clean up any streams we've created
      if (file.streams) {
        file.streams.forEach(stream => {
          if (stream && typeof stream.destroy === 'function') {
            stream.destroy();
          }
        });
      }
      
      // Force garbage collection
      if (global.gc) global.gc();
    };
    
    // Listen for connection close events
    req.on('close', handleConnectionClose);
    req.on('end', handleConnectionClose);
    req.on('error', handleConnectionClose);
    if (req.socket) {
      req.socket.on('close', handleConnectionClose);
    }
    
    // Process the file in chunks
    file.stream.on('data', (chunk) => {
      // Skip processing if connection is already closed
      if (connectionClosed) return;
      
      chunks.push(chunk);
      fileSize += chunk.length;
      chunkCount++;
      
      // If we've accumulated enough chunks, create a readable stream
      // This allows us to start processing earlier chunks while later ones are still being received
      if (chunks.length >= this.options.chunkSize) {
        // Create a readable stream from the chunks we've collected
        const stream = Readable.from(Buffer.concat(chunks));
        
        // Initialize streams array if it doesn't exist
        if (!file.streams) {
          file.streams = [];
          file.isStreaming = true;
        }
        
        // Add the stream to our collection
        file.streams.push(stream);
        
        // Try to force garbage collection if available
        if (global.gc && fileSize > 50 * 1024 * 1024) { // Only for files > 50MB
          global.gc();
          logger.log('Garbage collection triggered during streaming');
        }
        
        // Clear the chunks array to free memory
        chunks.length = 0;
      }
    });

    file.stream.on('end', () => {
      // Skip processing if connection is already closed
      if (connectionClosed) return;
      
      // Handle any remaining chunks
      if (chunks.length > 0) {
        const stream = Readable.from(Buffer.concat(chunks));
        
        // Initialize streams array if it doesn't exist
        if (!file.streams) {
          file.streams = [];
          file.isStreaming = true;
        }
        
        file.streams.push(stream);
        
        // Clear chunks to free memory
        chunks.length = 0;
      }
      // Create a method to get the next stream
      let streamIndex = 0;
      file.getNextStream = () => {
        if (streamIndex < file.streams.length) {
          const stream = file.streams[streamIndex];
          
          // Clear the reference to the stream after it's retrieved
          // This helps with garbage collection for large files
          file.streams[streamIndex] = null;
          
          streamIndex++;
          return stream;
        }
        return null;
      };
      
      // Also provide a buffer for backward compatibility
      // This is a reference to the first chunk only, to minimize memory usage
      // Services should use getNextStream() instead when possible
      file.buffer = Buffer.from('STREAMING_MODE');
      
      file.size = fileSize;
      
      cb(null, {
        buffer: file.buffer,
        size: fileSize,
        isStreaming: true,
        streams: file.streams,
        getNextStream: file.getNextStream
      });
    });

    file.stream.on('error', (err) => {      
      // Clean up resources on error
      if (file.streams) {
        file.streams.forEach(stream => {
          if (stream && typeof stream.destroy === 'function') {
            stream.destroy();
          }
        });
        file.streams = null;
      }
      
      cb(err);
    });
  }

  _removeFile(req, file, cb) {
    // Clean up any resources
    if (file.streams) {
      file.streams = null;
    }
    cb(null);
  }
}

module.exports = (options) => new StreamingMemoryStorage(options);
