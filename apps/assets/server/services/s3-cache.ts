// Import S3 module
import S3Module from '../models/s3';

// Define types
type S3 = any; // Type for S3 instance
type StorageConfig = {
  _id: { toString: () => string };
  [key: string]: any;
};
type S3CacheOptions = {
  inactivityTimeout?: number;
};

// Define module interface for TypeScript
export interface S3CacheModule {
  get(storage: StorageConfig): S3;
  size(): number;
  clearAll(): Promise<void>;
  configure(options: S3CacheOptions): void;
}

// Create the cache state
const cache = new Map<string, S3>();
const timeouts = new Map<string, NodeJS.Timeout>();
let inactivityTimeout = 30 * 60 * 1000; // 30 minutes by default

/**
 * Configure the S3 cache
 * @param options - Configuration options
 */
const configure = (options: S3CacheOptions): void => {
  if (options.inactivityTimeout) {
    inactivityTimeout = options.inactivityTimeout;
  }
};

/**
 * Reset the inactivity timeout for a storage instance
 * @param {string} storageId - Storage ID
 */
const resetTimeout = (storageId: string): void => {
  // Clear existing timeout if any
  if (timeouts.has(storageId)) {
    clearTimeout(timeouts.get(storageId));
  }
  
  // Set new timeout
  const timeout = setTimeout(() => {
    cleanup(storageId);
  }, inactivityTimeout);
  
  timeouts.set(storageId, timeout);
};

/**
 * Clean up an unused S3 instance
 * @param {string} storageId - Storage ID
 */
const cleanup = async (storageId: string): Promise<void> => {
  if (!cache.has(storageId)) return;
  
  const s3Instance = cache.get(storageId);
  
  try {
    // Disconnect the S3 client
    await s3Instance?.disconnect();
  } catch (error) {
    console.error(`Error disconnecting S3 instance ${storageId}:`, error);
  }
  
  // Remove from cache
  cache.delete(storageId);
  timeouts.delete(storageId);
};

/**
 * Get or create an S3 instance for the given storage
 * @param {StorageConfig} storage - Storage configuration object
 * @returns {S3} - S3 instance
 */
const get = (storage: StorageConfig): S3 => {
  if (!storage || !storage._id) {
    throw new Error('Invalid storage configuration');
  }

  const storageId = storage._id.toString();
  
  // If we have a cached instance, use it
  if (cache.has(storageId)) {
    // Reset the timeout since the instance is being used
    resetTimeout(storageId);
    return cache.get(storageId) as S3;
  }

  // Create a new instance
  const s3Instance = new S3Module(storage);
  
  // Cache it
  cache.set(storageId, s3Instance);
  
  // Set timeout for cleanup
  resetTimeout(storageId);
  
  return s3Instance;
};

/**
 * Get the number of cached instances
 * @returns {number} - Number of cached instances
 */
const size = (): number => {
  return cache.size;
};

/**
 * Clear all cached instances
 */
const clearAll = async (): Promise<void> => {
  // Disconnect all instances
  for (const [storageId, s3Instance] of cache.entries()) {
    try {
      await s3Instance.disconnect();
    } catch (error) {
      console.error(`Error disconnecting S3 instance ${storageId}:`, error);
    }
    
    // Clear the timeout
    if (timeouts.has(storageId)) {
      clearTimeout(timeouts.get(storageId));
    }
  }
  
  // Clear the maps
  cache.clear();
  timeouts.clear();
};

// Create module exports
export const s3Cache: S3CacheModule = {
  get,
  size,
  clearAll,
  configure
};

// Export as CommonJS module
export default s3Cache;
