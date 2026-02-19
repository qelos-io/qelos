import { start, config } from '@qelos/api-kit';
import { connect } from './server/models';
import { mongoUri } from './config';
import { loadRoutes } from './server/routes';

// catch any error and print it
process.on('uncaughtException', (err) => {
  console.error(err)
})


config({
  bodyParserOptions: {
    limit: '50mb'
  }
})

connect(mongoUri)

loadRoutes().then(async () => {
  return start('AI Service', process.env.PORT || 9007, process.env.IP || '127.0.0.1')
})
