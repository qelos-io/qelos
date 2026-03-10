import { mongoUri, port } from './config'
import { connect } from './server/models';

connect(mongoUri)

import './server/routes'

require('@qelos/api-kit')
  .start(
    'Payments Service',
    port,
    process.env.IP || '0.0.0.0'
  )
