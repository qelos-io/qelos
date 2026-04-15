const app = require('@qelos/api-kit').app()
const { errorHandler } = require('@qelos/api-kit')

require('./configurations')(app);
require('./blocks')(app);
require('./tenants-configurations')(app);

app.use(errorHandler)
