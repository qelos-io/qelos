import {start, addEndpoint, getSdk, addMicroFrontend} from '@qelos/plugin-play'

addMicroFrontend({
  name: 'Demo Plugin UI',
  description: 'Description for the user',
  url: '/index.html',
  roles: ['*'],
  route: {
    name: 'example',
    path: 'example',
    navBarPosition: 'top'
  }
})

addEndpoint('/api/example', {
  method: 'GET',
  async handler(req) {
    return {
      user: req.user,
      tenant: req.tenantPayload,
      blocks: await getSdk().blocks.getAll()
    };
  }
})

start({
  manifest: {
    description: 'Description for the entire app',
    appUrl: process.env.APP_URL || 'https://127.0.0.1:2040'
  },
  config: {
    port: process.env.PORT || '2040',
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || 'demo-secret',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'refresh-token-secret',
    qelosUrl: process.env.QELOS_URL || 'http://localhost:3000',
    qelosUsername: process.env.QELOS_USER || 'test@test.com',
    qelosPassword: process.env.QELOS_PASSWORD || 'admin',
  },
});
