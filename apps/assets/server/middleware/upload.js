const multer = require('multer');

// Configure multer with our custom streaming storage engine
const upload = multer();

module.exports = upload;
