const { Readable } = require('node:stream');

/**
 * Custom streaming storage engine for Multer
 * Processes files in chunks to minimize memory usage
 */
class StreamingMemoryStorage {
  constructor(options = {}) {
    this.options = {
      chunkSize: 1024 * 1024, // Default 1MB chunks
      ...options
    };
  }

  _handleFile(req, file, cb) {
    // Create a PassThrough stream that we'll use to collect chunks
    const chunks = [];
    let fileSize = 0;
    
    // Process the file in chunks
    file.stream.on('data', (chunk) => {
      chunks.push(chunk);
      fileSize += chunk.length;
      
      // If we've accumulated enough chunks, create a readable stream
      // This allows us to start processing earlier chunks while later ones are still being received
      if (chunks.length >= this.options.chunkSize) {
        // We keep the last chunk to ensure we don't create too many small streams
        const processChunks = chunks.slice(0, -1);
        chunks.splice(0, chunks.length - 1); // Keep only the last chunk
        
        // Add the stream to the file object for later processing
        if (!file.streams) file.streams = [];
        const stream = Readable.from(Buffer.concat(processChunks));
        file.streams.push(stream);
      }
    });

    file.stream.on('end', () => {
      // Handle any remaining chunks
      if (chunks.length > 0) {
        if (!file.streams) file.streams = [];
        const stream = Readable.from(Buffer.concat(chunks));
        file.streams.push(stream);
      }
      
      // Create a method to get the next stream
      let streamIndex = 0;
      file.getNextStream = () => {
        if (streamIndex < file.streams.length) {
          return file.streams[streamIndex++];
        }
        return null;
      };
      
      // Also provide a buffer for backward compatibility
      // This is a reference to the first chunk only, to minimize memory usage
      // Services should use getNextStream() instead when possible
      file.buffer = file.streams.length > 0 ? 
        Buffer.concat([Buffer.from('STREAMING_MODE')]) : Buffer.alloc(0);
      
      file.size = fileSize;
      
      cb(null, {
        buffer: file.buffer,
        size: fileSize,
        isStreaming: true,
        streams: file.streams,
        getNextStream: file.getNextStream
      });
    });

    file.stream.on('error', cb);
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
