const router = require('@qelos/api-kit').getRouter()
const {
  getStorageById,
  createStorage,
  getStorageList,
  removeStorage,
  updateStorage,
  getStorage
} = require('../controllers/storage')
const { populateUser, verifyUser } = require("@qelos/api-kit");
const editorCheck = require("../middleware/editor-check");

const AUTH_MIDDLEWARES = [populateUser, verifyUser, editorCheck]

router
  .get('/api/storage', [...AUTH_MIDDLEWARES, getStorageList])
  .post('/api/storage', [...AUTH_MIDDLEWARES, createStorage])
  .get('/api/storage/:storageId', [...AUTH_MIDDLEWARES, getStorageById, getStorage])
  .put('/api/storage/:storageId', [...AUTH_MIDDLEWARES, getStorageById, updateStorage])
  .delete('/api/storage/:storageId', [...AUTH_MIDDLEWARES, getStorageById, removeStorage])

module.exports = router