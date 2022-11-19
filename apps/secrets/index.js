
require('./server/routes')

require('@qelos/api-kit')
  .start('Secrets Service',
    process.env.PORT || 9002,
    process.env.IP || '127.0.0.1')

