import express, {Express} from 'express';

import type {ApiConfig, BodyParserType} from './types';
import shutdown from './shutdown';


export const config = (updatedConfig = config): ApiConfig => {
  _config = {..._config, ...updatedConfig};
  return config;
}
export const app = () => _app || createApp();
export const start = startApp;

let _app: Express;
let _config: ApiConfig = {
  cors: !!process.env.API_CORS || false,
  bodyParser: (process.env.API_BODY_PARSER as BodyParserType) || 'json',
  showLogs: !!process.env.SHOW_LOGS,
  port: process.env?.PORT || '3000',
  ip: process.env.IP || '127.0.0.1'
};

function createApp() {
  _app = express()

  configureApp(_app);

  return _app;
}

function configureApp(app: Express) {
  if (process.env.NODE_ENV !== 'production') {
    app.use(require('morgan')('combined'))
    app.get('/api/shutdown', () => {
      shutdown()
    })
  } else if (_config.showLogs) {
    app.use(require('morgan')('combined'));
  }
  if (_config.cors) {
    app.use(require('cors')())
  }
  if (_config.bodyParser) {
    app.use(express[_config.bodyParser]())
  }
}

function startApp(serviceName = 'APP', port = _config.port, ip = _config.ip): Promise<void> {
  return new Promise((resolve) => {
    _app.listen(parseInt(port as string), ip, () => {
      console.log(`${serviceName} is running on port ${port}`);
      if (_config.showLogs) {
        console.log('logs are available');
      }
      resolve();
    });
  })
}

