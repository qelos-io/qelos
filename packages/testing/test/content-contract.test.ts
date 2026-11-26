import { after, before, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';
import { toAgent, agentIntegration, agentRefusal } from '../src/ai/agents.js';

/**
 * Contract between the mock and the services behind configurations and blocks (`apps/content`), blueprints and
 * components (`apps/no-code`), agents (`apps/ai`, stored by `apps/plugins`) and webhooks (`apps/plugins`): their
 * middlewares and controllers, with the database stubbed, next to the mock.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const load = async (path: string): Promise<any> => {
  const loaded: any = await import(join(root, path));
  return loaded.default?.default ?? loaded.default ?? loaded;
};

const ROLES = ['guest', 'user', 'editor', 'plugin', 'admin'] as const;
type Role = (typeof ROLES)[number];
const userOf = (role: Role) => (role === 'guest' ? null : { _id: `u-${role}`, roles: [role] });
const header = (user: object | null) => (user ? Buffer.from(JSON.stringify(user)).toString('base64') : '');
const as = (role: Role): Record<string, string> => (role === 'guest' ? {} : { [PERSONA_HEADER]: `${role}@x.com` });

const ID = 'a'.repeat(24);
/** strict: a caller without credentials is a guest, as for the services */
const mockWith = (seed: Record<string, unknown> = {}) =>
  createMockQelos({
    logger: () => {},
    strictPermissions: true,
    seed: { personas: ROLES.slice(1).map((role) => ({ _id: `u-${role}`, email: `${role}@x.com`, roles: [role] })), ...(seed as any) },
  });

interface Answer {
  status: number;
  body?: any;
}
/** an express response that records the answer, and reports when it was sent */
function response(answer: Answer, sent: () => void) {
  const parse = (body: unknown) => (typeof body === 'string' && body ? JSON.parse(body) : body);
  const res: any = {
    status: (code: number) => ((answer.status = code), res),
    set: () => res,
    json: (body: unknown) => ((answer.body = JSON.parse(JSON.stringify(body))), sent(), res),
    end: (body?: unknown) => (body !== undefined && (answer.body = parse(body)), sent(), res),
  };
  return res;
}
/** run express middlewares until one answers; the answer is 200 when all of them pass */
async function run(middlewares: Function[], req: Record<string, any>): Promise<Answer> {
  const answer: Answer = { status: 200 };
  const step = ([middleware, ...rest]: Function[]): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!middleware) return resolve();
      Promise.resolve(middleware(req, response(answer, resolve), () => step(rest).then(resolve, reject))).catch(reject);
    });
  await step(middlewares);
  return answer;
}
async function answerOf(res: Response): Promise<Answer> {
  const text = await res.text();
  return { status: res.status, ...(text ? { body: JSON.parse(text) } : {}) };
}
/** what a mongoose query chain resolves to */
const found = (value: unknown) => {
  const chain: any = {
    select: () => chain,
    lean: () => chain,
    exec: async () => value,
    then: (resolve: any, reject: any) => Promise.resolve(value).then(resolve, reject),
  };
  return chain;
};

describe('the mock follows who may call each route', () => {
  /** compare who is refused, and what they get, for one route */
  async function same(method: string, path: string, chain: Function[], request: (user: object | null) => Record<string, any>) {
    for (const role of ROLES) {
      const real = await run(chain, request(userOf(role)));
      const mine = await answerOf(await mockWith().fetch(path, { method, headers: as(role), ...(method === 'GET' ? {} : { body: '{}' }) }));
      const label = `${role} ${method} ${path}`;
      assert.equal(mine.status === 401, real.status === 401, `${label}: mock ${mine.status}, service ${real.status}`);
      if (real.status === 401) assert.deepEqual(mine.body, real.body, label);
    }
  }

  test('configurations and blocks', async () => {
    const populateUser = await load('apps/content/server/middleware/populate-user');
    const { onlyAdmin, onlyEditor } = await load('apps/content/server/middleware/auth-check');
    const request = (user: object | null) => ({ headers: { user: header(user) } });
    for (const [method, path] of [['GET', ''], ['POST', ''], ['PUT', '/x'], ['DELETE', '/x']]) {
      await same(method, `/api/configurations${path}`, [populateUser, onlyAdmin], request);
    }
    for (const [method, path] of [['GET', ''], ['POST', ''], ['PUT', `/${ID}`], ['DELETE', `/${ID}`]]) {
      await same(method, `/api/blocks${path}`, [populateUser, onlyEditor], request);
    }
  });

  test('blueprints and components', async () => {
    const { verifyUser } = await load('packages/api-kit/src/user-middlewares');
    const { onlyEditPrivileged } = await load('apps/no-code/server/middlewares/privileged-check');
    const request = (user: object | null) => ({ user: user && structuredClone(user) });
    for (const path of ['', '/todo']) await same('GET', `/api/blueprints${path}`, [verifyUser], request);
    for (const [method, path] of [['POST', ''], ['PUT', '/todo'], ['DELETE', '/todo']]) {
      await same(method, `/api/blueprints${path}`, [verifyUser, onlyEditPrivileged], request);
    }
    for (const [method, path] of [['GET', ''], ['GET', `/${ID}`], ['POST', ''], ['PUT', `/${ID}`], ['DELETE', `/${ID}`]]) {
      await same(method, `/api/components${path}`, [verifyUser, onlyEditPrivileged], request);
    }
  });

  test('reading one configuration', async () => {
    const Configuration = await load('apps/content/server/models/configuration');
    const populateUser = await load('apps/content/server/middleware/populate-user');
    const { getConfigurationByKey, getConfiguration } = await load('apps/content/server/controllers/configurations');
    const stored = [
      { key: 'contract-open', public: true, kind: 'k', metadata: { a: 1 } },
      { key: 'contract-closed', public: false, kind: 'k', metadata: { b: 2 } },
    ];
    for (const role of ROLES) {
      for (const key of ['contract-open', 'contract-closed', 'contract-missing']) {
        const query = mock.method(Configuration, 'findOne', (filter: any) =>
          found(stored.find((c) => c.key === filter.key && (filter.public === undefined || c.public === filter.public)) ?? null),
        );
        const real = await run([populateUser, getConfigurationByKey, getConfiguration], {
          headers: { user: header(userOf(role)), tenant: '0' },
          params: { configKey: key },
        });
        query.mock.restore();
        const mine = await answerOf(await mockWith({ configurations: stored }).fetch(`/api/configurations/${key}`, { headers: as(role) }));
        assert.deepEqual(mine, real, `${role} ${key}`);
      }
    }
  });

  test('which blueprint fields a caller gets', async () => {
    const Blueprint = await load('apps/no-code/server/models/blueprint');
    const { getSingleBlueprint } = await load('apps/no-code/server/controllers/blueprints');
    const { checkAllPrivileges } = await load('apps/no-code/server/middlewares/privileged-check');
    const full = { _id: ID, tenant: '0', identifier: 'todo', name: 'Todo', description: 'd', properties: {}, permissions: [], relations: [], permissionScope: 'user' };
    for (const role of ROLES.slice(1)) {
      let projection: string | undefined;
      const query = mock.method(Blueprint, 'findOne', (_filter: unknown, fields?: string) => ((projection = fields), found(full)));
      await run([checkAllPrivileges, getSingleBlueprint], { headers: { tenant: '0' }, params: { blueprintIdentifier: 'todo' }, user: structuredClone(userOf(role)) });
      query.mock.restore();
      const expected = projection ? ['_id', ...projection.split(' ')].filter((f) => f in full) : Object.keys(full);
      const mine = await answerOf(await mockWith({ blueprints: [full] }).fetch('/api/blueprints/todo', { headers: as(role) }));
      assert.deepEqual(Object.keys(mine.body).sort(), expected.sort(), role);
    }
  });
});

describe('the mock follows the agents service', () => {
  const integration = (id: string) => ({
    _id: id,
    tenant: '0',
    active: true,
    trigger: { source: 's1', operation: 'chatCompletion', details: { name: 'Helper', systemPrompt: 'be kind' } },
    target: { source: 's2', operation: 'chatCompletion', details: { model: 'm1', max_tokens: 5 } },
  });

  /** stands in for the plugins service, which stores agents and refuses with its own middleware */
  const plugins = createServer(async (req: IncomingMessage, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const data = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
    const { onlyEditPrivilegedOrPlugin } = await load('apps/plugins/server/middlewares/privileged-check');
    const user = JSON.parse(Buffer.from(String(req.headers.user), 'base64').toString());
    const allowed = await run([onlyEditPrivilegedOrPlugin], { user });
    const send = (status: number, body?: unknown) => res.writeHead(status, { 'content-type': 'application/json' }).end(body ? JSON.stringify(body) : '');
    if (allowed.status !== 200) return send(allowed.status);
    const id = new URL(req.url!, 'http://x').pathname.split('/')[3];
    if (req.method === 'POST') return send(200, { _id: ID, tenant: '0', ...data });
    if (!id) return send(200, [integration(ID)]);
    if (id !== ID) return send(404, { message: 'Integration not found' });
    return send(200, req.method === 'PUT' ? { ...integration(ID), ...data } : integration(ID));
  });

  before(async () => {
    await new Promise<void>((resolve) => plugins.listen(0, '127.0.0.1', resolve));
    const { port } = plugins.address() as { port: number };
    Object.assign(process.env, { PLUGINS_SERVICE_URL: '127.0.0.1', PLUGINS_SERVICE_PORT: String(port) });
  });
  after(() => {
    plugins.closeAllConnections();
    plugins.close();
  });

  const comparable = (answer: Answer) => {
    const strip = (agent: any) => {
      if (!agent || typeof agent !== 'object') return agent;
      const { _id, created, tenant, ...rest } = agent;
      return rest;
    };
    return { status: answer.status, body: Array.isArray(answer.body) ? answer.body.map(strip) : strip(answer.body) };
  };

  test('managing agents: who may, what is returned, and the failures', async () => {
    const controllers = await load('apps/ai/server/controllers/agents');
    const logger = await load('apps/ai/server/services/logger');
    mock.method(logger, 'error', () => {});
    const payload = { name: 'New', model: 'm2', temperature: 0.5, maxTokens: 9, triggerSource: 's1', targetSource: 's2' };
    const cases: Array<[Function, string, string, object?, string?]> = [
      [controllers.listAgents, 'GET', ''],
      [controllers.getAgent, 'GET', `/${ID}`, undefined, ID],
      [controllers.getAgent, 'GET', `/${'b'.repeat(24)}`, undefined, 'b'.repeat(24)],
      [controllers.createAgent, 'POST', '', payload],
      [controllers.createAgent, 'POST', '', { name: 'No sources' }],
      [controllers.createAgent, 'POST', '', {}],
      [controllers.updateAgent, 'PUT', `/${ID}`, { name: 'Renamed', maxTokens: 7 }, ID],
      [controllers.deleteAgent, 'DELETE', `/${ID}`, undefined, ID],
    ];
    for (const role of ROLES.slice(1)) {
      for (const [controller, method, path, body, id] of cases) {
        const real = await run([controller], { headers: { tenant: '0', user: header(userOf(role)) }, params: { id }, query: {}, body });
        const qelos = mockWith({ agents: [integration(ID)] });
        const mine = await answerOf(await qelos.fetch(`/api/ai/agents${path}`, { method, headers: as(role), ...(body ? { body: JSON.stringify(body) } : {}) }));
        assert.deepEqual(comparable(mine), comparable(real), `${role} ${method} ${path} ${JSON.stringify(body)}`);
      }
    }
  });

  test('how a payload is stored and an integration is shown', async () => {
    const real = await load('apps/ai/server/controllers/agent-integration-mapping');
    const stored = integration(ID);
    assert.deepEqual(toAgent(stored), real.integrationToAgent(stored));
    const payload = { name: 'n', model: 'm', temperature: 1, workspace: 'w', tools: [{ name: 't', description: 'd' }] };
    const mine = agentIntegration(payload, stored);
    assert.deepEqual(mine.trigger, real.agentPayloadToTrigger(payload, stored.trigger));
    assert.deepEqual(mine.target, real.agentPayloadToTarget(payload, stored.target));
  });

  test('who may chat with an agent', async () => {
    const { verifyUserPermissions } = await load('apps/ai/server/services/source-service');
    const rules = [
      {},
      { roles: ['*'] },
      { roles: ['guest'] },
      { roles: ['admin'] },
      { roles: ['guest', 'admin'] },
      { workspaceRoles: ['lead'] },
      { workspaceLabels: ['pro'] },
    ];
    const callers = [
      { roles: [] },
      { _id: 'u', roles: ['user'] },
      { _id: 'a', roles: ['admin'] },
      { _id: 'w', roles: ['user'], workspace: { _id: 'ws', roles: ['lead'], labels: ['pro'] } },
    ];
    for (const details of rules) {
      for (const caller of callers) {
        const real = verifyUserPermissions(caller._id ? caller : null, details)?.error;
        assert.equal(agentRefusal(caller, { _id: ID, trigger: { details } }), real, `${JSON.stringify(details)} ${JSON.stringify(caller)}`);
      }
    }
  });
});

test('the mock follows the webhook rules', async () => {
  const Integration = await load('apps/plugins/server/models/integration');
  const IntegrationSource = await load('apps/plugins/server/models/integration-source');
  const { triggerWebhookService } = await load('apps/plugins/server/services/webhook-service');
  const logger = await load('apps/plugins/server/services/logger');
  mock.method(logger, 'error', () => {});
  const rules = [{}, { roles: ['admin'] }, { roles: ['guest'] }, { roles: ['lead'] }, { workspaceLabels: ['pro', 'eu'] }];
  const workspaces = [undefined, { _id: 'ws', name: 'W', roles: ['lead'], labels: ['pro'] }, { _id: 'ws', name: 'W', roles: ['member'], labels: ['pro', 'eu'] }];
  for (const details of rules) {
    for (const [index, workspace] of workspaces.entries()) {
      const user = { _id: `w${index}`, roles: ['user'], workspace };
      const queries = [
        mock.method(Integration, 'findOne', () => found({ kind: ['qelos'], trigger: { details }, target: { source: ID } })),
        // no source to call: an allowed webhook ends here
        mock.method(IntegrationSource, 'findOne', () => found(null)),
      ];
      const refusal = await triggerWebhookService('0', ID, { user, body: {}, headers: {}, method: 'POST', query: {} }).then(
        () => undefined,
        (error: Error) => error.message,
      );
      queries.forEach((query) => query.mock.restore());
      const qelos = createMockQelos({
        logger: () => {},
        seed: {
          personas: [{ _id: user._id, email: 'w@x.com', roles: ['user'], ...(workspace ? { workspace } : {}) }],
          lambdas: [{ integrationId: ID, response: { ok: true }, ...details }],
        },
      });
      const mine = await answerOf(await qelos.fetch(`/api/webhooks/${ID}`, { method: 'POST', headers: { [PERSONA_HEADER]: 'w@x.com' }, body: '{}' }));
      assert.deepEqual(
        mine,
        refusal ? { status: 403, body: { message: refusal } } : { status: 200, body: { ok: true } },
        `${JSON.stringify(details)} ${JSON.stringify(workspace)}`,
      );
    }
  }
});
