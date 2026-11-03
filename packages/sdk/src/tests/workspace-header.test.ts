import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import QelosSDK from '../index';

function setup(extra: Record<string, unknown> = {}) {
  const headers: Record<string, string>[] = [];
  const sdk = new QelosSDK({
    appUrl: 'http://localhost:3000',
    apiToken: 'ql_token',
    fetch: async (_url, init) => {
      headers.push({ ...(init?.headers as Record<string, string>) });
      const res = new Response('{}');
      res.headers.set('Content-Type', 'application/json');
      return res;
    },
    ...extra,
  });
  return { sdk, headers };
}

test('x-workspace header with api token', async (t) => {
  await t.test('not sent by default', async () => {
    const { sdk, headers } = setup();
    await sdk.authentication.callJsonApi('/api/me').catch(() => {});
    assert.equal(headers[0]['x-api-key'], 'ql_token');
    assert.equal(headers[0]['x-workspace'], undefined);
  });

  await t.test('sent from the workspace option', async () => {
    const { sdk, headers } = setup({ workspace: 'w1' });
    await sdk.authentication.callJsonApi('/api/me').catch(() => {});
    assert.equal(headers[0]['x-workspace'], 'w1');
  });

  await t.test('setWorkspace sets and clears it', async () => {
    const { sdk, headers } = setup();
    sdk.setWorkspace('w2');
    await sdk.authentication.callJsonApi('/api/me').catch(() => {});
    sdk.setWorkspace(undefined);
    await sdk.authentication.callJsonApi('/api/me').catch(() => {});
    assert.equal(headers[0]['x-workspace'], 'w2');
    assert.equal(headers[1]['x-workspace'], undefined);
  });
});
