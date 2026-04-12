const app = require('@qelos/api-kit').app()
const { errorHandler } = require('@qelos/api-kit')

app.use(require('./assets'))
app.use(require('./storage'))
app.use(require('./upload'))

app.use(errorHandler)
