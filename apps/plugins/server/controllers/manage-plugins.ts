import Plugin from '../models/plugin';
import { clearPluginAccessToken, getPluginToken, setRefreshSecret } from '../services/tokens-management';
import { enrichPluginWithManifest, registerToPlugin } from '../services/manifests-service';
import { removeUser } from '../services/users';
import { fetchPlugin } from '../services/plugins-call';
import logger from '../services/logger';
import { isDev } from '../../config';
import { cacheManager } from '../services/cache-manager';

const protocol = isDev ? 'http://' : 'https://';

function clearPlugins(tenant: string) {
  cacheManager.setItem(`plugins:${tenant}`, '', {ttl: 1}).catch();  
  cacheManager.setItem(`plugins:${tenant}:full`, '', {ttl: 1}).catch();
  cacheManager.setItem(`plugins:${tenant}:limited`, '', {ttl: 1}).catch();
}

export async function getAllPlugins(req, res) {
  const select = req.user?.hasPluginPrivileges ? '-token -auth' : 'name description apiPath callbackUrl microFrontends injectables navBarGroups cruds';

  const plugins = await cacheManager.wrap(`plugins:${req.headers.tenant}:${req.user?.hasPluginPrivileges ? 'full' : 'limited'}`, async () => {
    const list = await Plugin
      .find({ tenant: req.headers.tenant })
      .select(select).lean().exec()
    return JSON.stringify(list);
  });
  res.set('content-type', 'application/json').send(plugins).end();
}

async function fetchPluginCallback({ headers, plugin, callbackUrl, hard = false }) {
  let accessToken = await getPluginToken({
    tenant: headers.tenant,
    apiPath: plugin.apiPath,
    authAcquire: plugin.authAcquire
  });
  if (!accessToken) {
    if (!hard) {
      return null;
    }
    accessToken = await registerToPlugin(plugin, plugin.registerUrl, {
      tenant: headers.tenant,
      host: headers.tenanthost,
      appUrl: headers.origin
    })
  }
  return fetchPlugin({
    url: callbackUrl.href,
    tenant: headers.tenant,
    accessToken,
    headers: {
      user: headers.user
    }
  })
}

export function redirectToPluginMfe(req, res) {
  const { returnUrl = '' } = req.query || {}
  const headers = { origin: `${protocol}${req.headers.tenanthost}`, ...req.headers };
  headers.user = headers.user || req.user;
  Plugin.getPluginForRedirect(headers.tenant, req.params.pluginId)
    .then(async (plugin) => {
      console.log('plugin', plugin);
      if (!plugin) {
        res.status(404).end();
        return;
      }
      if (plugin.callbackUrl) {
        const callbackUrl = new URL(plugin.callbackUrl);
        callbackUrl.searchParams.append('returnUrl', returnUrl);
        let data, pluginRes;
        try {
          pluginRes = await fetchPluginCallback({ headers, plugin, callbackUrl });
        } catch {
        }
        if (!pluginRes || pluginRes?.status >= 400) {
          await clearPluginAccessToken(headers.tenant, plugin.apiPath);
          pluginRes = await fetchPluginCallback({ headers, plugin, callbackUrl, hard: true });
        }

        data = await pluginRes?.json();

        try {
          const url = data.returnUrl || atob(returnUrl);
          if (headers.accept === 'application/json') {
            res.json({ code: data.code, token: data.token })
          } else {
            res.redirect(302, url);
          }
          if (!data.returnUrl) {
            logger.log('plugin did not resolve a tokenized return url. plugins returned: ', data);
          }
        } catch (err) {
          logger.error('error while redirecting to plugin', err, { data, pluginStatus: pluginRes?.status });
        }
        res.end();
        return;
      }

      res.status(400).set('Content-Type', 'text/html').send('<h1>Try Again</h1>').end()
    })
    .catch((e) => {
      logger.error('error in redirect to mfe', e);
      res.status(500).set('Content-Type', 'text/html').send('<h1>Try Again</h1>').end()
    })
}

export function getPlugin(req, res) {
  const query = { tenant: req.headers.tenant, _id: req.params.pluginId };
  logger.log('get plugin endpoint', query);
  Plugin.findOne(query).select('-token -auth').lean().exec()
    .then(plugin => {
      res.json(plugin).end();
    })
    .catch((e) => {
      logger.error('error to get plugin', query, e)
      res.status(404).json({ message: 'could not find plugin' }).end();
    })
}

export async function createPlugin(req, res) {
  logger.log('request to create plugin', req.headers.tenanthost, req.body);
  const { tenant: _, token, auth, hardReset = true, ...allowedChanges } = req.body;
  const plugin = new Plugin(allowedChanges);
  plugin.tenant = req.headers.tenant;

  const newRefreshToken = allowedChanges.authAcquire?.refreshToken;

  try {
    await plugin.save()
    logger.log('plugin stored', req.headers.tenanthost, plugin)
    const protocolToUse = isDev ? 'http' : 'https';
    await enrichPluginWithManifest(plugin, {
      hardReset,
      tenant: req.headers.tenant,
      host: req.headers.tenanthost,
      apiPath: allowedChanges.apiPath,
      appUrl: new URL(req.headers.tenanthost.startsWith('http') ? req.headers.tenanthost : `${protocolToUse}://${req.headers.tenanthost}`).origin
    });
    logger.log('plugin enriched', req.headers.tenanthost, plugin);
    if (!newRefreshToken && !plugin.manifestUrl && token) {
      plugin.token = token;
    }
    await plugin.save();
    clearPlugins(req.headers.tenant);

    res.json(plugin).end();
    if (newRefreshToken) {
      setRefreshSecret(req.headers.tenant, plugin.apiPath, newRefreshToken).catch();
    }
  } catch (e) {
    logger.error(e);
    if ((e as any).message?.startsWith('E11000 duplicate key error collection')) {
      res.status(403).json({ message: 'api path already taken by another plugin. choose another path.' }).end();
      return;
    }
    res.status(500).json({ message: 'could not create plugin' }).end();
  }
}

export async function updatePlugin(req, res) {
  try {
    const plugin = await Plugin.findOne({ tenant: req.headers.tenant, _id: req.params.pluginId });
    if (!plugin) {
      throw new Error('plugin not found');
    }
    const { tenant: top_p, token, auth, hardReset = false, ...allowedChanges } = req.body;

    const newRefreshToken = allowedChanges.authAcquire?.refreshToken;
    Object.assign(plugin, allowedChanges);

    if (allowedChanges.microFrontends) {
      logger.log('micro frontends changed', plugin._id);
      plugin.markModified('microFrontends');
    }
    plugin.encodePath();

    if (newRefreshToken) {
      setRefreshSecret(req.headers.tenant, plugin.apiPath, newRefreshToken).catch(() => null);
    }

    await enrichPluginWithManifest(plugin, {
      hardReset,
      tenant: req.headers.tenant,
      host: req.headers.tenanthost,
      appUrl: req.headers.origin
    });

    if (token) {
      plugin.token = token;
    }

    await plugin.save();
    res.json(plugin).end();
    clearPlugins(req.headers.tenant);
  } catch (err: any) {
    const manifestInvalid = typeof err?.message === 'string' && err.message.includes('invalid json response body');
    const statusCode = manifestInvalid ? 400 : 500;
    const message = err?.responseError || (manifestInvalid
      ? 'plugin manifest endpoint returned invalid JSON. please verify the manifest URL responds with valid JSON.'
      : 'could not update plugin');
    res.status(statusCode).json({ message }).end();
    logger.log('error while edit plugin', new Error((err as any)?.message || err));
  }
}

export async function removePlugin(req, res) {
  try {
    const tenant = req.headers.tenant;
    const plugin = await Plugin.findOne({
      tenant,
      _id: req.params.pluginId
    }).select('tenant name apiPath').exec();
    if (plugin) {
      setRefreshSecret(tenant, plugin.apiPath, '').catch(() => null);
      await Promise.all([
        plugin.user ? removeUser(tenant, plugin.user) : Promise.resolve(),
        plugin.deleteOne()
      ]);
      res.json(plugin).end();
      clearPlugins(tenant);
    } else {
      res.status(404).json({ message: 'could not find plugin' }).end();
    }
  } catch {
    res.status(500).json({ message: 'could not remove plugin' }).end();
  }
}

export async function getPluginMfe(req, res) {
  const query = { tenant: req.headers.tenant, _id: req.params.pluginId, microFrontends: { $elemMatch: { _id: req.params.mfeId } } };

  const mfe = await cacheManager.wrap(`plugins:${req.headers.tenant}:${req.params.pluginId}:${req.params.mfeId}`, async () => {
    const plugin = await Plugin.findOne(query).select('microFrontends.$').lean().exec()
    const mfe = plugin?.microFrontends?.[0];
    return mfe ? JSON.stringify(mfe) : '';
  });
  if (!mfe) {
    res.status(404).json({ message: 'could not find micro frontend' }).end();
    return;
  }
  res.set('content-type', 'application/json').send(mfe).end();
}