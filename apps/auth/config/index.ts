const TEN_MINUTES = 1000 * 60 * 10;
const THIRTY_MINUTES = TEN_MINUTES * 3;
const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30
export const privilegedRoles = process.env.PRIVILEGED_ROLES ? process.env.PRIVILEGED_ROLES.split(',') : ['admin']

export const roles = process.env.ROLES ? process.env.ROLES.split(',') : ['user', 'plugin', 'admin']

export const mongoUri = process.env.MONGO_URI || 'mongodb://localhost/qelos';
export const cookieBaseDomain = process.env.COOKIE_BASE_DOMAIN ||
  (process.env.APPLICATION_URL ?
    new URL(process.env.APPLICATION_URL).hostname.replace(/www\.|www/, '')
    : null
  );
export const jwtSecret = process.env.JWT_SECRET || 'abcddddd';
export const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'a secret 2 phrase!!';
export const tokenExpiration = process.env.TOKEN_EXPIRATION || '300m';
export const refreshTokenExpiration = process.env.REFRESH_TOKEN_EXPIRATION || '30d';
export const cookieTokenVerificationTime = Number(process.env.COOKIE_TOKEN_VERIFICATION_TIME || THIRTY_MINUTES);
export const processedCookieExpiration = Number(process.env.PROCESSED_COOKIE_EXPIRATION || 30);
export const cookieTokenExpiration = Number(process.env.COOKIE_TOKEN_EXPIRATION || THIRTY_DAYS); // in ms
export const defaultRole = process.env.DEFAULT_ROLE ? process.env.DEFAULT_ROLE : roles[0];
export const defaultAuthType = process.env.DEFAULT_AUTH_TYPE || 'cookie';
export const redisUrl = process.env.REDIS_URL || (process.env.REDIS_HOST ? `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` : undefined);
export const internalServicesSecret = process.env.INTERNAL_SECRET;
export const secretsToken = process.env.SECRETS_TOKEN || process.env.AUTH_SERVICE_SECRET;
export const showLogs = process.env.NODE_ENV !== 'production' || process.env.SHOW_LOGS;
export const basicTenant = process.env.BASIC_TENANT || "0";