import * as assert from 'node:assert/strict';
import { QelosSDKOptions } from '../../types.js';
import QlDrafts from '../drafts.js';
import QlIntegrationSources from '../integration-sources.js';
import { IntegrationSourceKind } from '@qelos/global-types';

const { describe, test } = require('node:test')

/** SDK options that remember what was requested and answer `body` */
function recording(body: unknown) {
  const requests: Array<{ url: string; method: string; body?: string }> = [];
  const options: QelosSDKOptions = {
    appUrl: 'http://localhost:3000',
    fetch: async (url: any, init: any) => {
      requests.push({ url: String(url), method: init?.method || 'GET', body: init?.body });
      return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
    },
  };
  return { requests, options };
}

describe('QlDrafts', () => {
  test('getList asks for every draft of the user', async () => {
    const { requests, options } = recording([{ contextType: 'post' }]);
    assert.deepEqual(await new QlDrafts(options).getList(), [{ contextType: 'post' }]);
    assert.deepEqual(requests.map((r) => [r.method, r.url]), [['GET', 'http://localhost:3000/api/drafts/all']]);
  });

  test('getDraft asks for the draft of a context', async () => {
    const { requests, options } = recording({});
    await new QlDrafts(options).getDraft('post', '1');
    assert.equal(requests[0].url, 'http://localhost:3000/api/drafts?contextType=post&contextId=1');
  });
});

describe('QlIntegrationSources', () => {
  test('create accepts a source built apart from the call, with any text as its kind or none', async () => {
    const { requests, options } = recording({});
    const sources = new QlIntegrationSources(options);
    const built = { kind: 'openai', name: 'ai', labels: [], metadata: {}, authentication: {} };
    const { kind: _, ...withoutKind } = built;
    await sources.create(built);
    await sources.create(withoutKind);
    assert.deepEqual(requests.map((r) => JSON.parse(r.body!).kind), ['openai', undefined]);
  });

  test('create takes the kind of the source and sends it', async () => {
    const { requests, options } = recording({});
    await new QlIntegrationSources(options).create({
      kind: IntegrationSourceKind.OpenAI,
      name: 'ai',
      labels: [],
      metadata: {},
      authentication: { token: 't' },
    });
    assert.equal(JSON.parse(requests[0].body!).kind, 'openai');
  });
});
