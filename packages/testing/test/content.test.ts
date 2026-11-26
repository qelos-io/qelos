import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';

const personas = [
  { email: 'admin@x.com', roles: ['admin'] },
  { email: 'user@x.com', roles: ['user'] },
  { email: 'editor@x.com', roles: ['editor'] },
];
const ID = 'a'.repeat(24);

function setup(seed: Record<string, unknown> = {}, options: object = {}) {
  const mock = createMockQelos({ logger: () => {}, seed: { personas, ...(seed as any) }, ...options });
  const call = async (persona: string | null, method: string, path: string, body?: object) => {
    const res = await mock.fetch(path, {
      method,
      headers: persona ? { [PERSONA_HEADER]: `${persona}@x.com` } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
  };
  return { mock, call };
}

describe('configurations', () => {
  const configurations = [
    { key: 'app-configuration', metadata: { name: 'App' } },
    { key: 'internal', public: false, kind: 'settings', metadata: { secretFlag: true } },
  ];

  test('the list is for administrators and carries no metadata', async () => {
    const { call } = setup({ configurations });
    assert.equal((await call('user', 'GET', '/api/configurations')).status, 401);
    const { body } = await call('admin', 'GET', '/api/configurations');
    assert.deepEqual(body.map((c: any) => [c.key, c.public, 'metadata' in c]), [['app-configuration', true, false], ['internal', false, false]]);
    assert.equal((await call('admin', 'GET', '/api/configurations?public=false')).body.length, 1);
    assert.equal((await call('admin', 'GET', '/api/configurations?key=APP')).body.length, 1);
  });

  test('a configuration without `public` is public; a private one is not found for others', async () => {
    const { call } = setup({ configurations });
    assert.equal((await call('user', 'GET', '/api/configurations/app-configuration')).body.metadata.name, 'App');
    assert.deepEqual(await call('user', 'GET', '/api/configurations/internal'), { status: 404, body: { message: 'configuration not exists' } });
    assert.equal((await call('admin', 'GET', '/api/configurations/internal')).body.kind, 'settings');
  });

  test('administrators create, change and remove them', async () => {
    const { call } = setup({ configurations });
    assert.equal((await call('admin', 'POST', '/api/configurations', { key: 'new' })).body.public, false);
    assert.equal((await call('admin', 'POST', '/api/configurations', { key: 'new' })).status, 409);
    const changed = await call('admin', 'PUT', '/api/configurations/new', { metadata: { a: 1 }, public: true });
    assert.deepEqual([changed.body.metadata, changed.body.public], [{ a: 1 }, false], 'only description and metadata change');
    assert.equal((await call('admin', 'PUT', '/api/configurations/none', { metadata: {} })).status, 404);
    assert.equal((await call('admin', 'DELETE', '/api/configurations/app-configuration')).status, 403);
    assert.equal((await call('admin', 'DELETE', '/api/configurations/new')).body.key, 'new');
  });
});

describe('blocks and blueprints', () => {
  test('anyone reads a block, only editors get more than its content', async () => {
    const { call } = setup({ blocks: [{ _id: ID, name: 'hero', content: '<h1/>' }] });
    assert.deepEqual((await call('user', 'GET', `/api/blocks/${ID}`)).body, { _id: ID, content: '<h1/>' });
    assert.equal((await call('editor', 'GET', `/api/blocks/${ID}`)).body.name, 'hero');
    assert.equal((await call('editor', 'POST', '/api/blocks', { name: 'footer', content: 'f' })).body.contentType, 'content');
    assert.equal((await call('editor', 'POST', '/api/blocks', {})).status, 500);
    assert.deepEqual((await call('editor', 'DELETE', `/api/blocks/${ID}`)).body, { acknowledged: true, deletedCount: 1 });
  });

  test('a blueprint that still has entities cannot be removed', async () => {
    const { call, mock } = setup({ blueprints: [{ identifier: 'todo', name: 'Todo' }], entities: { todo: [{ metadata: {} }] } });
    assert.equal((await call('admin', 'DELETE', '/api/blueprints/todo')).status, 400);
    mock.state.entities.replaceBlueprint('todo', []);
    assert.equal((await call('admin', 'DELETE', '/api/blueprints/todo')).status, 200);
    assert.deepEqual(await call('user', 'GET', '/api/blueprints/todo'), { status: 200, body: null });
  });
});

describe('agents and webhooks', () => {
  const agents = [{ _id: ID, trigger: { details: { name: 'Staff', roles: ['admin'] } } }];

  test('regular users cannot list agents, as with the service', async () => {
    const { call } = setup({ agents });
    assert.deepEqual(await call('user', 'GET', '/api/ai/agents'), { status: 500, body: { message: 'Failed to list agents' } });
    assert.equal((await call('admin', 'GET', '/api/ai/agents')).body[0].name, 'Staff');
  });

  test('chatting needs the roles the agent asks for, on both chat routes', async () => {
    const { call } = setup({ agents });
    const ask = { messages: [{ role: 'user', content: 'hi' }] };
    for (const path of [`/api/ai/agents/${ID}/chat`, `/api/ai/${ID}/chat-completion`]) {
      assert.deepEqual(await call('user', 'POST', path, ask), { status: 403, body: { message: 'User does not have required roles' } });
      assert.equal((await call('admin', 'POST', path, ask)).status, 200);
    }
  });

  test('a guest cannot use agents.chat or a webhook', async () => {
    const { call } = setup({ agents }, { strictPermissions: true });
    assert.equal((await call(null, 'POST', `/api/ai/agents/${ID}/chat`, { messages: [] })).status, 401);
    assert.deepEqual(await call(null, 'POST', `/api/ai/${ID}/chat-completion`, { messages: [] }), {
      status: 403,
      body: { message: 'Guest access is not allowed' },
    });
    assert.equal((await call(null, 'POST', '/api/webhooks/any', {})).status, 401);
    assert.equal((await call('user', 'POST', '/api/webhooks/any', {})).status, 200);
  });
});
