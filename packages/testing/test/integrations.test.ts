import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as adminModule from '@qelos/sdk/administrator';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';

// tsx loads the SDK as CommonJS: the class sits on `default` (twice, depending on the loader)
const loaded: any = adminModule;
const Admin: new (options: any) => any = loaded.default?.default ?? loaded.default ?? loaded;

const personas = [
  { _id: 'a1', email: 'admin@x.com', roles: ['admin'] },
  { _id: 'p1', email: 'plugin@x.com', roles: ['plugin'] },
  { _id: 'u1', email: 'user@x.com', roles: ['user'] },
];

/** an administrator SDK acting as `admin@x.com` until `as()` picks another persona */
function setup(seed: object = {}) {
  const mock = createMockQelos({ logger: () => {}, seed: { personas, ...seed } });
  let persona = 'admin@x.com';
  const sdk = new Admin({ appUrl: 'http://qelos.mock', fetch: mock.fetch, extraHeaders: async () => ({ [PERSONA_HEADER]: persona }) });
  return { sdk, as: (email: string) => void (persona = email), mock };
}

const refused = (promise: Promise<unknown>, text: RegExp) => assert.rejects(promise, text);

async function connections(sdk: any) {
  const qelos = await sdk.integrationSources.create({ name: 'qelos', kind: 'qelos', labels: [], metadata: {}, authentication: {} });
  const openai = await sdk.integrationSources.create({ name: 'openai', kind: 'openai', labels: ['ai'], metadata: { defaultModel: ' gpt ' }, authentication: { token: 'sk-secret' } });
  return { qelos, openai };
}

describe('connections', () => {
  test('are created with validated settings and never answer or keep their secrets', async () => {
    const { sdk, mock } = setup();
    const { openai } = await connections(sdk);
    assert.equal('authentication' in openai, false);
    assert.deepEqual([openai.metadata.defaultModel, openai.metadata.apiUrl, openai.user], ['gpt', null, 'a1']);
    assert.deepEqual((await sdk.integrationSources.getList({ kind: 'openai' })).map((c: any) => c.name), ['openai']);
    assert.equal((await sdk.integrationSources.getIntegrationSource(openai._id)).name, 'openai');
    assert.equal(JSON.stringify(mock.state.snapshot()).includes('sk-secret'), false);

    await refused(sdk.integrationSources.create({ name: 'x', kind: 'sumit', metadata: {}, authentication: {} }), /companyId is required/);
    await refused(sdk.integrationSources.create({ name: 'x', kind: 'paypal', metadata: { clientId: 'c' }, authentication: {} }), /could not create integration source/);

    const renamed = await sdk.integrationSources.update(openai._id, { name: 'main' });
    assert.deepEqual([renamed.name, renamed.labels], ['main', ['ai']]);
    await sdk.integrationSources.remove(openai._id);
    await refused(sdk.integrationSources.getIntegrationSource(openai._id), /./);
  });

  test('status checks answer without calling a provider', async () => {
    const { sdk } = setup({ connections: [{ _id: 'c'.repeat(24), name: 'pulled', kind: 'openai', metadata: {}, authentication: { $var: 'OPENAI_KEY' } }] });
    const { openai } = await connections(sdk);
    for (const id of [openai._id, 'c'.repeat(24)]) {
      assert.equal((await sdk.integrationSources.checkStatus(id)).status, 'connected');
    }
    await refused(sdk.integrationSources.checkDraftStatus({ kind: 'openai', metadata: {} }), /Missing API token/);
    assert.equal((await sdk.integrationSources.checkDraftStatus({ kind: 'n8n', metadata: {} })).status, 'unsupported');
  });
});

describe('integrations', () => {
  test('connect two connections, keeping only the details their operations know', async () => {
    const { sdk } = setup();
    const { qelos, openai } = await connections(sdk);
    const integration = await sdk.integrations.create({
      trigger: { source: qelos._id, operation: 'webhook', details: { source: 's', kind: 'k', eventName: 'e', other: 1 } },
      target: { source: openai._id, operation: 'chatCompletion', details: { model: 'gpt' } },
      dataManipulation: [{ map: { a: '.b' } }],
    });
    assert.deepEqual([integration.kind, integration.active, integration.user], [['qelos', 'openai'], false, 'a1']);
    assert.deepEqual(integration.trigger.details, { source: 's', kind: 'k', eventName: 'e' });
    // as stored by the service, empty objects are left out
    assert.deepEqual([integration.dataManipulation[0].map, 'populate' in integration.dataManipulation[0]], [{ a: '.b' }, false]);

    assert.equal((await sdk.integrations.getList({ kind: 'openai', active: false })).length, 1);
    assert.equal((await sdk.integrations.getList({ active: true })).length, 0);
    assert.equal((await sdk.integrations.getList({ source: openai._id })).length, 1);
    assert.equal((await sdk.integrations.update(integration._id, { active: true })).active, true);
    assert.equal((await sdk.integrations.getIntegration(integration._id)).active, true);

    await refused(
      sdk.integrations.create({ trigger: { source: qelos._id, operation: 'webhook', details: {} }, target: integration.target }),
      /must contain relevant details: source,kind,eventName/,
    );
    await refused(sdk.integrations.update(integration._id, { target: { source: 'missing', operation: 'chatCompletion' } }), /target source not found/);
    await sdk.integrations.remove(integration._id);
    assert.deepEqual(await sdk.integrations.getList(), []);
  });

  test('agents and integrations are the same documents', async () => {
    const { sdk } = setup();
    const { qelos, openai } = await connections(sdk);
    const created = await sdk.integrations.create({
      trigger: { source: qelos._id, operation: 'chatCompletion', details: { name: 'Helper' } },
      target: { source: openai._id, operation: 'chatCompletion', details: {} },
      active: true,
    });
    const agent = await sdk.ai.agents.create({ name: 'Writer', triggerSource: qelos._id, targetSource: openai._id });
    assert.deepEqual((await sdk.ai.agents.list()).map((a: any) => a.name).sort(), ['Helper', 'Writer']);
    assert.equal((await sdk.integrations.getList({ kind: 'openai', 'trigger.source': qelos._id })).length, 2);
    assert.equal((await sdk.integrations.getIntegration(agent._id)).trigger.details.name, 'Writer');

    await sdk.ai.agents.update(created._id, { name: 'Renamed' });
    assert.equal((await sdk.integrations.getIntegration(created._id)).trigger.details.name, 'Renamed');
    assert.match((await sdk.ai.agents.chat(created._id, 'hi')).choices[0].message.content, /hi/);
    await sdk.integrations.remove(agent._id);
    assert.equal((await sdk.ai.agents.list()).length, 1);
  });

  test('are for administrators and plugins', async () => {
    const { sdk, as } = setup();
    as('plugin@x.com');
    assert.deepEqual(await sdk.integrations.getList(), []);
    assert.deepEqual(await sdk.integrationSources.getList(), []);
    as('user@x.com');
    await refused(sdk.integrations.getList(), /./);
    await refused(sdk.integrationSources.getList(), /./);
  });
});

describe('functions', () => {
  const seed = {
    connections: [
      { _id: 'aws1', name: 'aws', kind: 'aws', metadata: { region: 'r', accessKeyId: 'k' } },
      { _id: 'cf1', name: 'cf', kind: 'cloudflare', metadata: { accountId: 'a' } },
      { _id: 'ai1', name: 'ai', kind: 'openai', metadata: {} },
    ],
  };

  test('are created, read, changed and removed per connection', async () => {
    const { sdk, as } = setup(seed);
    const lambdas = sdk.manageLambdas;
    const created = await lambdas.create('aws1', { name: 'hello', runtime: 'nodejs22.x', handler: 'index.handler', code: 'ignored' });
    assert.deepEqual(created, { name: 'hello', runtime: 'nodejs22.x', handler: 'index.handler' });
    assert.equal((await lambdas.update('aws1', 'hello', { timeout: 10 })).timeout, 10);
    assert.deepEqual((await lambdas.getList('aws1')).map((f: any) => f.name), ['hello']);
    await refused(lambdas.create('aws1', { name: 'hello', runtime: 'nodejs22.x' }), /Error creating function/);
    await lambdas.remove('aws1', 'hello');
    await refused(lambdas.getLambda('aws1', 'hello'), /Error getting function/);

    assert.deepEqual(await lambdas.create('cf1', { name: 'worker', code: 'export default {}' }), { name: 'worker', code: 'export default {}', runtime: 'javascript' });
    await refused(lambdas.create('cf1', { name: 'Not Valid' }), /Invalid Cloudflare worker name/);
    await refused(lambdas.getList('ai1'), /Unsupported source kind/);
    await refused(lambdas.getList('nope'), /Source not found/);

    as('plugin@x.com');
    await refused(lambdas.getList('aws1'), /./);
  });
});

describe('plugins', () => {
  test('are managed by administrators, with limited details for everyone else', async () => {
    const { sdk, as } = setup();
    const plugin = await sdk.managePlugins.create({ name: 'My Plugin!', token: 'secret', proxyUrl: 'http://p', microFrontends: [{ name: 'page' }] });
    assert.match(plugin.apiPath, /^my-plugin-\w{4}$/);
    assert.deepEqual([plugin.token, plugin.microFrontends[0].active, plugin.authAcquire.accessTokenKey, plugin.cruds], ['secret', true, 'access_token', []]);

    const [listed] = await sdk.managePlugins.getList();
    assert.deepEqual([listed.proxyUrl, 'token' in listed], ['http://p', false]);
    assert.equal((await sdk.managePlugins.update(plugin._id, { apiPath: 'a/b' })).apiPath, 'a:b');
    await refused(sdk.managePlugins.create({ name: 'other', apiPath: 'a:b' }), /api path already taken/);

    as('user@x.com');
    const [limited] = await sdk.managePlugins.getList();
    assert.deepEqual([limited.name, 'proxyUrl' in limited], ['My Plugin!', false]);
    await refused(sdk.managePlugins.getById(plugin._id), /./);
    // `remove` does not throw on a refusal; nothing is removed
    await sdk.managePlugins.remove(plugin._id);
    as('plugin@x.com');
    assert.equal((await sdk.managePlugins.getById(plugin._id)).name, 'My Plugin!');
    await refused(sdk.managePlugins.update(plugin._id, { name: 'x' }), /./);

    as('admin@x.com');
    await sdk.managePlugins.remove(plugin._id);
    assert.deepEqual(await sdk.managePlugins.getList(), []);
  });

  test('a pulled plugin is listed without credentials', async () => {
    const qelos = createMockQelos({ logger: () => {}, seed: { personas, plugins: [{ _id: 'x', name: 'p', apiPath: 'p', token: 't', auth: { a: 1 } }] } });
    for (const email of ['admin@x.com', 'user@x.com']) {
      const [plugin] = (await (await qelos.fetch('/api/plugins', { headers: { [PERSONA_HEADER]: email } })).json()) as any[];
      assert.deepEqual(['token' in plugin, 'auth' in plugin], [false, false], email);
    }
  });
});
