import { describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';
import { createMockSdk } from '../src/sdk/index.js';

const AGENT = 'a'.repeat(24);
const SUBJECT = 'b'.repeat(24);
const personas = [
  { email: 'admin@x.com', roles: ['admin'] },
  { email: 'user@x.com', roles: ['user'] },
];

describe('sdk.ai.rag', () => {
  const setup = () => {
    const t = createMockSdk({ seed: { personas }, persona: 'admin@x.com' });
    return { ...t, rag: (t.sdk as any).ai.rag };
  };

  test('creates one storage per agent, scope and subject', async () => {
    const { rag } = setup();
    const first = await rag.createStorage('src', { integrationId: AGENT, scope: 'user', subjectId: SUBJECT });
    assert.ok(first.success && first.vectorStore.externalId);
    assert.equal((await rag.createStorage('src', { integrationId: AGENT, scope: 'user', subjectId: SUBJECT })).vectorStore.id, first.vectorStore.id);
    assert.notEqual((await rag.createStorage('src', { integrationId: AGENT, scope: 'tenant' })).vectorStore.id, first.vectorStore.id);
  });

  test('uploads and clears files, which a test can inspect', async () => {
    const { rag, mock: qelos } = setup();
    const one = await rag.uploadContent('src', { integrationId: AGENT, content: 'hello', fileName: 'a.txt' });
    const two = await rag.uploadContent('src', { integrationId: AGENT, content: { a: 1 } });
    assert.equal(two.vectorStoreId, one.vectorStoreId);
    const files = () => (qelos.state.collection('vectorStores').list()[0] as any).files;
    assert.deepEqual(files().map((f: any) => [f.fileName.endsWith('.json'), f.content.startsWith('{')]), [[false, false], [true, true]]);
    assert.equal((await rag.clearStorage('src', { integrationId: AGENT, fileIds: [one.fileId, 'unknown'] })).clearedCount, 1);
    assert.equal((await rag.clearStorage('src', { integrationId: AGENT })).clearedCount, 1);
    assert.equal(files().length, 0);
  });

  test('is for administrators', async () => {
    const { as } = setup();
    await assert.rejects((as('user@x.com') as any).ai.rag.createStorage('src', { integrationId: AGENT, scope: 'tenant' }));
  });

  test('refuses what the service refuses, with the same bodies', async () => {
    // the service's own controllers (`apps/ai`); every case ends before a model provider is called
    const loaded: any = await import(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'apps', 'ai', 'server', 'controllers', 'storage-management'));
    const controllers = loaded.default?.default ?? loaded.default ?? loaded;
    const qelos = createMockQelos({ logger: () => {}, seed: { personas } });
    const cases: Array<[string, Function, object]> = [
      ['', controllers.createVectorStorage, {}],
      ['', controllers.createVectorStorage, { integrationId: AGENT }],
      ['', controllers.createVectorStorage, { integrationId: AGENT, scope: 'planet' }],
      ['', controllers.createVectorStorage, { integrationId: AGENT, scope: 'user' }],
      ['', controllers.createVectorStorage, { integrationId: AGENT, scope: 'user', subjectId: 5 }],
      ['/upload', controllers.uploadContentToStorage, { integrationId: AGENT }],
      ['/upload', controllers.uploadContentToStorage, { integrationId: AGENT, content: 5 }],
      ['/upload', controllers.uploadContentToStorage, { content: 'x' }],
      ['/clear', controllers.clearStorageFiles, {}],
    ];
    const errors = mock.method(console, 'error', () => {});
    for (const [path, controller, body] of cases) {
      const answer: { status: number; body?: unknown } = { status: 200 };
      const res: any = {
        status: (code: number) => ((answer.status = code), res),
        json: (value: unknown) => ((answer.body = JSON.parse(JSON.stringify(value))), res),
        end: () => {},
      };
      await controller({ headers: { tenant: '0' }, body, source: {}, params: {} }, res);
      const mine = await qelos.fetch(`/api/ai/sources/src/storage${path}`, { method: 'POST', headers: { [PERSONA_HEADER]: 'admin@x.com' }, body: JSON.stringify(body) });
      assert.deepEqual({ status: mine.status, body: await mine.json() }, answer, `${path} ${JSON.stringify(body)}`);
    }
    errors.mock.restore();
  });
});
