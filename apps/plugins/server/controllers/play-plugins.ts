import Plugin, {IPlugin} from '../models/plugin';
import {getPluginAccessToken, refreshTokenForPlugin} from '../services/tokens-management';
import {registerToPlugin} from '../services/manifests-service';

export async function getPluginProxy({tenant, apiPath}): Promise<Pick<IPlugin, 'token' | 'proxyUrl'> | null> {
  const [plugin, token] = await Promise.all([
    Plugin.findOne({tenant, apiPath}).select('token proxyUrl authAcquire').lean(),
    getPluginAccessToken(tenant, apiPath)
  ]);

  if (!plugin) {
    return null;
  }

  let accessToken = token || plugin.token;

  if (!accessToken) {
    try {
      accessToken = await refreshTokenForPlugin(tenant, apiPath, plugin.authAcquire);
    } catch {
      // should sign in / sign up and retrieve new token
    }
  }

  return {token: accessToken, proxyUrl: plugin.proxyUrl};
}
