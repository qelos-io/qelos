const multer = require('multer');
const { maxFileSize } = require('../../config');

const upload = multer({
  limits: { fileSize: maxFileSize },
});

module.exports = upload;
