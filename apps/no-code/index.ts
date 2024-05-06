import { start } from '@qelos/api-kit';
import { connect } from './server/models';
import { mongoUri } from './config';
import { loadRoutes } from './server/routes';
//
// // connect to the database and load models
connect(mongoUri)
loadRoutes().then(() => {
  start('No-Code Service', process.env.PORT || 9004, process.env.IP || '127.0.0.1')
})
