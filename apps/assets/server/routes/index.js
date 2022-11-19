const app = require('@qelos/api-kit').app()
const {verifyUser, populateUser} = require('@qelos/api-kit')

const editorCheck = require('../middleware/editor-check')

app.use(populateUser, verifyUser, editorCheck);
require('./assets')
require('./storage')
