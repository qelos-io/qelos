import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { IntegrationSourceKind } from '@qelos/global-types';
import { QelosSDKOptions } from '../../types';
import QlIntegrationSources from '../integration-sources';

function jsonResponse(body: unknown) {
  const res = new Response(JSON.stringify(body));
  res.headers.set('Content-Type', 'application/json');
  return res;
}

const connectedResult = {
  status: 'connected' as const,
  message: 'Connection verified',
  kind: IntegrationSourceKind.Sumit,
  checkedAt: '2026-07-23T05:00:00.000Z',
};

test('QlIntegrationSources status methods', async (t) => {
  await t.test('checkStatus sends POST to saved source status path', async () => {
    let url = '';
    let init: RequestInit | undefined;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (requestUrl, requestInit) => {
        url = requestUrl.toString();
        init = requestInit;
        return jsonResponse(connectedResult);
      },
    };

    const sdk = new QlIntegrationSources(options);
    const result = await sdk.checkStatus('src-123');

    assert.equal(url, 'http://localhost:3000/api/integration-sources/src-123/status');
    assert.equal(init?.method, 'post');
    assert.equal((init?.headers as Record<string, string>)['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(init?.body as string), {});
    assert.deepEqual(result, connectedResult);
  });

  await t.test('checkStatus sends metadata and authentication overrides', async () => {
    let init: RequestInit | undefined;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (_url, requestInit) => {
        init = requestInit;
        return jsonResponse(connectedResult);
      },
    };

    const sdk = new QlIntegrationSources(options);
    await sdk.checkStatus('src-123', {
      metadata: { companyId: '42' },
      authentication: { apiKey: 'secret' },
    });

    assert.deepEqual(JSON.parse(init?.body as string), {
      metadata: { companyId: '42' },
      authentication: { apiKey: 'secret' },
    });
  });

  await t.test('checkDraftStatus sends POST to draft status path', async () => {
    let url = '';
    let init: RequestInit | undefined;
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: async (requestUrl, requestInit) => {
        url = requestUrl.toString();
        init = requestInit;
        return jsonResponse(connectedResult);
      },
    };

    const draft = {
      kind: IntegrationSourceKind.PayPal,
      metadata: { environment: 'sandbox' },
      authentication: { clientId: 'id', clientSecret: 'secret' },
    };

    const sdk = new QlIntegrationSources(options);
    const result = await sdk.checkDraftStatus(draft);

    assert.equal(url, 'http://localhost:3000/api/integration-sources/status');
    assert.equal(init?.method, 'post');
    assert.equal((init?.headers as Record<string, string>)['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(init?.body as string), draft);
    assert.deepEqual(result, connectedResult);
  });
});
