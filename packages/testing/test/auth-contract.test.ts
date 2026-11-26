import { after, before, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';
import { mayManageApiTokens } from '../src/auth/rules.js';

/**
 * Contract between the mock and the auth service (`apps/auth`): its middlewares, controllers and rules, with the
 * database stubbed, next to the mock.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const load = async (path: string): Promise<any> => {
  const loaded: any = await import(join(root, 'apps/auth/server', path));
  return loaded.default?.default ?? loaded.default ?? loaded;
};
const ID = (n: number) => String(n).repeat(24);
const personas = [
  { _id: ID(1), email: 'admin@x.com', roles: ['admin'] },
  { _id: ID(2), email: 'user@x.com', roles: ['user'] },
];

interface Answer {
  status: number;
  body?: any;
}
/** run a middleware or controller; it ends by answering or by calling `next` */
function run(handler: Function, req: Record<string, any>): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const answer: Answer = { status: 200 };
    const done = (body?: unknown) => {
      if (body !== undefined && body !== '') answer.body = typeof body === 'string' ? JSON.parse(body) : JSON.parse(JSON.stringify(body));
      // answering can come in two steps (`status().json().end()`): let the chain finish
      queueMicrotask(() => resolve(answer));
    };
    const res: any = {
      status: (code: number) => ((answer.status = code), res),
      set: () => res,
      json: (body: unknown) => (done(body), res),
      send: (body: unknown) => (done(body), res),
      end: (body?: unknown) => (done(body), res),
    };
    Promise.resolve(handler({ get: () => undefined, headers: { tenant: '0' }, params: {}, query: {}, body: {}, ...req }, res, () => resolve(answer))).catch(reject);
  });
}

describe('the mock follows the auth service', () => {
  /** stands in for the content service (each tenant's workspace configuration) and takes the platform events */
  const configurations = new Map<string, object>();
  const content = createServer((req, res) => {
    const wanted = req.url!.includes('/configurations/');
    const metadata = configurations.get(String(req.headers.tenant));
    res.writeHead(wanted && !metadata ? 404 : 200, { 'content-type': 'application/json' }).end(JSON.stringify(metadata ? { metadata } : {}));
  });
  before(async () => {
    await new Promise<void>((resolve) => content.listen(0, '127.0.0.1', resolve));
    const { port } = content.address() as { port: number };
    for (const name of ['CONTENT', 'PLUGINS']) {
      Object.assign(process.env, { [`${name}_SERVICE_URL`]: '127.0.0.1', [`${name}_SERVICE_PORT`]: String(port) });
    }
  });
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    content.closeAllConnections();
    content.close();
  });

  test('who may manage API tokens', async () => {
    const { isUserPermittedToManageTokens } = await load('services/api-tokens');
    const configs = [
      {},
      { allowUserTokenAuthentication: true },
      { tokenAuthenticationPermissions: { roles: ['*'] } },
      ...[{ roles: ['*'] }, { roles: ['user'] }, { roles: [] }, { wsRoles: ['*'] }, { wsRoles: ['lead'] }, { roles: ['admin'], wsRoles: ['lead'] }].map(
        (tokenAuthenticationPermissions) => ({ allowUserTokenAuthentication: true, tokenAuthenticationPermissions }),
      ),
    ];
    for (const config of configs) {
      for (const roles of [['user'], ['admin']]) {
        for (const wsRoles of [undefined, ['member'], ['lead']]) {
          assert.equal(mayManageApiTokens(config, roles, wsRoles), !!isUserPermittedToManageTokens(roles, config, wsRoles), JSON.stringify([config, roles, wsRoles]));
        }
      }
    }
  });

  test('who the administrator routes accept', async () => {
    const { onlyPrivileged } = await load('middleware/auth-check');
    const qelos = createMockQelos({ logger: () => {}, seed: { personas } });
    const callers = { guest: undefined, user: { roles: ['user'] }, admin: { roles: ['admin'], isPrivileged: true } };
    for (const [name, userPayload] of Object.entries(callers)) {
      const real = await run(onlyPrivileged, { userPayload });
      for (const path of ['/api/users', '/api/roles', '/api/workspaces/all', `/api/workspaces/${ID(9)}/encrypted`, `/api/users/${ID(2)}`]) {
        const res = await qelos.fetch(path, { headers: userPayload ? { [PERSONA_HEADER]: `${name}@x.com` } : {} });
        assert.equal(res.status === 401, real.status === 401, `${name} ${path}`);
        if (real.status === 401) assert.deepEqual(await res.json(), real.body, `${name} ${path}`);
      }
    }
  });

  test('what workspace creation refuses', async () => {
    const Workspace = await load('models/workspace');
    const { createWorkspace } = await load('controllers/workspace');
    const save = mock.method(Workspace.prototype, 'save', async () => {});
    const rules: Array<object | undefined> = [
      undefined,
      { creationPrivilegedRoles: ['admin'], allowNonLabeledWorkspaces: true, labels: [] },
      { creationPrivilegedRoles: ['*'], allowNonLabeledWorkspaces: true, labels: [] },
      { creationPrivilegedRoles: [], allowNonLabeledWorkspaces: false, labels: [{ value: ['pro'] }, { value: ['a', 'b'] }] },
      { allowNonLabeledWorkspaces: false, labels: [{ value: ['pro'], allowedRolesForCreation: ['sales'] }, { value: ['free'] }] },
      { allowNonLabeledWorkspaces: true, labels: [{ value: ['pro'], allowedRolesForCreation: ['sales'] }, { value: ['free'] }] },
    ];
    const bodies = [{ name: 'w' }, { name: 'w', labels: 'x' }, { name: 'w', labels: ['pro'] }, { name: 'w', labels: ['free'] }, { name: 'w', labels: ['other'] }, { name: 'w', labels: ['x', 'y', 'z'] }];
    for (const [index, metadata] of rules.entries()) {
      // the service caches the configuration per tenant
      const tenant = `tenant-${index}`;
      if (metadata) configurations.set(tenant, metadata);
      for (const role of ['user', 'admin']) {
        for (const body of bodies) {
          const real = await run(createWorkspace, {
            headers: { tenant },
            body: structuredClone(body),
            userPayload: { sub: ID(role === 'admin' ? 1 : 2), roles: [role], isPrivileged: role === 'admin' },
          });
          const seeded = metadata ? [{ key: 'workspace-configuration', metadata }] : [];
          const qelos = createMockQelos({ logger: () => {}, seed: { personas, configurations: seeded as any } });
          const res = await qelos.fetch('/api/workspaces', { method: 'POST', headers: { [PERSONA_HEADER]: `${role}@x.com` }, body: JSON.stringify(body) });
          const label = `${role} ${JSON.stringify(metadata)} ${JSON.stringify(body)}`;
          assert.equal(res.status, real.status, label);
          if (real.status !== 200) assert.deepEqual(await res.json(), real.body, label);
        }
      }
    }
    save.mock.restore();
  });

  test('answering an invitation', async () => {
    const Workspace = await load('models/workspace');
    const { respondToInvite } = await load('controllers/invites');
    const invite = { _id: ID(7), email: 'user@x.com', roles: ['admin'] };
    for (const kind of ['accept', 'decline', 'maybe']) {
      const stored = { _id: ID(5), name: 'W', invites: [{ ...invite }], members: [] as any[], save: async () => {} };
      const find = mock.method(Workspace, 'findOne', async () => stored);
      const real = await run(respondToInvite, { body: { workspace: ID(5), kind }, userPayload: { sub: ID(2), email: 'user@x.com' } });
      find.mock.restore();
      const qelos = createMockQelos({
        logger: () => {},
        seed: { personas, workspaces: [{ _id: ID(5), name: 'W', invites: [{ ...invite }], members: [], labels: [] }] },
      });
      const res = await qelos.fetch('/api/invites', { method: 'POST', headers: { [PERSONA_HEADER]: 'user@x.com' }, body: JSON.stringify({ workspace: ID(5), kind }) });
      assert.deepEqual({ status: res.status, body: await res.json() }, real, kind);
      const ws = qelos.state.workspaces.get(ID(5))!;
      const members = (list: any[]) => list.map((m) => ({ user: m.user, roles: m.roles }));
      assert.deepEqual([members(ws.members), ws.invites.length], [members(stored.members), stored.invites.length], kind);
    }
  });
});
