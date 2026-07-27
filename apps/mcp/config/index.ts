export const internalServicesSecret = process.env.INTERNAL_SECRET || '';
export const authServicePort = process.env.AUTH_SERVICE_PORT || 9000;
export const contentServicePort = process.env.CONTENT_SERVICE_PORT || 9001;
export const gatewayUrl =
  process.env.INTERNAL_URL || process.env.APPLICATION_URL || 'http://127.0.0.1:3000';
export const redisUrl = process.env.REDIS_URL || (process.env.REDIS_HOST ? `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` : undefined);
