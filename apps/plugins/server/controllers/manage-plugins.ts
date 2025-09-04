import Plugin from '../models/plugin';
import { clearPluginAccessToken, getPluginToken, setRefreshSecret } from '../services/tokens-management';
import { enrichPluginWithManifest, registerToPlugin } from '../services/manifests-service';
import { removeUser } from '../services/users';
import { fetchPlugin } from '../services/plugins-call';
import logger from '../services/logger';
import { isDev } from '../../config';

const protocol = isDev ? 'http://' : 'https://';

export function getAllPlugins(req, res) {
  const select = req.user?.hasPluginPrivileges ? '-token -auth' : 'name description apiPath callbackUrl microFrontends injectables navBarGroups cruds'
  Plugin
    .find({ tenant: req.headers.tenant })
    .select(select).lean().exec()
    .then(list => {
      console.log('get plugins for', req.headers.tenant, list)
      res.json(list).end();
    })
    .catch(() => {
      res.status(500).json({ message: 'could not get plugins' }).end();
    })
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
  const { tenant, token, auth, hardReset = true, ...allowedChanges } = req.body;
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

    res.json(plugin).end();
    if (newRefreshToken) {
      setRefreshSecret(tenant, plugin.apiPath, newRefreshToken).catch();
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
    const { tenant, token, auth, hardReset = false, ...allowedChanges } = req.body;

    const newRefreshToken = allowedChanges.authAcquire?.refreshToken;
    Object.assign(plugin, allowedChanges);

    if (allowedChanges.microFrontends) {
      logger.log('micro frontends changed', allowedChanges.microFrontends)
      plugin.markModified('microFrontends');
    }
    plugin.encodePath();

    if (newRefreshToken) {
      setRefreshSecret(tenant, plugin.apiPath, newRefreshToken).catch(() => null);
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
  } catch (err: any) {
    res.status(500).json({ message: err?.responseError || 'could not update plugin' }).end();
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
    } else {
      res.status(404).json({ message: 'could not find plugin' }).end();
    }
  } catch {
    res.status(500).json({ message: 'could not remove plugin' }).end();
  }
}
