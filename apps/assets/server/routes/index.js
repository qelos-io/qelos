const multer = require('multer');
const app = require('@qelos/api-kit').app()
const { maxFileSize } = require('../../config');

app.use(require('./assets'))
app.use(require('./storage'))
app.use(require('./upload'))

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File too large.', maxFileSize }).end();
  }
  next(err);
});
