import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { testApp } from '@qelos/testing/http';
import Fastify from './fastify';
import qelosFastify from '../src/plugin';

/** `testApp()` from @qelos/testing against a real Fastify server (over HTTP) running the integrator in mock mode. */
function config() {
  return {
    appUrl: 'http://unreachable.invalid',
    mock: {
      logger: () => {},
      seed: {
        personas: [
          { email: 'dev@example.com', password: 'secret-pass-1', roles: ['admin'] },
          { email: 'other@example.com', password: 'secret-pass-2', roles: ['user'] },
        ],
      },
    },
  };
}

test('testApp: cookie sign-in, persona clients and req.qelos on a Fastify app', async () => {
  const app = Fastify();
  await app.register(qelosFastify, { config: config() });
  app.get('/whoami', async (request) => ({ email: request.qelos.user?.email ?? null }));
  await app.ready();
  const client = await testApp(app.server);
  try {
    assert.equal((await client.json('/whoami')).body.email, null);

    const persona = client.as('other@example.com');
    assert.equal((await persona.json('/api/me')).body.email, 'other@example.com');
    assert.equal((await persona.json('/whoami')).body.email, 'other@example.com');

    assert.equal((await client.signIn('dev@example.com', 'secret-pass-1')).status, 200);
    assert.equal((await client.json('/api/me')).body.email, 'dev@example.com');
    assert.equal((await client.json('/whoami')).body.email, 'dev@example.com');
  } finally {
    await client.close();
    await app.close();
  }
});
