import crypto from 'crypto';
import fetch from 'node-fetch';
import {IPlugin} from '../models/plugin';
import {createUser, getUsers, updateUser} from './users';
import {storeOAuthPayloadForPlugin} from './tokens-management';
import httpAgent from './http-agent';
import {DocumentDefinition} from 'mongoose';
import logger from './logger';

type PluginEnrichOptions = {
  hardReset?: boolean,
  tenant: string,
  host: string,
  appUrl: string
}

function getRandomHash() {
  const currentDate = new Date().valueOf().toString()
  const random = Math.random().toString()
  return crypto.createHash('sha1').update(currentDate + random).digest('hex');
}

export async function loadManifest(manifestUrl: string): Promise<IPlugin & { registerUrl?: string, appUrl?: string }> {
  const res = await fetch(manifestUrl, {
    agent: httpAgent,
  });
  const manifest = await res.json();

  const appUrl = manifest.appUrl;
  if (!appUrl) {
    return manifest;
  }

  return {
    ...manifest,
    manifestUrl: (new URL(manifest.manifestUrl, appUrl)).href,
    registerUrl: (new URL(manifest.registerUrl, appUrl)).href,
    callbackUrl: (new URL(manifest.callbackUrl, appUrl)).href,
    authAcquire: {
      ...manifest.authAcquire,
      refreshTokenUrl: (new URL(manifest.authAcquire.refreshTokenUrl, appUrl)).href,
    }
  };
}

export async function registerToPlugin(plugin: DocumentDefinition<IPlugin>, registerUrl: string, {
  tenant,
  host,
  appUrl
}): Promise<string> {
  const email = `${plugin._id}.${tenant}@${host}`;
  const password = getRandomHash();
  logger.log('register to plugin', {tenant, host, appUrl});
  const [maybeUser] = await getUsers(tenant, {email, exact: true});
  const metadataToStore = {
    email,
    password,
    roles: Array.from(new Set(['plugin'].concat(maybeUser?.roles || []))),
    firstName: plugin.name
  };
  const user = maybeUser ?
    await updateUser(plugin.tenant, maybeUser._id, metadataToStore) :
    await createUser(plugin.tenant, metadataToStore);
  plugin.user = user._id;
  const res = await fetch(registerUrl, {
    method: 'POST',
    body: JSON.stringify({email, password, appUrl}),
    agent: httpAgent,
    headers: {
      'x-tenant': tenant,
      'x-from': 'qelos',
      'Content-Type': 'application/json',
    }
  })
  if (res.status !== 200) {
    (async () => logger.log('could not register to plugin', await res.text()))().catch();
    throw new Error('could not register to plugin');
  }
  const payload = await res.json();

  const accessToken = storeOAuthPayloadForPlugin(tenant, plugin.apiPath, payload, plugin.authAcquire);
  return accessToken;
}

export async function enrichPluginWithManifest(plugin: IPlugin, {
  hardReset = false,
  tenant,
  host,
  appUrl
}: PluginEnrichOptions) {
  if (!plugin.manifestUrl) {
    return plugin;
  }
  const manifest = await loadManifest(plugin.manifestUrl);
  const authAcquire = manifest.authAcquire;
  if (authAcquire) {
    plugin.authAcquire.refreshTokenUrl = authAcquire.refreshTokenUrl || plugin.authAcquire.refreshTokenUrl;
    plugin.authAcquire.accessTokenKey = authAcquire.accessTokenKey || plugin.authAcquire.accessTokenKey;
    plugin.authAcquire.refreshTokenKey = authAcquire.refreshTokenKey || plugin.authAcquire.refreshTokenKey;
  }
  plugin.name = manifest.name || plugin.name;
  plugin.description = manifest.description || plugin.description;

  plugin.injectables = (manifest.injectables || [])
    .filter(item => typeof item?.html === 'string')
    .map(item => {
      const oldIsActive: boolean | undefined = plugin.injectables?.find(old => old.html === item.html)?.active;
      return {
        name: item.name,
        description: item.description,
        html: item.html,
        active: typeof oldIsActive === 'boolean' ? oldIsActive : true,
      };
    })
  plugin.markModified('injectables');

  plugin.microFrontends = manifest.microFrontends?.map(mfe => {
    return {
      ...mfe,
      url: mfe.url.startsWith('http') ? mfe.url : new URL(mfe.url, manifest.appUrl).href,
    }
  });
  plugin.markModified('microFrontends');

  if (hardReset) {
    plugin.apiPath = manifest.apiPath;
    plugin.proxyUrl = manifest.proxyUrl;
    plugin.callbackUrl = manifest.callbackUrl;
    plugin.subscribedEvents = manifest.subscribedEvents;
    if (manifest.registerUrl) {
      plugin.encodePath();
      await registerToPlugin(plugin, manifest.registerUrl, {tenant, host, appUrl});
    }
  }
  return plugin;
}
