const app = require('@qelos/api-kit').app()
const internalCheck = require('../middleware/internal-call-check')

app.use(internalCheck)

app
  .post('/api/secrets/get', require('../controllers/get'))
  .post('/api/secrets/set', require('../controllers/set'))
