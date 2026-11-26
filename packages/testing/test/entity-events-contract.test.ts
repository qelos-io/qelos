import { describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';

/**
 * Contract between the mock and the platform events the data service (`apps/no-code`) emits for entity changes. The
 * real controllers and entity model run over a list instead of a database; a local server receives their events.
 */
const server = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'apps', 'no-code', 'server');
const load = async (path: string): Promise<any> => {
  const loaded: any = await import(join(server, path));
  return loaded.default?.default ?? loaded.default ?? loaded;
};
const named = async (path: string): Promise<any> => {
  const loaded: any = await import(join(server, path));
  return loaded.default ?? loaded;
};
const plain = (value: unknown) => JSON.parse(JSON.stringify(value ?? null));

const received: any[] = [];
const events = createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    received.push(JSON.parse(body));
    res.writeHead(200, { 'content-type': 'application/json' }).end('{}');
  });
});
await new Promise<void>((resolve) => events.listen(0, '127.0.0.1', resolve));
process.env.PLUGINS_SERVICE_URL = '127.0.0.1';
process.env.PLUGINS_SERVICE_PORT = String((events.address() as AddressInfo).port);
events.unref();

const hex = (digit: string) => digit.repeat(24);
const ADMIN = { _id: hex('a'), roles: ['admin'] };
const WORKSPACE = { _id: hex('1'), name: 'w', labels: [], roles: [] };
const order = {
  tenant: '0',
  identifier: 'order',
  name: 'Order',
  entityIdentifierMechanism: 'objectid',
  permissionScope: 'tenant',
  permissions: [],
  properties: {
    title: { title: 'Title', type: 'string' },
    total: { title: 'Total', type: 'number' },
    client: { title: 'Client', type: 'string' },
  },
  relations: [{ key: 'client', target: 'client' }],
};
const client = { tenant: '0', identifier: 'client', name: 'Client', properties: {}, relations: [] };
const CLIENTS = ['acme', 'globex'];

describe('the mock follows the events of entity changes', () => {
  test('what is emitted on create, update and delete, when the blueprint asks for it', async () => {
    const storage = await named('services/entity-storage.service');
    const Blueprint = await load('models/blueprint');
    const controllers = await named('controllers/entities');
    const logger = await load('services/logger');
    for (const level of ['log', 'error']) mock.method(logger, level, () => {});
    const model = storage.getEntityModel(undefined);
    let docs: any[] = [];
    mock.method(Blueprint, 'findOne', () => ({ lean: () => ({ exec: async () => client }) }));
    mock.method(model, 'findOne', (filter: any) => {
      const found = () =>
        filter.blueprint === 'client'
          ? CLIENTS.includes(filter.identifier) ? { _id: filter.identifier } : null
          : docs.find((d) => d.identifier === filter.identifier) ?? null;
      const chain: any = {
        select: () => chain,
        lean: () => ({ exec: async () => structuredClone(found()) }),
        exec: async () => (found() ? model.hydrate(structuredClone(found())) : null),
      };
      return chain;
    });
    mock.method(model, 'deleteOne', (filter: any) => ({ exec: async () => (docs = docs.filter((d) => d.identifier !== filter.identifier)) }));
    mock.method(model.prototype, 'save', async function (this: any) {
      docs = [...docs.filter((d) => d.identifier !== this.identifier), plain(this.toObject())];
      return this;
    });

    for (const dispatchers of [{ create: true, update: true, delete: true }, { delete: true }, {}]) {
      docs = [];
      const blueprint = { ...order, dispatchers };
      const qelos = createMockQelos({
        logger: () => {},
        seed: {
          personas: [{ ...ADMIN, email: 'admin@x.com', workspace: WORKSPACE }],
          blueprints: [structuredClone(blueprint), structuredClone(client)],
          entities: { client: CLIENTS.map((identifier) => ({ identifier, metadata: {} })) },
        },
      });
      received.length = 0;
      let expected = 0;
      const ids = { real: '', mine: '' };

      /** do the same to both, and compare the events each of them produced */
      const compare = async (method: 'POST' | 'PUT' | 'DELETE', controller: Function, body: object = {}) => {
        const answer: { status: number; body?: any } = { status: 200 };
        const res: any = {
          status: (code: number) => ((answer.status = code), res),
          json: (value: unknown) => ((answer.body = plain(value)), res),
          end: () => {},
          setHeader: () => {},
        };
        await controller(
          {
            headers: { tenant: '0' },
            blueprint,
            user: structuredClone({ ...ADMIN, workspace: WORKSPACE }),
            workspace: WORKSPACE,
            params: { entityIdentifier: ids.real },
            body: structuredClone(body),
            query: {},
          },
          res,
        );
        const path = `/api/blueprints/order/entities${method === 'POST' ? '' : `/${ids.mine}`}`;
        const mine = await qelos.fetch(path, {
          method,
          headers: { [PERSONA_HEADER]: 'admin@x.com' },
          ...(method === 'DELETE' ? {} : { body: JSON.stringify(body) }),
        });
        const created: any = await mine.json();
        const label = `${JSON.stringify(dispatchers)} ${method} ${JSON.stringify(body)}`;
        assert.equal(mine.status, answer.status, `${label}: ${JSON.stringify(created)} / ${JSON.stringify(answer.body)}`);
        assert.equal(answer.status, 200, label);
        if (method === 'POST') Object.assign(ids, { real: answer.body.identifier, mine: created.identifier });

        const wanted = { POST: 'create', PUT: 'update', DELETE: 'delete' }[method] as keyof typeof dispatchers;
        if ((dispatchers as Record<string, boolean>)[wanted]) expected++;
        // the service does not wait for its events to be received
        for (let i = 0; i < 100 && received.length < expected; i++) await new Promise((resolve) => setTimeout(resolve, 10));
        const comparable = ({ _id, created: _created, metadata, ...event }: any, id: string) => ({
          ...event,
          metadata: { ...metadata, entity: metadata.entity === id ? 'the entity' : metadata.entity },
        });
        assert.deepEqual(
          qelos.state.events.list().map((e) => comparable(e, ids.mine)),
          received.map((e) => comparable(e, ids.real)),
          label,
        );
        assert.equal(received.length, expected, label);
      };

      await compare('POST', controllers.createBlueprintEntity, { title: 'a', total: 1, client: 'acme' });
      await compare('PUT', controllers.updateBlueprintEntity, { title: 'b' });
      await compare('PUT', controllers.updateBlueprintEntity, {});
      await compare('PUT', controllers.updateBlueprintEntity, { client: 'globex' });
      await compare('PUT', controllers.updateBlueprintEntity, { user: hex('b'), title: 'c' });
      await compare('PUT', controllers.updateBlueprintEntity, { workspace: hex('2') });
      await compare('PUT', controllers.updateBlueprintEntity, { client: '' });
      await compare('DELETE', controllers.removeBlueprintEntity);
    }
  });
});
