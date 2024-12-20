import { cacheManager } from './cache-manager';
import { fetchPlugin } from './plugins-call';
import logger from './logger';
import { getSecret, setSecret } from './secrets-service';

export function getRefreshSecret(tenant: string, apiPath: string): Promise<{ value: string }> {
  logger.log('get refresh secret for ', tenant, apiPath)
  return getSecret(tenant, `refresh-token-${tenant}-${apiPath}`)
}

export function setRefreshSecret(tenant: string, apiPath: string, refreshToken: string) {
  logger.log('set refresh secret for ', tenant, apiPath)
  logger.log('refresh has valid value??', !!refreshToken)
  return setSecret(tenant, `refresh-token-${tenant}-${apiPath}`, refreshToken)
}

export function storeOAuthPayloadForPlugin(tenant: string, apiPath: string, payload, authAcquire) {
  const newRefreshToken = payload[authAcquire.refreshTokenKey];
  const accessToken = payload[authAcquire.accessTokenKey];

  setRefreshSecret(tenant, apiPath, newRefreshToken).catch();
  cacheManager.setItem(`plugins:${tenant}-${apiPath}:access-token`, accessToken, { ttl: 60000 }).catch()

  return accessToken;
}

export async function refreshTokenForPlugin(tenant: string, apiPath: string, authAcquire): Promise<string> {
  logger.log('refresh token for plugin', { tenant, apiPath })
  const refreshToken = (await getRefreshSecret(tenant, apiPath)).value;
  let tokensPayload;
  if (refreshToken && authAcquire?.refreshTokenUrl) {
    const res = await fetchPlugin({
      url: authAcquire.refreshTokenUrl,
      method: 'POST',
      tenant,
      accessToken: refreshToken,
    })
    if (res.status === 200) {
      tokensPayload = await res.json();
    }
  }

  if (!tokensPayload) {
    const msg = 'refresh token does not exist on secrets for plugin ' + tenant + ':' + apiPath;
    logger.error(msg, { hadRefreshToken: !!refreshToken });
    throw new Error(msg);
  }

  const accessToken = storeOAuthPayloadForPlugin(tenant, apiPath, tokensPayload, authAcquire);
  return accessToken;
}

export function getPluginAccessToken(tenant: string, apiPath: string) {
  return cacheManager.getItem(`plugins:${tenant}-${apiPath}:access-token`).catch(() => null)
}

export function clearPluginAccessToken(tenant: string, apiPath: string) {
  return cacheManager.setItem(`plugins:${tenant}-${apiPath}:access-token`, '', { ttl: 1 }).catch()
}

export async function getPluginToken(plugin: {
  tenant: string,
  apiPath: string,
  authAcquire?,
  token?
}): Promise<string> {
  return (await getPluginAccessToken(plugin.tenant, plugin.apiPath).catch(() => null)) ||
    (await refreshTokenForPlugin(plugin.tenant, plugin.apiPath, plugin.authAcquire).catch(() => null)) ||
    plugin.token
}