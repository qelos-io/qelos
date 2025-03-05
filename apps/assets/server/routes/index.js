const app = require('@qelos/api-kit').app()

app.use(require('./assets'))
app.use(require('./storage'))