import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testApp } from '../src/http/index.js';

test('testApp serves a plain listener, keeps cookies and sends the persona header', async () => {
  const client = await testApp((req, res) => {
    if (req.url === '/login') res.setHeader('set-cookie', 'sid=abc; Path=/');
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ cookie: req.headers.cookie ?? null, persona: req.headers['x-qelos-mock-persona'] ?? null }));
  });
  try {
    await client.fetch('/login');
    const res = await client.as('a@x.com').json('/whoami');
    assert.equal(res.body.cookie, 'sid=abc');
    assert.equal(res.body.persona, 'a@x.com');
    assert.equal((await client.json('/whoami')).body.persona, null);
    const echoed = await client.json('/echo', { json: { a: 1 } });
    assert.equal(echoed.status, 200);
  } finally {
    await client.close();
  }
});
