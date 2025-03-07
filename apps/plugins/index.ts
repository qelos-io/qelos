import { start, config } from '@qelos/api-kit';
import { connect } from './server/models';
import { mongoUri } from './config';
import { loadRoutes } from './server/routes';
//
// // connect to the database and load models
connect(mongoUri)

config({
  bodyParser: null,
})

loadRoutes().then(async () => {
  await import('./server/services/hook-events-subscriber');
  return start('Plugins Service', process.env.PORT || 9006, process.env.IP || '127.0.0.1')
})
