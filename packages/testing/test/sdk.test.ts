import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockSdk } from '../src/sdk/index.js';

const personas = [
  { email: 'admin@example.com', password: 'admin-pass', name: 'Ada Admin', roles: ['admin'] },
  { email: 'user@example.com', password: 'user-pass', name: 'Una User', roles: ['user'] },
];

test('createMockSdk: sdk calls run in-process against the mock', async () => {
  const { sdk } = createMockSdk({ seed: { personas } });
  await sdk.authentication.oAuthSignin({ username: 'admin@example.com', password: 'admin-pass' });
  const me: any = await sdk.authentication.getLoggedInUser();
  assert.equal(me.email, 'admin@example.com');
});

test('createMockSdk: as() acts as another persona without signing in', async () => {
  const { as } = createMockSdk({ seed: { personas } });
  const admin: any = as('admin@example.com');
  const user: any = as('user@example.com');
  assert.equal((await admin.authentication.getLoggedInUser()).email, 'admin@example.com');
  assert.equal((await user.authentication.getLoggedInUser()).email, 'user@example.com');
});

test('createMockSdk: reset() reseeds the state', async () => {
  const { mock, reset } = createMockSdk({ seed: { personas } });
  mock.state.collection('personas' as any).insert({ email: 'extra@example.com' } as any);
  const before = mock.state.collection('personas' as any).list().length;
  reset();
  assert.equal(mock.state.collection('personas' as any).list().length, before - 1);
});
