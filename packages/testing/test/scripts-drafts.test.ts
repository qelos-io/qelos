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
  let persona: string | undefined = 'admin@x.com';
  const sdk = new Admin({
    appUrl: 'http://qelos.mock',
    fetch: mock.fetch,
    extraHeaders: async (): Promise<Record<string, string>> => (persona ? { [PERSONA_HEADER]: persona } : {}),
  });
  return { sdk, as: (email: string | undefined) => void (persona = email), mock };
}

const card = { identifier: 'Card', componentName: 'Card', content: '<template><div/></template>' };

describe('scripts', () => {
  test('scripts and components are created, listed by type, changed and removed', async () => {
    const { sdk } = setup();
    const script = await sdk.scripts.create({ identifier: './utils/demo.ts', content: 'export const a = 1' });
    assert.deepEqual([script.type, script.identifier], ['script', 'utils/demo']);
    const component = await sdk.scripts.create(card);
    assert.deepEqual([component.type, component.requiredProps], ['component', []]);

    const listed = await sdk.scripts.getList();
    assert.deepEqual(listed.map((s: any) => [s.type, 'content' in s]), [['script', false], ['component', false]]);
    assert.deepEqual((await sdk.scripts.getList('component')).map((s: any) => s.identifier), ['Card']);
    assert.equal((await sdk.scripts.getScript(script._id)).content, 'export const a = 1');
    assert.equal((await sdk.scripts.update(script._id, { content: 'export const a = 2' })).content, 'export const a = 2');

    await assert.rejects(sdk.scripts.create({ identifier: 'utils/demo', content: 'x' }), /failed to create a script/);
    await assert.rejects(sdk.scripts.create({ identifier: '../out', content: 'x' }), /invalid script/);
    await sdk.scripts.remove(script._id);
    await assert.rejects(sdk.scripts.getScript(script._id), /not found/);
  });

  test('bulk requests create or update, and report each item', async () => {
    const { sdk } = setup();
    const first = await sdk.scripts.bulkCreateOrUpdate([card, { identifier: 'a', content: '1' }, { identifier: 'Other.vue', content: '<template/>' }]);
    assert.deepEqual([first.total, first.succeeded], [3, 2]);
    assert.deepEqual(first.results.map((r: any) => [r.type, r.success]), [['script', true], ['component', true], ['component', false]]);

    const second = await sdk.scripts.bulkCreateOrUpdate([{ identifier: 'a', content: '2' }, { ...card, identifier: 'Renamed' }]);
    assert.equal(second.succeeded, 2);
    assert.deepEqual((await sdk.scripts.getList()).map((s: any) => s.identifier), ['a', 'Renamed']);
  });

  test('the older components API shares the components', async () => {
    const { sdk } = setup();
    const result = await sdk.components.bulkCreateOrUpdate([card]);
    assert.deepEqual([result.succeeded, result.results[0].component.componentName], [1, 'Card']);
    assert.deepEqual((await sdk.scripts.getList('component')).map((s: any) => s.identifier), ['Card']);
    assert.equal((await sdk.components.getList()).length, 1);
    await assert.rejects(sdk.components.bulkCreateOrUpdate([]), /components array is required/);
  });

  test('pulled scripts, kept among the components, are scripts', async () => {
    const { sdk } = setup({ components: [{ _id: 's1', type: 'script', identifier: 'pulled', content: 'x' }, { _id: 'c1', type: 'component', ...card }] });
    assert.deepEqual((await sdk.scripts.getList('script')).map((s: any) => s.identifier), ['pulled']);
    assert.deepEqual((await sdk.components.getList()).map((c: any) => c.identifier), ['Card']);
    assert.equal((await sdk.scripts.update('s1', { content: 'y' })).content, 'y');
    await sdk.scripts.remove('s1');
    assert.equal((await sdk.scripts.getList()).length, 1);
  });

  test('are for administrators and plugins', async () => {
    const { sdk, as } = setup();
    as('plugin@x.com');
    assert.deepEqual(await sdk.scripts.getList(), []);
    as('user@x.com');
    await assert.rejects(sdk.scripts.getList());
  });
});

describe('drafts', () => {
  const draft = { contextType: 'post', contextId: '1', contextData: { title: 'a' } };

  test('each user keeps one draft per context', async () => {
    const { sdk, as } = setup();
    const saved = await sdk.drafts.setDraft(draft);
    assert.deepEqual([saved.user, saved.contextData, saved.contextDisplayName], ['a1', { title: 'a' }, '']);
    assert.equal((await sdk.drafts.setDraft({ ...draft, contextData: { title: 'b' } }))._id, saved._id);
    assert.deepEqual((await sdk.drafts.getDraft('post', '1')).contextData, { title: 'b' });

    as('user@x.com');
    await assert.rejects(sdk.drafts.getDraft('post', '1'), /draft not found/);
    as('admin@x.com');
    await sdk.drafts.remove('post', '1');
    await assert.rejects(sdk.drafts.getDraft('post', '1'), /draft not found/);
  });

  test('getList asks for a draft without a context, as against the service', async () => {
    const { sdk, mock } = setup();
    await sdk.drafts.setDraft(draft);
    await assert.rejects(sdk.drafts.getList(), /draft not found/);
    const all = await mock.fetch('/api/drafts/all', { headers: { [PERSONA_HEADER]: 'admin@x.com' } });
    assert.equal(((await all.json()) as unknown[]).length, 1);
  });

  test('need a signed-in user', async () => {
    const { sdk, as } = setup();
    as(undefined);
    await assert.rejects(sdk.drafts.setDraft(draft));
  });
});
