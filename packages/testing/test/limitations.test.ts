import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockSdk } from '../src/sdk/index.js';
import { blueprint } from '../src/fixtures/index.js';

const todos = blueprint('todo', {
  permissionScope: 'user',
  permissions: [
    { operation: 'create', scope: 'user', roleBased: ['user'] },
    { operation: 'delete', scope: 'user', roleBased: ['user'] },
  ],
  limitations: [{ scope: 'user', value: 1, roles: ['user'] }],
});

function setup() {
  const { as, mock } = createMockSdk({ seed: { personas: [{ email: 'a@x.com' }, { email: 'b@x.com' }], blueprints: [todos] } });
  return { as: (email: string) => (as(email) as any).entities('todo'), mock };
}

describe('blueprint limitations', () => {
  test('creating one more than allowed is refused until one is removed', async () => {
    const { as } = setup();
    const first = await as('a@x.com').create({ title: 'one' });
    await assert.rejects(as('a@x.com').create({ title: 'two' }), /reached limit of allowed entities/);
    // each user has their own
    await as('b@x.com').create({ title: 'theirs' });
    await as('a@x.com').remove(first.identifier);
    await as('a@x.com').create({ title: 'two' });
  });

  test('are not checked for an unidentified caller, like permissions', async () => {
    const { mock } = setup();
    const create = () => mock.fetch('/api/blueprints/todo/entities', { method: 'POST', body: JSON.stringify({ title: 't' }) });
    assert.deepEqual([(await create()).status, (await create()).status], [200, 200]);
  });
});
