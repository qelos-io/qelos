const app = require('@qelos/api-kit').app()

require('./configurations')(app);
require('./blocks')(app);
require('./tenants-configurations')(app);
