import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
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
    // the persona travels as a header and as a cookie (integrators forward cookies only), next to the session cookies
    assert.equal(res.body.cookie, 'sid=abc; qelos_mock_persona=a%40x.com');
    assert.equal(res.body.persona, 'a@x.com');
    // a caller that sets its own cookie header is left alone
    assert.equal((await client.as('a@x.com').json('/whoami', { headers: { cookie: 'own=1' } })).body.cookie, 'own=1');
    assert.equal((await client.json('/whoami')).body.persona, null);
    const echoed = await client.json('/echo', { json: { a: 1 } });
    assert.equal(echoed.status, 200);
  } finally {
    await client.close();
  }
});

test('testApp closes a server it had to start, and leaves an already listening one alone', async () => {
  const idle = createServer((_req, res) => res.end('ok'));
  const client = await testApp(idle);
  assert.equal((await client.fetch('/')).status, 200);
  await client.close();
  assert.equal(idle.listening, false);

  const running = createServer((_req, res) => res.end('ok'));
  await new Promise<void>((r) => running.listen(0, '127.0.0.1', () => r()));
  const other = await testApp(running);
  await other.close();
  assert.equal(running.listening, true);
  running.close();
});
