const app = require('@qelos/api-kit').app()

require('./configurations')(app);
require('./menus')(app);
require('./blocks')(app);
require('./layouts')(app);
