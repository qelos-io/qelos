/**
 * Test script for streaming uploads
 * This script tests the streaming upload functionality with large files
 * 
 * Usage:
 * - Run with node --expose-gc to enable garbage collection
 * - Set TEST_FILE_SIZE=100 to specify file size in MB
 * - Set UPLOAD_METHOD=native|chunked to test specific upload method
 * - Set CHUNK_SIZE=2 to specify chunk size in MB
 * - Set MONITOR_INTERVAL=5000 to set memory monitoring interval in ms
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const logger = require('../services/logger');

// Make sure logs are visible
process.env.SHOW_LOGS = 'true';

// Import our streaming storage
const createStreamingStorage = require('../middleware/streaming-storage');
const { wrapWithStreaming } = require('../services/streaming-adapter');

// Get configuration from environment variables
const TEST_FILE_SIZE = parseInt(process.env.TEST_FILE_SIZE || '50'); // Default 50MB
const UPLOAD_METHOD = process.env.UPLOAD_METHOD || 'native'; // 'native' or 'chunked'
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '1'); // Default 1MB
const MONITOR_INTERVAL = parseInt(process.env.MONITOR_INTERVAL || '5000'); // Default 5 seconds

// Create a mock file for testing
async function createLargeTestFile(filePath, sizeMB) {
  const writeStream = fs.createWriteStream(filePath);
  const chunkSize = 1024 * 1024; // 1MB chunks
  const totalBytes = sizeMB * 1024 * 1024;
  let bytesWritten = 0;
  
  logger.log(`Creating ${sizeMB}MB test file at ${filePath}`);
  
  while (bytesWritten < totalBytes) {
    const remainingBytes = totalBytes - bytesWritten;
    const currentChunkSize = Math.min(chunkSize, remainingBytes);
    const buffer = crypto.randomBytes(currentChunkSize);
    
    // Use promisify to make write stream awaitable
    await new Promise((resolve, reject) => {
      writeStream.write(buffer, err => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    bytesWritten += currentChunkSize;
    if (bytesWritten % (10 * 1024 * 1024) === 0) {
      logger.log(`Written ${bytesWritten / (1024 * 1024)}MB of ${sizeMB}MB`);
    }
  }
  
  await new Promise((resolve) => writeStream.end(resolve));
  logger.log(`Test file created: ${filePath} (${sizeMB}MB)`);
}

// Mock storage service for testing
class MockStorageService {
  constructor() {
    this.uploadedBytes = 0;
    this.uploadedChunks = 0;
  }
  
  async uploadFile(storage, { file }) {
    if (Buffer.isBuffer(file)) {
      this.uploadedBytes += file.length;
      this.uploadedChunks++;
      logger.log(`Mock service received buffer chunk: ${file.length} bytes (total: ${this.uploadedBytes} bytes in ${this.uploadedChunks} chunks)`);
    } else {
      logger.log(`Mock service received non-buffer: ${typeof file}`);
    }
    return { success: true, publicUrl: 'https://example.com/test.jpg' };
  }
  
  async uploadFileStream(storage, { fileStream }) {
    let totalBytes = 0;
    let chunks = 0;
    
    for await (const chunk of fileStream) {
      totalBytes += chunk.length;
      chunks++;
      if (chunks % 10 === 0) {
        logger.log(`Streaming ${chunks} chunks, ${totalBytes} bytes so far`);
        logMemoryUsage();
      }
    }
    
    this.uploadedBytes = totalBytes;
    this.uploadedChunks = chunks;
    logger.log(`Mock service streamed total: ${totalBytes} bytes in ${chunks} chunks`);
    return { success: true, publicUrl: 'https://example.com/test.jpg' };
  }
}

// Log memory usage
function logMemoryUsage(label = '') {
  const memUsage = process.memoryUsage();
  logger.log(`Memory usage ${label ? '(' + label + ')' : ''} - RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}/${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
  
  // Try to force garbage collection if available
  if (global.gc) {
    global.gc();
    logger.log('Garbage collection forced');
  }
}

// Set up interval for memory monitoring
function startMemoryMonitoring(intervalMs = 5000) {
  const intervalId = setInterval(() => {
    logMemoryUsage('periodic');
  }, intervalMs);
  
  return () => clearInterval(intervalId);
}

// Test the streaming upload
async function testStreamingUpload() {
  // Start memory monitoring
  const stopMemoryMonitoring = startMemoryMonitoring(MONITOR_INTERVAL);
  logMemoryUsage('test-start');
  
  try {
    logger.log(`Starting streaming upload test with configuration:`);
    logger.log(`- File size: ${TEST_FILE_SIZE}MB`);
    logger.log(`- Upload method: ${UPLOAD_METHOD}`);
    logger.log(`- Chunk size: ${CHUNK_SIZE}MB`);
    logger.log(`- Memory monitoring interval: ${MONITOR_INTERVAL}ms`);
    logger.log(`- Garbage collection available: ${global.gc ? 'Yes' : 'No'}`);
    
    if (!global.gc) {
      logger.log('WARNING: For best results, run with node --expose-gc to enable garbage collection');
    }
    
    // Create test directory if it doesn't exist
    const testDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create a large test file
    const testFilePath = path.join(testDir, 'large-test-file.bin');
    await createLargeTestFile(testFilePath, TEST_FILE_SIZE);
    logMemoryUsage('after-file-creation');
    
    // Create streaming storage instance with configurable chunk size
    const storage = createStreamingStorage({
      chunkSize: CHUNK_SIZE * 1024 * 1024, // Convert MB to bytes
      maxChunksInMemory: 5 // Limit number of chunks in memory
    });
    
    // Create a file object similar to what multer would create
    const fileStream = fs.createReadStream(testFilePath, {
      highWaterMark: 1024 * 1024 // 1MB buffer for read stream
    });
    const fileInfo = {
      originalname: 'large-test-file.jpg',
      mimetype: 'image/jpeg',
      size: TEST_FILE_SIZE * 1024 * 1024
    };
    
    // Process the file through streaming storage
    logger.log('Starting streaming storage processing');
    const processedFile = await new Promise((resolve, reject) => {
      const req = {};
      const file = {
        stream: fileStream,
        ...fileInfo
      };
      
      storage._handleFile(req, file, (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });
    
    logger.log('File processed through streaming storage');
    logger.log(`Processed file has ${processedFile.streams.length} streams`);
    logMemoryUsage('after-streaming-storage');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      logger.log('Garbage collection forced before upload');
    }
    
    // Test with mock service
    const mockService = new MockStorageService();
    const streamingAdapter = wrapWithStreaming(mockService);
    
    // Test the adapter with the processed file using the specified method
    logger.log(`Testing streaming adapter with ${UPLOAD_METHOD} streaming method`);
    console.time('uploadTime');
    
    // The wrapWithStreaming function handles the method selection internally
    // based on the service capabilities
    const result = await streamingAdapter.uploadFile({}, {
      identifier: 'test',
      file: processedFile,
      extension: 'jpg',
      prefix: 'test',
      type: 'image/jpeg'
    });
    
    console.timeEnd('uploadTime');
    logger.log('Upload completed with result:', result);
    logger.log(`Mock service received ${mockService.uploadedBytes || 'unknown'} bytes in ${mockService.uploadedChunks || 'unknown'} chunks`);
    logMemoryUsage('after-upload');
    
    // Help garbage collection by clearing references
    processedFile.streams = null;
    
    // Clean up
    logger.log('Cleaning up test files');
    fs.unlinkSync(testFilePath);
    
    // Final memory check
    if (global.gc) {
      global.gc();
      logger.log('Final garbage collection forced');
    }
    
    logMemoryUsage('test-end');
    logger.log('Test completed successfully');
    
  } catch (error) {
    logger.error('Test failed:', error);
  } finally {
    // Always stop memory monitoring
    stopMemoryMonitoring();
  }
}

// Run the test
testStreamingUpload().catch(err => {
  logger.error('Unhandled error in test:', err);
});
