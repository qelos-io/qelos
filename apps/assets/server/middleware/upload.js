const multer = require('multer');
const streamingStorage = require('./streaming-storage');

// Configure multer with our custom streaming storage engine
const upload = multer({
  storage: streamingStorage({
    chunkSize: 1024 * 1024 // 1MB chunks, adjust as needed
  })
});

module.exports = upload;
