const router = require('@qelos/api-kit').getRouter()
const upload = require('../middleware/upload');
const { getStorageById } = require('../controllers/storage');
const {
  getStorageAssets,
  removeStorageAsset,
  verifyIdentifier,
  uploadStorageAssets,
  renameStorageAssets
} = require('../controllers/assets');
const { populateUser, verifyUser } = require("@qelos/api-kit");
const editorCheck = require("../middleware/editor-check");

const AUTH_MIDDLEWARES = [populateUser, verifyUser, editorCheck]

router
  .get('/api/assets/:storageId', [...AUTH_MIDDLEWARES, getStorageById, getStorageAssets])
  .post('/api/assets/:storageId', [...AUTH_MIDDLEWARES, getStorageById, verifyIdentifier, upload.any(), uploadStorageAssets])
  .put('/api/assets/:storageId', [...AUTH_MIDDLEWARES, getStorageById, verifyIdentifier, renameStorageAssets])
  .delete('/api/assets/:storageId', [...AUTH_MIDDLEWARES, getStorageById, verifyIdentifier, removeStorageAsset]);

module.exports = router