import { join } from 'path';
import { QelosSDKOptions } from '@qelos/sdk/dist/types';

const port = Number(process.env.PORT || 1086);
const host = process.env.HOST || '0.0.0.0';
const config = {
  port: port,
  internalPort: Number(process.env.INTERNAL_PORT || port + 1),
  host: host,
  internalHost: process.env.INTERNAL_HOST || host,
  dev: process.env.NODE_ENV !== 'production',
  allowedTenants: process.env.ALLOWED_TENANTS?.split(',') || [],
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  userPayloadSecret: process.env.USER_PAYLOAD_SECRET,
  qelosUrl: process.env.QELOS_URL,
  qelosUsername: process.env.QELOS_USERNAME,
  qelosPassword: process.env.QELOS_PASSWORD,
  redisUrl: process.env.REDIS_URL,
  staticFrontend: {
    root: join(process.cwd(), process.env.STATIC_ROOT || 'public'),
    prefix: process.env.STATIC_PREFIX || '/',
  },
  sdkOptions: {} as Partial<QelosSDKOptions>
};

export type ConfigOptions = Partial<typeof config>;

export function setConfig(appConfig: ConfigOptions) {
  Object.assign(config, appConfig);
}

export default config;
