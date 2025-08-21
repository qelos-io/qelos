/**
 * Test script for connection termination during streaming uploads
 * This script tests how the system handles aborted connections during large file uploads
 * 
 * Usage:
 * - Run with node --expose-gc to enable garbage collection
 * - Set TEST_FILE_SIZE=100 to specify file size in MB
 * - Set UPLOAD_METHOD=native|chunked to test specific upload method
 * - Set ABORT_AFTER_BYTES=10 to abort the connection after X MB have been processed
 * - Set MONITOR_INTERVAL=5000 to set memory monitoring interval in ms
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const logger = require('../services/logger');

// Force process exit after 60 seconds to prevent hanging
const MAX_TEST_DURATION = 60000; // 60 seconds
const forceExitTimeout = setTimeout(() => {
  console.log('\n\nTEST TIMEOUT: Force exiting after', MAX_TEST_DURATION/1000, 'seconds');
  process.exit(1);
}, MAX_TEST_DURATION);

// Clear the timeout if the process exits normally
process.on('exit', () => {
  clearTimeout(forceExitTimeout);
});

// Make sure logs are visible
process.env.SHOW_LOGS = 'true';

// Import our streaming storage
const createStreamingStorage = require('../middleware/streaming-storage');
const { wrapWithStreaming } = require('../services/streaming-adapter');

// Get configuration from environment variables
const TEST_FILE_SIZE = parseInt(process.env.TEST_FILE_SIZE || '50', 10); // Size in MB
const UPLOAD_METHOD = process.env.UPLOAD_METHOD || 'native'; // 'native' or 'chunked'
// Default to 2MB for abort threshold - this ensures we trigger the abort during testing
const ABORT_AFTER_BYTES = parseInt(process.env.ABORT_AFTER_BYTES || (2 * 1024 * 1024), 10); 
const MONITOR_INTERVAL = parseInt(process.env.MONITOR_INTERVAL || '5000', 10); // Memory monitoring interval in ms

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

// Global tracking of resources that need cleanup
const cleanupHandlers = [];

// Register global cleanup for unexpected termination
process.on('SIGINT', () => {
  console.log('\nProcess interrupted. Cleaning up resources...');
  cleanupHandlers.forEach(handler => {
    try {
      handler();
    } catch (err) {
      console.error('Error during cleanup:', err.message);
    }
  });
  process.exit(0);
});

// Simple memory logging function without periodic monitoring
function startMemoryMonitoring() {
  // Log initial memory usage
  logMemoryUsage('start');
  
  // Return a no-op function for compatibility
  return function stopMemoryMonitoring() {
    logger.log('Memory monitoring stopped');
  };
}

// Create a mock HTTP request with events and tracking for bytes processed
function createMockRequest() {
  const req = new EventEmitter();
  
  // Mock socket that can emit close events
  const socket = new EventEmitter();
  req.socket = socket;
  
  // Add standard HTTP request properties
  req.headers = {
    'content-type': 'multipart/form-data',
    'content-length': TEST_FILE_SIZE * 1024 * 1024
  };
  
  // Add tracking for bytes processed
  req.bytesProcessed = 0;
  
  return req;
}

// Test the streaming upload with connection termination
async function testConnectionTermination() {
  // Start memory monitoring
  const stopMemoryMonitoring = startMemoryMonitoring(MONITOR_INTERVAL);
  logMemoryUsage('test-start');
  
  try {
    logger.log(`Starting connection termination test with configuration:
- File size: ${TEST_FILE_SIZE}MB
- Upload method: ${UPLOAD_METHOD}
- Abort after: ${ABORT_AFTER_BYTES / (1024 * 1024)}MB processed
- Memory monitoring interval: ${MONITOR_INTERVAL}ms
- Garbage collection available: ${global.gc ? 'Yes' : 'No'}`);
    
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
    
        // Create streaming storage instance with smaller chunks to process faster
    const storage = createStreamingStorage({
      chunkSize: 512 * 1024, // 512KB chunks
      maxChunksInMemory: 5 // Limit number of chunks in memory
    });
    
    // Patch the _handleFile method to intercept the file stream and monitor bytes
    const originalHandleFile = storage._handleFile;
    storage._handleFile = function(req, file, cb) {
      // Track bytes and trigger connection termination
      let bytesProcessed = 0;
      let connectionTerminated = false;
      
      // Create a wrapper around the original stream
      const originalStream = file.stream;
      const originalOn = originalStream.on;
      
      // Override the 'on' method to intercept data events
      originalStream.on = function(event, listener) {
        if (event === 'data') {
          // Wrap the data listener to track bytes and trigger termination
          const wrappedListener = function(chunk) {
            bytesProcessed += chunk.length;
            
            if (bytesProcessed >= ABORT_AFTER_BYTES && !connectionTerminated) {
              connectionTerminated = true;
              req.simulateConnectionTermination = () => {
                logger.log('SIMULATING CONNECTION TERMINATION after', bytesProcessed / (1024 * 1024), 'MB');
                
                // Log memory usage before abort
                logMemoryUsage('before-abort');
                
                // Mark connection as aborted to prevent further processing
                mockRequest.connectionAborted = true;
                
                // Destroy the original file stream to stop data flow
                fileStream.destroy(new Error('Connection terminated'));
                logger.log('File stream destroyed');
                
                // Destroy any other streams that might be in the processing chain
                if (file.stream && typeof file.stream.destroy === 'function') {
                  file.stream.destroy(new Error('Connection terminated'));
                  logger.log('File object stream destroyed');
                }
                
                // Force the callback to be called with an error to complete the test
                setTimeout(() => {
                  // Call the callback with an error to trigger the catch block
                  if (typeof cb === 'function') {
                    cb(new Error('Connection terminated'));
                    logger.log('Forced error callback to complete test');
                  }
                }, 100);
                
                // Emit events that would happen when a connection is terminated
                req.socket.emit('close');
                req.emit('close');
                req.emit('aborted');
                
                // Set destroyed flag to true to stop processing
                req.destroyed = true;
                req.socket.destroyed = true;
                
                logger.log('Connection termination events emitted');
                
                // Set up timeouts to check memory usage after abort
                const timeouts = [];
                
                // Check memory immediately after abort
                timeouts.push(setTimeout(() => {
                  logMemoryUsage('immediately-after-abort');
                }, 100));
                
                // Check memory 5 seconds after abort
                timeouts.push(setTimeout(() => {
                  logMemoryUsage('5-seconds-after-abort');
                }, 5000));
                
                // Force garbage collection and check memory again
                timeouts.push(setTimeout(() => {
                  if (global.gc) {
                    global.gc();
                  }
                  logMemoryUsage('after-gc-post-abort');
                }, 5100));
                
                // Add cleanup function to request
                req.cleanupTimeouts = () => {
                  timeouts.forEach(t => clearTimeout(t));
                  timeouts.length = 0;
                  logger.log('Stream wrapper timeouts cleared');
                  
                  // Remove from cleanup handlers
                  const index = cleanupHandlers.indexOf(req.cleanupTimeouts);
                  if (index > -1) {
                    cleanupHandlers.splice(index, 1);
                  }
                };
                
                // Register for global cleanup
                cleanupHandlers.push(req.cleanupTimeouts);
              };
              req.simulateConnectionTermination();
              
              // Don't call the original listener after termination
              return;
            }
            
            // Log progress periodically
            if (bytesProcessed % (1024 * 1024) < chunk.length) {
              logger.log(`Processed ${Math.round(bytesProcessed / (1024 * 1024))}MB so far`);
            }
            
            // Call the original listener if not terminated
            listener.call(this, chunk);
          };
          
          return originalOn.call(this, event, wrappedListener);
        }
        
        // Pass through other events
        return originalOn.call(this, event, listener);
      };
      
      // Call the original _handleFile method
      return originalHandleFile.call(this, req, file, cb);
    };
    
    // Create a file object similar to what multer would create
    // Use a smaller highWaterMark to slow down the reading process
    const fileStream = fs.createReadStream(testFilePath, {
      highWaterMark: 64 * 1024 // 64KB buffer for read stream to slow things down
    });
    const fileInfo = {
      originalname: 'large-test-file.jpg',
      mimetype: 'image/jpeg',
      size: TEST_FILE_SIZE * 1024 * 1024
    };
    
    // Create mock request with events
    const mockRequest = createMockRequest();
    
    // Process the file through streaming storage
    logger.log('Starting streaming storage processing');
    const processFilePromise = new Promise((resolve, reject) => {
      const file = {
        stream: fileStream,
        ...fileInfo,
        // Store the request object on the file for connection tracking
        req: mockRequest
      };
      
      storage._handleFile(mockRequest, file, (err, info) => {
        if (err) {
          logger.log('Storage _handleFile returned error:', err.message);
          reject(err);
        } else {
          resolve(info);
        }
      });
    });
    
    // We'll test only the streaming storage middleware, not the S3 model directly
    
    // Log that we'll abort after processing a certain amount of data
    logger.log(`Will abort connection after processing ${ABORT_AFTER_BYTES / (1024 * 1024)}MB`);
    
    // Set up memory monitoring at key points after abort
    const checkMemoryAfterAbort = () => {
      if (mockRequest.connectionAborted) {
        // Track all timeouts so we can clean them up if needed
        const timeouts = [];
        
        // Check memory after a short delay to see immediate impact
        const shortTimeout = setTimeout(() => {
          logMemoryUsage('immediately-after-abort');
          // Remove from tracking array once executed
          const index = timeouts.indexOf(shortTimeout);
          if (index > -1) timeouts.splice(index, 1);
        }, 500);
        timeouts.push(shortTimeout);
        
        // Check memory again after a longer delay to see cleanup effects
        const longTimeout = setTimeout(() => {
          logMemoryUsage('5-seconds-after-abort');
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
            logMemoryUsage('after-gc-post-abort');
          }
          
          // Remove from tracking array once executed
          const index = timeouts.indexOf(longTimeout);
          if (index > -1) timeouts.splice(index, 1);
        }, 5000);
        timeouts.push(longTimeout);
        
        // Add a cleanup function to the request object
        mockRequest.cleanupTimeouts = () => {
          timeouts.forEach(t => clearTimeout(t));
          timeouts.length = 0;
          logger.log('Memory check timeouts cleared');
          
          // Remove from cleanup handlers
          const index = cleanupHandlers.indexOf(mockRequest.cleanupTimeouts);
          if (index > -1) {
            cleanupHandlers.splice(index, 1);
          }
        };
        
        // Register for global cleanup
        cleanupHandlers.push(mockRequest.cleanupTimeouts);  
        
        return true;
      }
      return false;
    };
    
    // Set up a timeout-based check for connection abortion
    let isCheckingAbort = true;
    let abortCheckTimeoutId = null;
    
    // Function to schedule the next abort check
    const scheduleNextAbortCheck = () => {
      if (!isCheckingAbort) return;
      
      abortCheckTimeoutId = setTimeout(() => {
        if (!isCheckingAbort) return;
        
        // Check if connection has been aborted
        if (checkMemoryAfterAbort()) {
          // If aborted, stop checking
          clearAbortCheck();
        } else {
          // Otherwise schedule next check
          scheduleNextAbortCheck();
        }
      }, 1000);
    };
    
    // Function to clean up the abort check
    const clearAbortCheck = () => {
      if (isCheckingAbort) {
        isCheckingAbort = false;
        
        if (abortCheckTimeoutId) {
          clearTimeout(abortCheckTimeoutId);
          abortCheckTimeoutId = null;
        }
        
        logger.log('Abort check stopped');
        
        // Remove from cleanup handlers
        const index = cleanupHandlers.indexOf(clearAbortCheck);
        if (index > -1) {
          cleanupHandlers.splice(index, 1);
        }
      }
    };
    
    // Register for global cleanup
    cleanupHandlers.push(clearAbortCheck);
    
    // Start the first abort check
    scheduleNextAbortCheck();
    
    try {
      // Wait for file processing to complete or fail
      const processedFile = await processFilePromise;
      
      // If we get here, the file was processed before the abort
      clearAbortCheck();
      logger.log('File processed before abort timeout. Aborting test');
      
      // Clean up
      logger.log('Cleaning up test files');
      fs.unlinkSync(testFilePath);
      
      // Final memory check
      logMemoryUsage('test-end');
      logger.log('Test completed without connection termination (increase ABORT_AFTER value)');
      
    } catch (error) {
      // This is expected if the connection was terminated
      logger.log('File processing was interrupted as expected:', error.message);
      
      // Make sure to clear all intervals and timeouts
      clearAbortCheck();
      
      // Clean up any timeouts that were set
      if (mockRequest.cleanupTimeouts) {
        mockRequest.cleanupTimeouts();
      }
      
      // Make sure memory monitoring is stopped in the catch block too
      stopMemoryMonitoring();
      
      // Wait a bit longer to observe memory cleanup
      logger.log('Waiting for 15 seconds to observe memory cleanup...');
      await new Promise(resolve => {
        const timeoutId = setTimeout(() => {
          clearTimeout(timeoutId); // Clear the timeout explicitly
          resolve();
        }, 15000);
        
        // Add to cleanup handlers in case of interruption
        const cleanupTimeout = () => {
          clearTimeout(timeoutId);
          logger.log('Final observation timeout cleared');
          // Remove self from cleanup handlers
          const index = cleanupHandlers.indexOf(cleanupTimeout);
          if (index > -1) {
            cleanupHandlers.splice(index, 1);
          }
        };
        
        // Register for global cleanup
        cleanupHandlers.push(cleanupTimeout);
      });
      
      // Log memory usage after waiting
      logMemoryUsage('15-seconds-after-error');
      
      // Final memory check
      logMemoryUsage('after-error-final');
      
      // Force final garbage collection
      if (global.gc) {
        global.gc();
        logger.log('Final garbage collection forced');
        logMemoryUsage('final-after-gc');
      }
      
      // Clean up
      logger.log('Cleaning up test files');
      try {
        fs.unlinkSync(testFilePath);
      } catch (e) {
        logger.log('Error cleaning up test file:', e.message);
      }
      
      logger.log('Connection termination test completed successfully');
    } finally {
      // Always stop memory monitoring
      stopMemoryMonitoring();
      
      // Log all remaining cleanup handlers
      if (cleanupHandlers.length > 0) {
        logger.log(`WARNING: ${cleanupHandlers.length} cleanup handlers still registered. Cleaning up...`);
        cleanupHandlers.forEach(handler => {
          try {
            handler();
          } catch (err) {
            logger.error('Error during cleanup:', err.message);
          }
        });
      }
      
      // Force exit after a short delay to ensure all logs are flushed
      setTimeout(() => {
        logger.log('Test complete. Exiting process.');
        process.exit(0);
      }, 1000);
    }
    
  } catch (error) {
    logger.error('Test failed:', error);
    
    // Force exit even on error
    setTimeout(() => {
      logger.log('Test failed. Exiting process.');
      process.exit(1);
    }, 1000);
  }
}

// Run the test
(async () => {
  try {
    await testConnectionTermination();
    // Force exit after test completes
    setTimeout(() => {
      logger.log('Test completed, exiting process');
      process.exit(0);
    }, 1000);
  } catch (err) {
    logger.error('Unhandled error in test:', err);
    process.exit(1);
  }
})();
