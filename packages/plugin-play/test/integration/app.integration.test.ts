import '../helpers/production-env';
import { after, before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getApp, registerToHook } from '../../src/app';
import { setConfig } from '../../src/config';
import { addEndpoint, addProxyEndpoint } from '../../src/endpoints';
import { addInjectable } from '../../src/injectables';
import { onManifest } from '../../src/handlers';
import { on, LifecycleEvent } from '../../src/lifecycle';
import manifest from '../../src/manifest';
import { fakeTenant, type FakeTenant } from '../helpers/fake-tenant';
import { accessToken, proxyHeaders, secrets, tenantPayload } from '../helpers/tokens';

/** How the pieces compose into one Fastify app: manifest, hooks, endpoints, static frontend, lifecycle events. */
let own: FakeTenant;
const manifestCalls: unknown[] = [];
const hookCalls: Array<{ body: any; tenant: any }> = [];
const lifecycle: string[] = [];

before(async () => {
  own = await fakeTenant();
  const staticRoot = mkdtempSync(join(tmpdir(), 'qelos-plugin-static-'));
  writeFileSync(join(staticRoot, 'index.html'), '<h1>plugin frontend</h1>');
  setConfig({ ...secrets, dev: false, qelosUrl: own.url, qelosUsername: 'plugin', qelosPassword: 'pw', staticFrontend: { root: staticRoot, prefix: '/' } });

  on(LifecycleEvent.beforeCreate, () => lifecycle.push('beforeCreate'));
  on(LifecycleEvent.beforeMount, () => lifecycle.push('beforeMount'));
  on(LifecycleEvent.mounted, () => lifecycle.push('mounted'));

  addInjectable({ name: 'banner', html: '<b>hello</b>' });
  onManifest((request) => manifestCalls.push(request.headers['x-probe']));
  registerToHook({ source: 'orders', kind: 'webhook', eventName: 'paid' }, async (req) => {
    hookCalls.push({ body: req.body, tenant: (req as any).tenantPayload });
    return { received: true };
  });
  addEndpoint('/open', { verifyToken: false, handler: async () => ({ open: true }) });
  addEndpoint('/secured', { verifyToken: true, handler: async () => ({ secured: true }) });
  addProxyEndpoint('/mine', { handler: async (req) => ({ user: (req as any).user?.email, tenant: (req as any).tenantPayload?.sub }) });
  await getApp().ready();
});

after(() => own.close());

const json = (res: { body: string }) => JSON.parse(res.body);

describe('lifecycle events', () => {
  test('fire in order while the app is created', () => {
    assert.deepEqual(lifecycle, ['beforeCreate', 'beforeMount', 'mounted']);
  });
});

describe('the manifest route', () => {
  test('serves the manifest with open CORS', async () => {
    const res = await getApp().inject({ method: 'GET', url: '/api/play-manifest' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['access-control-allow-origin'], '*');
    const body = json(res);
    assert.equal(body.name, manifest.name);
    assert.equal(body.manifestUrl, '/api/play-manifest');
    assert.deepEqual(body.injectables, [{ name: 'banner', html: '<b>hello</b>' }]);
  });

  test('tells the onManifest handlers about the request, after answering it', async () => {
    await getApp().inject({ method: 'GET', url: '/api/play-manifest', headers: { 'x-probe': 'p1' } });
    for (let i = 0; i < 50 && !manifestCalls.includes('p1'); i++) await new Promise((r) => setTimeout(r, 10));
    assert.ok(manifestCalls.includes('p1'));
  });

  test('lists the subscribed events with the url of their hook', () => {
    const subscribed: any = manifest.subscribedEvents.find((e: any) => e.source === 'orders');
    assert.deepEqual({ kind: subscribed.kind, eventName: subscribed.eventName }, { kind: 'webhook', eventName: 'paid' });
    assert.match(subscribed.hookUrl, /\/api\/hooks\//);
  });
});

describe('event hooks', () => {
  const hookUrl = () => new URL((manifest.subscribedEvents.find((e: any) => e.source === 'orders') as any).hookUrl).pathname;

  test('call the handler for a request with a valid access token', async () => {
    const res = await getApp().inject({ method: 'POST', url: hookUrl(), headers: proxyHeaders(), payload: { order: 7 } });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(json(res), { received: true });
    assert.deepEqual(hookCalls.at(-1)!.body, { order: 7 });
    assert.equal(hookCalls.at(-1)!.tenant.sub, tenantPayload.sub);
  });

  test('reject a request without one', async () => {
    const before = hookCalls.length;
    const res = await getApp().inject({ method: 'POST', url: hookUrl(), payload: { order: 8 } });
    assert.notEqual(res.statusCode, 200);
    assert.equal(hookCalls.length, before);
  });

  test('reject a token signed with another secret with 407 and x-q-auth', async () => {
    const forged = accessToken(tenantPayload, 'another-secret');
    const res = await getApp().inject({ method: 'POST', url: hookUrl(), headers: { authorization: `Bearer ${forged}` }, payload: {} });
    assert.equal(res.statusCode, 407);
    assert.equal(res.headers['x-q-auth'], 'unauthorized');
  });
});

describe('endpoints', () => {
  test('a public endpoint answers without any token', async () => {
    const res = await getApp().inject({ method: 'GET', url: '/open' });
    assert.deepEqual(json(res), { open: true });
  });

  test('a secured endpoint outside the proxy path needs the session cookie', async () => {
    const res = await getApp().inject({ method: 'GET', url: '/secured' });
    assert.notEqual(res.statusCode, 200);
    assert.match(res.body, /authorization code was not provided/);
  });

  test('a proxy endpoint needs the access token from the gateway and sees its user and tenant', async () => {
    const denied = await getApp().inject({ method: 'GET', url: '/api/play/mine' });
    assert.notEqual(denied.statusCode, 200);
    const res = await getApp().inject({ method: 'GET', url: '/api/play/mine', headers: proxyHeaders() });
    assert.deepEqual(json(res), { user: 'ada@example.com', tenant: tenantPayload.sub });
  });

  test('an unknown path answers 404', async () => {
    const res = await getApp().inject({ method: 'GET', url: '/api/play/nothing-here' });
    assert.equal(res.statusCode, 404);
  });
});

describe('static frontend', () => {
  test('serves the files of the configured folder', async () => {
    const res = await getApp().inject({ method: 'GET', url: '/index.html' });
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /plugin frontend/);
  });
});
