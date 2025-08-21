/**
 * Test script for streaming uploads
 * This script tests the streaming upload functionality with large files
 */
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { PassThrough } = require('stream');
const crypto = require('crypto');
const logger = require('../services/logger');

// Make sure logs are visible
process.env.SHOW_LOGS = 'true';

// Import our streaming storage
const createStreamingStorage = require('../middleware/streaming-storage');
const { wrapWithStreaming } = require('../services/streaming-adapter');

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
      }
    }
    
    this.uploadedBytes = totalBytes;
    this.uploadedChunks = chunks;
    logger.log(`Mock service streamed total: ${totalBytes} bytes in ${chunks} chunks`);
    return { success: true, publicUrl: 'https://example.com/test.jpg' };
  }
}

// Test the streaming upload
async function testStreamingUpload() {
  try {
    // Create test directory if it doesn't exist
    const testDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create a large test file (50MB)
    const testFilePath = path.join(testDir, 'large-test-file.bin');
    const fileSizeMB = 50;
    await createLargeTestFile(testFilePath, fileSizeMB);
    
    // Create streaming storage instance
    const storage = createStreamingStorage({
      chunkSize: 1 * 1024 * 1024 // 1MB chunks
    });
    
    // Create a file object similar to what multer would create
    const fileStream = fs.createReadStream(testFilePath);
    const fileInfo = {
      originalname: 'large-test-file.jpg',
      mimetype: 'image/jpeg',
      size: fileSizeMB * 1024 * 1024
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
    
    // Test with mock service
    const mockService = new MockStorageService();
    const streamingAdapter = wrapWithStreaming(mockService);
    
    // Test the adapter with the processed file
    logger.log('Testing streaming adapter with mock service');
    const result = await streamingAdapter.uploadFile({}, {
      identifier: 'test',
      file: processedFile,
      extension: 'jpg',
      prefix: 'test',
      type: 'image/jpeg'
    });
    
    logger.log('Upload completed with result:', result);
    logger.log(`Mock service received ${mockService.uploadedBytes} bytes in ${mockService.uploadedChunks} chunks`);
    
    // Clean up
    logger.log('Cleaning up test files');
    fs.unlinkSync(testFilePath);
    logger.log('Test completed successfully');
    
    // Memory usage stats
    const memUsage = process.memoryUsage();
    logger.log('Memory usage:');
    logger.log(`  RSS: ${Math.round(memUsage.rss / 1024 / 1024)} MB`);
    logger.log(`  Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`);
    logger.log(`  Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`);
    logger.log(`  External: ${Math.round(memUsage.external / 1024 / 1024)} MB`);
    
  } catch (error) {
    logger.error('Test failed:', error);
  }
}

// Run the test
testStreamingUpload().catch(err => {
  logger.error('Unhandled error in test:', err);
});
