import { start } from '../../../src/index.ts' // Using local source
import './endpoints'

start({
  manifest: {
    name: process.env.PLUGIN_NAME || 'api-demo',
    description: 'api plugin for qelos',
    appUrl: process.env.APP_URL || 'http://127.0.0.1:2040',
    apiPath: process.env.API_PATH || 'api-demo-path',
  },
  config: {
    port: Number(process.env.PORT || '2040'),
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || 'demo-secret',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'refresh-token-secret',
    qelosUrl: process.env.QELOS_URL || 'http://localhost:3000',
    qelosUsername: process.env.QELOS_USER || 'test@test.com',
    qelosPassword: process.env.QELOS_PASSWORD || 'admin',
    sdkOptions: {
      forceRefresh: true,
      extraQueryParams: () => ({ bypassAdmin: ''})
    }
  },
});
