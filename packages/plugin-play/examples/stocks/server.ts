import {start, addMicroFrontend, addEndpoint} from '../../src';
import {join} from 'path';

let stocks = ['GOOGL', 'META']

addMicroFrontend({
  name: 'Stocks',
  url: 'index.html',
  description: 'My Stocks',
  route: {
    name: 'Stocks',
    path: 'stocks',
    navBarPosition: 'top',
  },
});

addEndpoint('/api/get', {
  async handler(req) {
    return stocks
  }
})

addEndpoint('/api/set', {
  method: 'POST',
  async handler(req) {
    const body: any = req.body || stocks;
    if(body instanceof Array) {
      stocks = body;
    }
    return stocks;
  }
})

start({
  manifest: {
    name: '@examples/stocks',
    apiPath: '@examples:stocks'
  },
  config: {
    port: '1087',
    accessTokenSecret: 'demo-secret',
    refreshTokenSecret: 'refresh-token-secret',
    greenpressUrl: 'http://localhost:3000',
    greenpressUsername: 'test@test.com',
    greenpressPassword: 'admin',
    staticFrontend: {
      root: join(__dirname, 'public'),
      prefix: '/'
    }
  },
});
