import { join } from 'path';

const config = {
  port: process.env.PORT || 1086,
  host: process.env.HOST || '0.0.0.0',
  dev: process.env.NODE_ENV !== 'production',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  userPayloadSecret: process.env.USER_PAYLOAD_SECRET,
  qelosUrl: process.env.QELOS_URL,
  qelosUsername: process.env.QELOS_USERNAME,
  qelosPassword: process.env.QELOS_PASSWORD,
  staticFrontend: {
    root: join(process.cwd(), process.env.STATIC_ROOT || 'public'),
    prefix: process.env.STATIC_PREFIX || '/',
  }
};

export type ConfigOptions = Partial<typeof config>;

export function setConfig(appConfig: ConfigOptions) {
  Object.assign(config, appConfig);
}

export default config;
