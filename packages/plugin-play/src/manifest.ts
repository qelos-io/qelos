const pkg = require(process.cwd() + '/package.json');

export const manifest = {
  name: pkg.name,
  description: pkg.description,
  appUrl: process.env.APP_URL || '',
  apiPath: pkg.name,
  manifestUrl: '/api/play-manifest',
  registerUrl: '/api/register',
  callbackUrl: '/api/callback',
  authorizeUrl: '/api/authorize',
  unAuthorizeUrl: '/api/un-authorize',
  proxyPath: '/api/play',
  proxyUrl: '',
  subscribedEvents: [],
  navBarGroups: [],
  microFrontends: [],
  authAcquire: {
    refreshTokenUrl: '/api/token/refresh',
    refreshTokenKey: 'refresh_token',
    accessTokenKey: 'access_token'
  },
};

export type NavBarGroup = { key: string, name: string, iconName?: string, iconSvg?: string, priority?: number };

export type ManifestOptions =
  Partial<typeof manifest>
  & { appUrl?: string, navBarGroups?: NavBarGroup[] };

export default manifest;
