import { describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';

/**
 * Contract between the mock and creating entities in the data service (`apps/no-code`), for blueprint `limitations`.
 * The real controller and entity model run over a list instead of a database.
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

const hex = (digit: string) => digit.repeat(24);
const workspace = (digit: string, labels: string[]) => ({ _id: hex(digit), name: digit, labels, roles: ['member'] });
const CALLERS: Record<string, { _id: string; roles: string[]; workspace?: object } | null> = {
  admin: { _id: hex('a'), roles: ['admin'] },
  free: { _id: hex('b'), roles: ['user'], workspace: workspace('1', ['free']) },
  teammate: { _id: hex('c'), roles: ['user'], workspace: workspace('1', ['free']) },
  pro: { _id: hex('d'), roles: ['user', 'premium'], workspace: workspace('2', ['pro']) },
  alone: { _id: hex('e'), roles: ['user'] },
  guest: null,
};

/** each list is the `limitations` of one blueprint */
const CASES: object[][] = [
  [],
  [{ scope: 'tenant', value: 2 }],
  [{ scope: 'user', value: 1 }],
  [{ scope: 'workspace', value: 1 }],
  [{ scope: 'tenant', value: 0 }],
  [{ scope: 'user', value: 1, roles: ['user'] }],
  [{ scope: 'user', value: 1, roles: ['premium'] }],
  [{ scope: 'user', value: 1, roles: ['*'] }],
  [{ scope: 'workspace', value: 1, workspaceLabels: ['free'] }],
  [{ scope: 'tenant', value: 1, workspaceLabels: ['*'] }],
  [{ scope: 'tenant', value: 1, properties: ['kind'] }],
  [{ scope: 'user', value: 1, properties: ['kind', 'size'] }],
  [{ scope: 'tenant', value: 1, properties: ['tags'] }],
  [
    { scope: 'user', value: 3 },
    { scope: 'workspace', value: 1, workspaceLabels: ['pro'] },
  ],
];
const ENTITIES: Record<string, unknown>[] = [{ kind: 'a', size: 1, tags: ['x'] }, { kind: 'a', size: 2, tags: ['x', 'y'] }, { kind: 'b' }, { kind: 'b' }, {}];
const properties = {
  kind: { title: 'Kind', type: 'string' },
  size: { title: 'Size', type: 'number' },
  tags: { title: 'Tags', type: 'string', multi: true },
};

describe('the mock follows blueprint limitations', () => {
  test('which creations are refused, by caller, scope and properties', async () => {
    const storage = await named('services/entity-storage.service');
    const { createBlueprintEntity } = await named('controllers/entities');
    const logger = await load('services/logger');
    for (const level of ['log', 'error']) mock.method(logger, level, () => {});
    const model = storage.getEntityModel(undefined);
    let docs: any[] = [];
    const read = (doc: any, path: string) => path.split('.').reduce((value, key) => value?.[key], doc);
    const json = (value: unknown) => JSON.stringify(value ?? null);
    mock.method(model, 'countDocuments', (filter: Record<string, unknown>) => {
      const count = docs.filter((doc) =>
        Object.entries(filter).every(([key, wanted]) => {
          const stored = read(doc, key);
          return json(stored) === json(wanted) || (Array.isArray(stored) && !Array.isArray(wanted) && stored.some((item) => json(item) === json(wanted)));
        }),
      ).length;
      return { lean: () => ({ exec: async () => count }) };
    });
    mock.method(model.prototype, 'save', async function (this: any) {
      docs.push(JSON.parse(JSON.stringify(this.toObject())));
      return this;
    });

    let refused = 0;
    let created = 0;
    let ip = 0;
    for (const [index, limitations] of CASES.entries()) {
      const blueprint = {
        tenant: '0',
        identifier: `limited${index}`,
        name: 'Limited',
        entityIdentifierMechanism: 'objectid',
        permissionScope: 'tenant',
        permissions: [{ operation: 'create', scope: 'tenant', guest: true }],
        properties,
        relations: [],
        limitations,
      };
      docs = [];
      const qelos = createMockQelos({
        logger: () => {},
        strictPermissions: true,
        seed: {
          personas: Object.entries(CALLERS)
            .filter(([, caller]) => caller)
            .map(([name, caller]) => ({ ...(caller as { _id: string }), email: `${name}@x.com` })),
          blueprints: [structuredClone(blueprint)],
        },
      });
      for (const [name, caller] of [...Object.entries(CALLERS), ...Object.entries(CALLERS)]) {
        for (const metadata of ENTITIES) {
          const answer: { status: number; body?: any } = { status: 200 };
          const res: any = {
            status: (code: number) => ((answer.status = code), res),
            json: (body: unknown) => ((answer.body = body), res),
            end: () => {},
            setHeader: () => {},
          };
          const user = caller ? structuredClone(caller) : undefined;
          await createBlueprintEntity(
            {
              headers: { tenant: '0', 'user-agent': 'contract' },
              // the service also limits how fast one guest may write
              ip: String(ip++),
              blueprint,
              user,
              workspace: user?.workspace,
              body: structuredClone(metadata),
              query: {},
            },
            res,
          );
          const mine = await qelos.fetch(`/api/blueprints/${blueprint.identifier}/entities`, {
            method: 'POST',
            headers: caller ? { [PERSONA_HEADER]: `${name}@x.com` } : {},
            body: JSON.stringify(metadata),
          });
          const body: any = await mine.json();
          const label = `${json(limitations)} ${name} ${json(metadata)}`;
          assert.equal(mine.status, answer.status, `${label}: ${json(body)} / ${json(answer.body)}`);
          if (answer.status === 200) created++;
          else {
            assert.deepEqual(body.message, answer.body.message, label);
            refused++;
          }
        }
      }
    }
    // both sides agreeing says little unless the cases do both
    assert.ok(created > 200 && refused > 200, `${created} created, ${refused} refused`);
  });
});
