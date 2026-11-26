import { describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';
import { connectionStatus, keptCredentials, validateMetadata } from '../src/integrations/connections.js';
import { checkEnd } from '../src/integrations/operations.js';

/**
 * Contract between the mock and the service behind integrations, connections, functions and plugins (`apps/plugins`):
 * its routers' permission middlewares, validation services and controllers, with the database models and the secrets
 * vault stubbed.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const load = async (path: string): Promise<any> => {
  const loaded: any = await import(join(root, path));
  return loaded.default?.default ?? loaded.default ?? loaded;
};
const server = 'apps/plugins/server';
// the services log every refusal
const logger = await load(`${server}/services/logger`);
for (const level of ['log', 'error']) if (typeof logger[level] === 'function') mock.method(logger, level, () => {});
const plain = (value: unknown) => JSON.parse(JSON.stringify(value ?? null));

const vault = createServer((_req, res) => res.writeHead(200, { 'content-type': 'application/json' }).end('{}'));
await new Promise<void>((resolve) => vault.listen(0, '127.0.0.1', resolve));
process.env.SECRETS_SERVICE_URL = '127.0.0.1';
process.env.SECRETS_SERVICE_PORT = String((vault.address() as AddressInfo).port);
vault.unref();

const roles = ['admin', 'plugin', 'editor', 'user'];
const personas = roles.map((role) => ({ _id: role.padEnd(24, '0').replace(/[^0-9a-f]/g, 'a'), email: `${role}@x.com`, roles: [role] }));
const ADMIN = personas[0];
const mockWith = (seed: object = {}) => createMockQelos({ logger: () => {}, seed: { personas, ...seed } });
async function call(qelos: ReturnType<typeof mockWith>, method: string, path: string, body?: unknown, role = 'admin') {
  const res = await qelos.fetch(path, {
    method,
    headers: { [PERSONA_HEADER]: `${role}@x.com` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
}

/** run a controller and collect its answer */
async function real(controller: Function, req: object) {
  const answer: { status: number; body?: any } = { status: 200 };
  let done: () => void;
  const finished = new Promise<void>((resolve) => (done = resolve));
  const res: any = {
    status: (code: number) => ((answer.status = code), res),
    set: () => res,
    json: (body: unknown) => ((answer.body = plain(body)), res),
    send: (body?: string) => ((answer.body = body ? JSON.parse(body) : undefined), done(), res),
    end: (body?: string) => {
      if (body) answer.body = JSON.parse(body);
      done();
    },
  };
  await controller({ headers: { tenant: '0', tenanthost: 'app.test' }, params: {}, query: {}, body: {}, user: ADMIN, ...req }, res);
  await finished;
  return answer;
}

/** a database query result */
const found = (value: unknown) => {
  const chain: any = { select: () => chain, lean: () => chain, exec: async () => value };
  return chain;
};
/** ids and times differ between the two; nothing else may */
const comparable = (value: any): any =>
  Array.isArray(value)
    ? value.map(comparable)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => !['_id', 'created'].includes(key))
            .map(([key, v]) => [key, comparable(v)]),
        )
      : value;

const KINDS = ['qelos', 'openai', 'email', 'n8n', 'supabase', 'linkedin', 'http', 'claudeai', 'facebook', 'google', 'github', 'gemini', 'sumit', 'paypal', 'paddle', 'dodopayments', 'aws', 'cloudflare', 'unknown'];

const METADATA: object[] = [
  {},
  { external: true },
  { external: true, url: 'not a url', username: 'u' },
  { external: true, url: 'https://other.test', username: 'u', extra: 1 },
  { defaultModel: ' gpt ', initialMessages: [{ content: 'a' }, { role: 'user', content: '' }, { role: 1, content: 2 }], defaultTemperature: 0.5, defaultTopP: '1', defaultMaxTokens: 10, defaultResponseFormat: 'json', apiUrl: 'api.example.com/v1', organizationId: ' org ' },
  { apiUrl: 'ftp://x' },
  { apiUrl: 5 },
  { apiUrl: 'http://' },
  { organizationId: 5 },
  { clientId: 'c', scope: 's', other: 1 },
  { clientId: 'c' },
  { url: 'u' },
  { url: '' },
  { baseUrl: 'https://x.test', headers: { a: 'b' } },
  { baseUrl: 'https://x.test', headers: { a: 'b' }, method: 'POST', query: { q: '1' } },
  { baseUrl: 'https://x.test' },
  { baseUrl: 'x', headers: {} },
  { baseUrl: 'https://x.test', headers: { a: 1 } },
  { baseUrl: 'https://x.test', headers: {}, query: { q: 1 } },
  { baseUrl: 'https://x.test', headers: {}, method: 1 },
  { email: 'e', pop3: 'p', senderName: 'n', smtp: 's', username: 'u' },
  { companyId: 'c' },
  { companyId: 5 },
  { clientId: 'c', environment: 'live' },
  { environment: 'test' },
  { environment: 'sandbox' },
  { region: 'r', accessKeyId: 'k' },
  { accountId: 'a' },
  { accountId: 'a', workersDevSubdomain: 5 },
];

/** every operation of either end, and one nobody has */
const OPERATIONS = ['webhook', 'chatCompletion', 'apiWebhook', 'mcpTool', 'functionCalling', 'createUser', 'updateUser', 'setUserRoles', 'setWorkspaceLabels', 'createBlueprintEntity', 'updateBlueprintEntity', 'uploadContentToStorage', 'clearStorageFiles', 'makeRequest', 'sendEmail', 'callFunction', 'getFunction', 'createFunction', 'listFunctions', 'updateFunction', 'nothing'];
const everyDetail = Object.fromEntries(
  ['source', 'kind', 'eventName', 'name', 'description', 'content', 'integrationId', 'runtime', 'model', 'roles', 'workspaceRoles', 'triggerResponse', 'userId', 'blueprint', 'url', 'to', 'payload', 'parameters', 'recordThread', 'system', 'unknown'].map((key) => [key, 'v']),
);

describe('the mock follows the plugins service', () => {
  test('who may call each route', async () => {
    const routers = await Promise.all(
      [
        ['integrations', 'integrationsRouter'],
        ['integration-sources', 'integrationSourcesRouter'],
        ['lambdas', 'lambdasRouter'],
        ['manage-plugins', 'managePlugins'],
      ].map(async ([file, name]) => {
        const loaded: any = await import(join(root, server, 'routes', `${file}.ts`));
        return (loaded[name] ?? loaded.default[name])();
      }),
    );
    const qelos = mockWith();
    let checked = 0;
    for (const { route } of routers.flatMap((router) => router.stack)) {
      // the mock serves the routes the SDKs call
      if (/internal-api|execute|callback|frontends/.test(route.path)) continue;
      for (const method of Object.keys(route.methods)) {
        const middlewares = route.stack
          .filter((layer: any) => layer.method === method)
          .map((layer: any) => layer.handle)
          .slice(0, -1)
          .filter((handle: Function) => !['jsonParser', 'populateUser'].includes(handle.name));
        for (const role of roles) {
          let status = 200;
          const res: any = { status: (code: number) => ((status = code), res), end: () => {} };
          const req = { user: { roles: [role] } };
          const run = ([next, ...rest]: Function[]): void => next?.(req, res, () => run(rest));
          run(middlewares);
          const path = route.path.replace(/:\w+/g, 'abc');
          const answer = await call(qelos, method.toUpperCase(), path, method === 'get' ? undefined : {}, role);
          assert.equal(answer.status === 401, status === 401, `${role} ${method} ${route.path}: ${answer.status}`);
          checked++;
        }
      }
    }
    assert.ok(checked > 80, `only ${checked} checks`);
  });

  test('connection settings', async () => {
    const service = await import(join(root, server, 'services', 'source-metadata-service.ts'));
    const validate = (service as any).validateSourceMetadata ?? (service as any).default.validateSourceMetadata;
    const outcome = async (run: () => unknown) => {
      try {
        return { metadata: plain(await run()) };
      } catch (e: any) {
        // the controller answers `invalid metadata` for errors that carry no message of their own
        return { refused: e.responseMessage ?? (e.constructor.name === 'InvalidMetadata' ? e.message : 'invalid metadata') };
      }
    };
    for (const kind of KINDS) {
      for (const metadata of METADATA) {
        assert.deepEqual(
          await outcome(() => validateMetadata(kind, metadata)),
          await outcome(() => validate(kind, metadata)),
          `${kind} ${JSON.stringify(metadata)}`,
        );
      }
    }
  });

  test('creating connections, and which credentials they need', async () => {
    const IntegrationSource = await load(`${server}/models/integration-source`);
    const Plugin = await load(`${server}/models/plugin`);
    const { createIntegrationSource } = await load(`${server}/controllers/integration-sources`);
    mock.method(Plugin, 'findOne', () => found(null));
    mock.method(IntegrationSource.prototype, 'save', async function (this: any) {
      await this.validate();
    });
    const qelos = mockWith();
    const authentications = [undefined, null, {}, { token: 't', apiKey: 'k', clientSecret: 's', password: 'p', secretAccessKey: 'a', apiToken: 'o' }, { securedHeaders: { a: 1 } }];
    const metadata: Record<string, object> = Object.assign(
      {},
      ...KINDS.map((kind) => ({ [kind]: { clientId: 'c', scope: 's', url: 'u', baseUrl: 'https://x.test', headers: {}, email: 'e', pop3: 'p', senderName: 'n', smtp: 's', username: 'u', companyId: 'c', region: 'r', accessKeyId: 'k', accountId: 'a' } })),
    );
    for (const kind of KINDS) {
      for (const authentication of authentications) {
        // a failed save makes the service drop the secret again, which only these kinds survive without one
        const names = ['openai', 'claudeai', 'gemini', 'supabase', 'unknown'].includes(kind) ? ['n', undefined] : ['n'];
        for (const name of names) {
          const body = { name, kind, labels: ['l'], metadata: metadata[kind], ...(authentication === undefined ? {} : { authentication }) };
          const expected = await real(createIntegrationSource, { body });
          const answer = await call(qelos, 'POST', '/api/integration-sources', body);
          const shape = (a: any) => ({ status: a.status, body: a.status === 200 ? { ...comparable(a.body), user: undefined } : a.body });
          assert.deepEqual(shape(answer), shape({ ...expected, body: expected.body && { ...expected.body, ...(expected.status === 200 ? { __v: 0 } : {}) } }), JSON.stringify(body));
        }
      }
    }
  });

  test('status checks that need no provider', async () => {
    const service = await import(join(root, server, 'services', 'integration-source-status.ts'));
    const check = (service as any).checkIntegrationSourceStatus ?? (service as any).default.checkIntegrationSourceStatus;
    const settings = { companyId: 'c', clientId: 'c', baseUrl: 'https://x.test', url: 'u', username: 'u', smtp: 's', region: 'r', accessKeyId: 'k', accountId: 'a', external: true };
    const cases: Array<[string, object, object]> = [
      ...KINDS.filter((k) => !['openai', 'sumit', 'paypal', 'paddle', 'dodopayments', 'http', 'qelos', 'email', 'aws', 'cloudflare'].includes(k)).map((k) => [k, {}, {}] as [string, object, object]),
      ['qelos', {}, {}],
      ...['openai', 'sumit', 'paypal', 'paddle', 'dodopayments', 'qelos', 'email', 'aws', 'cloudflare'].map((k) => [k, settings, {}] as [string, object, object]),
      ...['sumit', 'paypal', 'qelos', 'email', 'aws', 'cloudflare', 'http'].map((k) => [k, { external: true }, { apiKey: 'k', clientSecret: 's', password: 'p', secretAccessKey: 'a', apiToken: 'o' }] as [string, object, object]),
    ];
    for (const [kind, metadata, authentication] of cases) {
      let expected: any;
      try {
        const { checkedAt: _, ...result } = await check({ tenant: '0', kind, metadata, authentication });
        expected = result;
      } catch (e: any) {
        expected = { refused: e.message, code: e.code };
      }
      const { checkedAt: _, ...answer } = connectionStatus(kind, metadata, authentication) as any;
      assert.deepEqual(answer, expected, `${kind} ${JSON.stringify(metadata)}`);
    }
  });

  test('which operations and details an integration may have', async () => {
    const IntegrationSource = await load(`${server}/models/integration-source`);
    let kind: string | undefined;
    mock.method(IntegrationSource, 'findOne', () => found(kind ? { kind } : null));
    for (const side of ['trigger', 'target'] as const) {
      const file = await import(join(root, server, 'services', `integrations-${side}-service.ts`));
      const name = side === 'trigger' ? 'validateIntegrationTrigger' : 'validateIntegrationTarget';
      const validate = (file as any)[name] ?? (file as any).default[name];
      for (kind of [...KINDS, undefined]) {
        for (const operation of OPERATIONS) {
          for (const details of [{}, everyDetail]) {
            const end = { source: 's', operation, details: { ...details } };
            let expected: any;
            try {
              await validate('0', end);
              expected = { details: end.details };
            } catch (e: any) {
              expected = { error: e.responseMessage };
            }
            const checked = checkEnd(side, { source: 's', operation, details: { ...details } }, () => kind);
            const answer = 'error' in checked ? { error: checked.error } : { details: checked.end.details };
            assert.deepEqual(answer, expected, `${side} ${kind} ${operation}`);
          }
        }
      }
    }
    assert.deepEqual(checkEnd('target', { source: 's' }, () => 'qelos'), { error: 'missing target source or operation' });
  });

  test('creating, listing and changing integrations', async () => {
    const Integration = await load(`${server}/models/integration`);
    const IntegrationSource = await load(`${server}/models/integration-source`);
    const Plugin = await load(`${server}/models/plugin`);
    const controllers = await load(`${server}/controllers/integrations`);
    const [qelosId, openaiId] = ['1'.repeat(24), '2'.repeat(24)];
    mock.method(Plugin, 'findOne', () => found(null));
    mock.method(IntegrationSource, 'findOne', (query: any) =>
      found(String(query._id) === qelosId ? { kind: 'qelos' } : String(query._id) === openaiId ? { kind: 'openai' } : null),
    );
    mock.method(Integration.prototype, 'save', async function (this: any) {
      await this.validate();
    });
    const qelos = mockWith({
      connections: [
        { _id: qelosId, name: 'q', kind: 'qelos' },
        { _id: openaiId, name: 'o', kind: 'openai' },
      ],
    });
    const trigger = { source: qelosId, operation: 'webhook', details: { source: 's', kind: 'k', eventName: 'e', other: 1 } };
    const target = { source: openaiId, operation: 'chatCompletion', details: { model: 'm' } };
    const bodies = [
      {},
      { trigger },
      { trigger, target },
      { trigger, target, active: true, dataManipulation: [{ map: { a: '.a' }, clean: true }], targetManipulation: [{}] },
      { trigger, target: { ...target, source: '3'.repeat(24) } },
      { trigger: { ...trigger, operation: 'nothing' }, target },
      { trigger: { ...trigger, details: {} }, target },
      { trigger: { operation: 'webhook' }, target },
    ];
    for (const body of bodies) {
      const expected = await real(controllers.createIntegration, { body: structuredClone(body) });
      const answer = await call(qelos, 'POST', '/api/integrations', body);
      const shape = (a: any) => ({ status: a.status, body: comparable({ ...a.body, user: undefined, ...(a.status === 200 ? { __v: 0 } : {}) }) });
      assert.deepEqual(shape(answer), shape(expected), JSON.stringify(body));
    }

    // the filter the list asks the database for, applied to the integrations of the mock
    const all = (await call(qelos, 'GET', '/api/integrations')).body as any[];
    assert.equal(all.length, 2);
    const read = (doc: any, path: string) => path.split('.').reduce((v, key) => v?.[key], doc);
    const matches = (doc: any, filter: any): boolean =>
      Object.entries(filter).every(([key, wanted]: [string, any]) => {
        if (key === 'tenant') return true;
        if (key === '$or') return wanted.some((one: object) => matches(doc, one));
        const value = read(doc, key);
        if (wanted?.$in) return wanted.$in.includes(value);
        return Array.isArray(value) ? value.includes(wanted) : value === wanted;
      });
    const queries = ['', 'active=true', 'active=0', 'kind=openai', 'kind=http', `source=${openaiId}`, `trigger.source=${qelosId}`, `target.source=${qelosId}`, 'trigger.kind=qelos', 'target.kind=openai', `user=${ADMIN._id}`, 'user=x', 'plugin=x', `id=${all[0]._id}`, `_id=${all[0]._id},${all[1]._id}`, `kind=qelos&active=true`];
    for (const query of queries) {
      let filter: any;
      mock.method(Integration, 'find', (dbQuery: any) => found(((filter = dbQuery), [])));
      await real(controllers.getAllIntegrations, { query: Object.fromEntries(new URLSearchParams(query)) });
      const answer = (await call(qelos, 'GET', `/api/integrations?${query}`)).body as any[];
      assert.deepEqual(answer.map((i) => i._id), all.filter((i) => matches(i, filter)).map((i) => i._id), query);
    }

    mock.method(Integration, 'findOne', () => ({ exec: async () => null, lean: () => ({ exec: async () => null }) }));
    for (const [method, controller] of [['PUT', controllers.updateIntegration], ['DELETE', controllers.removeIntegration]] as const) {
      const expected = await real(controller, { params: { integrationId: '4'.repeat(24) } });
      assert.deepEqual(await call(qelos, method, `/api/integrations/${'4'.repeat(24)}`, {}), expected, method);
    }
  });

  test('creating and removing plugins', async () => {
    const Plugin = await load(`${server}/models/plugin`);
    const controllers = await load(`${server}/controllers/manage-plugins`);
    const taken = new Set<string>();
    mock.method(Plugin.prototype, 'save', async function (this: any) {
      await this.validate();
      this.encodePath();
      if (taken.has(this.apiPath) && this.isNew) throw new Error('E11000 duplicate key error collection: plugins');
      taken.add(this.apiPath);
      this.isNew = false;
    });
    const qelos = mockWith();
    const bodies = [
      {},
      { name: 'one', apiPath: 'one' },
      { name: 'again', apiPath: 'one' },
      { name: 'two', apiPath: 'a/b', token: 't', tenant: 'other', unknown: 1, proxyUrl: 'http://p', microFrontends: [{ name: 'm', roles: ['*'] }], navBarGroups: [{ key: 'k', name: 'n' }] },
      { name: 'three', apiPath: 'three', token: 't', authAcquire: { refreshTokenUrl: 'http://r', refreshToken: 'secret' } },
    ];
    for (const body of bodies) {
      const expected = await real(controllers.createPlugin, { body: structuredClone(body) });
      const answer = await call(qelos, 'POST', '/api/plugins', body);
      const shape = (a: any) => ({ status: a.status, body: comparable({ ...a.body, ...(a.status === 200 ? { __v: 0 } : {}) }) });
      assert.deepEqual(shape(answer), shape(expected), JSON.stringify(body));
    }
    mock.method(Plugin, 'findOne', () => ({ select: () => ({ exec: async () => null }), exec: async () => null }));
    for (const [method, controller] of [['PUT', controllers.updatePlugin], ['DELETE', controllers.removePlugin]] as const) {
      const expected = await real(controller, { params: { pluginId: '5'.repeat(24) } });
      assert.deepEqual(await call(qelos, method, `/api/plugins/${'5'.repeat(24)}`, {}), expected, method);
    }
  });

  test('refusals of the function routes', async () => {
    const IntegrationSource = await load(`${server}/models/integration-source`);
    const controllers = await load(`${server}/controllers/lambdas`);
    const qelos = mockWith({ connections: [{ _id: 'ai', name: 'ai', kind: 'openai' }] });
    const routes: Array<[string, string, string]> = [
      ['listFunctions', 'GET', ''],
      ['getFunction', 'GET', '/f'],
      ['createFunction', 'POST', ''],
      ['updateFunction', 'PUT', '/f'],
      ['deleteFunction', 'DELETE', '/f'],
    ];
    for (const [source, id] of [[null, 'none'], [{ kind: 'openai' }, 'ai']] as const) {
      for (const lookup of ['findById', 'findOne']) mock.method(IntegrationSource, lookup, () => found(source));
      for (const [controller, method, path] of routes) {
        const expected = await real(
          (req: any, res: any) => controllers[controller](req, { ...res, json: (body: unknown) => (res.json(body), res.end()), status: (code: number) => (res.status(code), { json: (body: unknown) => (res.json(body), res.end()) }) }),
          { params: { sourceId: id, functionName: 'f' } },
        );
        assert.deepEqual(await call(qelos, method, `/api/lambdas/${id}${path}`, method === 'GET' ? undefined : {}), expected, `${controller} ${id}`);
      }
    }
  });
});
