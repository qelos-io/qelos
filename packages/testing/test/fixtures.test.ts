import { test } from 'node:test';
import assert from 'node:assert/strict';
import { admin, blueprint, entities, member, mergeSeeds, persona, resetFixtureSequence } from '../src/fixtures/index.js';
import { createMockSdk, useMockSdk } from '../src/sdk/index.js';

test('factories generate unique personas and restart with resetFixtureSequence', () => {
  resetFixtureSequence();
  assert.equal(persona().email, 'user1@example.com');
  assert.notEqual(persona().email, persona().email);
  resetFixtureSequence();
  assert.equal(admin().email, 'admin1@example.com');
  assert.deepEqual(admin().roles, ['admin']);
  assert.equal(persona({ email: 'x@y.com' }).email, 'x@y.com');
});

test('entities() expands {n}; mergeSeeds concatenates arrays and merges entities', () => {
  assert.deepEqual(entities(2, { title: 'item {n}', done: false }), [
    { title: 'item 1', done: false },
    { title: 'item 2', done: false },
  ]);
  const merged = mergeSeeds(
    { personas: [persona()], entities: { todo: [{ title: 'a' }] } },
    { personas: [admin()], entities: { todo: [{ title: 'b' }], note: [{ title: 'c' }] } },
  );
  assert.equal(merged.personas!.length, 2);
  assert.deepEqual(merged.entities!.todo.map((e) => e.title), ['a', 'b']);
  assert.equal(merged.entities!.note.length, 1);
});

test('fixtures seed a working mock: blueprint, entities and personas via the SDK', async () => {
  const boss = admin({ password: 'pw' });
  const { as } = createMockSdk({
    seed: {
      personas: [boss, member('Acme')],
      blueprints: [blueprint('todo')],
      entities: { todo: entities(3, { title: 'todo {n}' }) },
    },
  });
  const list: any = await (as(boss.email) as any).entities('todo').find();
  assert.equal((list.items ?? list).length, 3);
});

test('useMockSdk resets through the given beforeEach hook', async () => {
  let hook: () => void = () => {};
  const t = useMockSdk({ seed: { personas: [persona({ email: 'a@x.com' })] } }, { beforeEach: (fn) => (hook = fn) });
  t.mock.state.collection('personas' as any).insert({ email: 'extra@x.com' } as any);
  hook();
  assert.equal(t.mock.state.collection('personas' as any).list().length, 1);
  assert.throws(() => useMockSdk({}, { beforeEach: undefined as any }), /no global beforeEach/);
});
