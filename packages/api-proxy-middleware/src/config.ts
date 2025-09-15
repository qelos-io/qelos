import { IApiProxyConfig, IServiceProxyConfig } from './types';

function getProxies(envVar: string = '', defaults: Array<string> = []) {
  return envVar ? envVar.split(',') : defaults;
}

function getServiceFromEnvVars(
  name: string,
  prefix: string,
  { port, proxies }: Partial<IServiceProxyConfig>
): IServiceProxyConfig {
  return {
    name,
    protocol: process.env[`${prefix}_PROTOCOL`] || 'http',
    url: process.env[`${prefix}_URL`] || '127.0.0.1',
    port: process.env[`${prefix}_PORT`] || port,
    proxies: getProxies(process.env[`${prefix}_PROXIES`], proxies),
  };
}

export function getApiProxyConfig(): IApiProxyConfig {
  return {
    tenant: process.env.BASIC_TENANT || '0',
    applicationUrl: process.env.APPLICATION_URL || 'http://127.0.0.1:3000',
    internalUrl: process.env.INTERNAL_URL || 'http://127.0.0.1:3000',
    excludedServices: [],
    contentService: getServiceFromEnvVars('content', 'CONTENT_SERVICE', {
      port: 9001,
      proxies: [
        '/api/blocks',
        '/api/configurations',
        '/api/tenants-configurations',
      ],
    }),
    authService: getServiceFromEnvVars('auth', 'AUTH_SERVICE', {
      port: 9000,
      proxies: [
        '/api/signin',
        '/api/signup',
        '/api/token',
        '/api/me',
        '/api/users',
        '/api/logout',
        '/api/invites',
        '/api/workspaces',
        '/api/auth'
      ],
    }),
    assetsService: getServiceFromEnvVars('assets', 'ASSETS_SERVICE', {
      port: 9003,
      proxies: ['/api/assets', '/api/storage', '/api/upload'],
    }),
    noCodeService: getServiceFromEnvVars('no-code', 'NO_CODE_SERVICE', {
      port: 9004,
      proxies: ['/api/blueprints', '/api/components', '/api/static'],
    }),
    adminPanel: getServiceFromEnvVars('admin', 'ADMIN_PANEL', { port: 3001, proxies: ['/'] }),
    draftsService: getServiceFromEnvVars('drafts', 'DRAFTS_SERVICE', { port: 9005, proxies: ['/api/drafts'] }),
    pluginsService: getServiceFromEnvVars('plugins', 'PLUGINS_SERVICE', {
      port: 9006,
      proxies: ['/api/plugins', '/api/on', '/api/events', '/api/integrations', '/api/integration-sources'],
    }),
    aiService: getServiceFromEnvVars('ai', 'AI_SERVICE', {
      port: 9007,
      proxies: ['/api/ai'],
    }),
  };
}
