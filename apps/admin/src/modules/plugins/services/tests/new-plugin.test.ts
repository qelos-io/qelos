import { describe, expect, it } from 'vitest';
import { buildPluginFromStarter, emptyStarterValues, isHttpUrl, pluginFromManifest, proxyPreview, validateStarter } from '../new-plugin';

const values = (patch = {}) => ({ ...emptyStarterValues(), ...patch });

describe('validateStarter', () => {
  it('requires the fields of each starter', () => {
    expect(Object.keys(validateStarter('remote', values()))).toEqual(['manifestUrl']);
    expect(Object.keys(validateStarter('proxy', values())).sort()).toEqual(['apiPath', 'name', 'proxyUrl']);
    expect(Object.keys(validateStarter('events', values())).sort()).toEqual(['hookUrl', 'name']);
    expect(Object.keys(validateStarter('analytics', values())).sort()).toEqual(['html', 'name']);
    expect(Object.keys(validateStarter('manual', values()))).toEqual(['name']);
  });

  it('rejects urls that are not http(s)', () => {
    expect(validateStarter('remote', values({ manifestUrl: 'example.com/m.json' })).manifestUrl).toBeTruthy();
    expect(validateStarter('remote', values({ manifestUrl: 'https://example.com/m.json' }))).toEqual({});
    expect(isHttpUrl('ftp://x')).toBe(false);
  });
});

describe('plugins from starters', () => {
  it('builds a proxy plugin with a clean path and url', () => {
    expect(buildPluginFromStarter('proxy', values({ name: 'Orders', apiPath: 'My Orders', proxyUrl: 'https://api.x.com/', token: ' t ' }))).toEqual({
      name: 'Orders',
      apiPath: 'my-orders',
      proxyUrl: 'https://api.x.com',
      token: 't',
    });
    expect(buildPluginFromStarter('proxy', values({ name: 'a', apiPath: 'a', proxyUrl: 'https://x.y' }))).not.toHaveProperty('token');
  });

  it('builds an event listener, a script and a blank plugin', () => {
    expect(buildPluginFromStarter('events', values({ name: 'E', eventSource: 'auth', hookUrl: 'https://h.io/x' })).subscribedEvents).toEqual([
      { source: 'auth', kind: '', eventName: '', hookUrl: 'https://h.io/x' },
    ]);
    expect(buildPluginFromStarter('analytics', values({ name: 'GA', html: '<script></script>' })).injectables?.[0]).toMatchObject({ name: 'GA', active: true, html: '<script></script>' });
    expect(buildPluginFromStarter('manual', values({ name: ' M ' }))).toEqual({ name: 'M' });
  });

  it('resolves relative manifest urls against appUrl', () => {
    const plugin = pluginFromManifest({ name: 'R', apiPath: 'r', appUrl: 'https://app.io', proxyUrl: '/api', callbackUrl: 'https://c.io/cb', registerUrl: '/register' }, 'https://app.io/m.json');
    expect(plugin).toMatchObject({ hardReset: true, proxyUrl: 'https://app.io/api', callbackUrl: 'https://c.io/cb', registerUrl: 'https://app.io/register', manifestUrl: 'https://app.io/m.json' });
  });

  it('previews the proxy mapping', () => {
    expect(proxyPreview('https://q.io', 'Orders', 'https://api.x.com/')).toEqual({ from: 'https://q.io/api/on/orders/*', to: 'https://api.x.com/*' });
    expect(proxyPreview('https://q.io', '', '')).toEqual({ from: 'https://q.io/api/on/…/*', to: '…/*' });
  });
});
