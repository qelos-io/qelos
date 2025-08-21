# Streaming Upload Test

This directory contains a test script for evaluating the streaming upload functionality with large files. The test helps identify memory leaks and performance issues during file uploads.

## Usage

Run the test with:

```bash
# Basic usage
node streaming-upload-test.js

# With garbage collection enabled (recommended)
node --expose-gc streaming-upload-test.js

# With custom configuration
TEST_FILE_SIZE=100 UPLOAD_METHOD=chunked CHUNK_SIZE=2 node --expose-gc streaming-upload-test.js
```

## Configuration Options

You can configure the test using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_FILE_SIZE` | Size of the test file in MB | 50 |
| `UPLOAD_METHOD` | Upload method to test (`native` or `chunked`) | `native` |
| `CHUNK_SIZE` | Size of each chunk in MB | 1 |
| `MONITOR_INTERVAL` | Memory monitoring interval in ms | 5000 |

## Testing for Memory Leaks

To effectively test for memory leaks:

1. Run with garbage collection enabled: `node --expose-gc streaming-upload-test.js`
2. Test with larger files: `TEST_FILE_SIZE=200 node --expose-gc streaming-upload-test.js`
3. Compare both upload methods: `UPLOAD_METHOD=chunked node --expose-gc streaming-upload-test.js`
4. Monitor memory usage in the logs for spikes or continuous growth

## Memory Optimization Techniques

The streaming upload implementation uses several techniques to minimize memory usage:

- Controlled buffer sizes with `highWaterMark` settings
- Explicit garbage collection at strategic points
- Reference clearing to help garbage collection
- Backpressure handling in stream processing
- Limiting concurrent operations
- Monitoring memory usage throughout the process
