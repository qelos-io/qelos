const isProduction = process.env.NODE_ENV === 'production';

const httpAgent = isProduction ?
  new (require('node:https').Agent)({
    rejectUnauthorized: false,
  })
  : undefined

export default httpAgent;