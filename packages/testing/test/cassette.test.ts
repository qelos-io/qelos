import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRecorder, loadCassette, createMockQelos } from '../src/index.js';

const JWT = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sigsigsigsig';

async function upstream() {
  let n = 0;
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      if (req.url === '/api/signin') return res.end(JSON.stringify({ payload: { token: JWT, refreshToken: 'r-' + 'a'.repeat(40), user: { email: 'a@x.com' } } }));
      if (req.url === '/api/leaky') return res.end(JSON.stringify({ note: `see ${JWT}` }));
      if (req.url === '/api/counter') return res.end(JSON.stringify({ n: ++n }));
      if (req.url === '/api/echo') return res.end(JSON.stringify({ got: JSON.parse(body || '{}') }));
      res.statusCode = 404;
      res.end(JSON.stringify({ message: 'nope' }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  return { base, close: () => new Promise<void>((r) => server.close(() => r())) };
}

const tmp = () => mkdtempSync(join(tmpdir(), 'qelos-cassette-'));

test('records redacted exchanges and replays them through createMockQelos for unimplemented endpoints', async () => {
  const up = await upstream();
  const out = tmp();
  try {
    const rec = createRecorder({ out });
    await rec.fetch(`${up.base}/api/signin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + 'z'.repeat(30) },
      body: JSON.stringify({ username: 'a@x.com', password: 'hunter2-real' }),
    });
    await rec.fetch(`${up.base}/api/counter`);
    await rec.fetch(`${up.base}/api/counter`);
    await rec.fetch(`${up.base}/not-api`); // outside include: not recorded
    assert.equal(rec.exchanges.length, 3);

    const raw = readFileSync(rec.file, 'utf8');
    assert.ok(!raw.includes('hunter2-real'));
    assert.ok(!raw.includes(JWT));
    assert.ok(!raw.includes('authorization'));
    assert.ok(raw.includes('[REDACTED]'));
    assert.ok(raw.includes('a@x.com')); // identities stay readable by default

    const mock = createMockQelos({ logger: () => {}, cassette: out });
    // replay: a different real password still matches because bodies are compared after redaction
    const signin: any = await (await mock.fetch('/api/counter')).json();
    assert.equal(signin.n, 1);
    assert.equal(((await (await mock.fetch('/api/counter')).json()) as any).n, 2);
    assert.equal(((await (await mock.fetch('/api/counter')).json()) as any).n, 2); // last repeats
    const miss = await mock.fetch('/api/never-recorded');
    assert.equal(miss.status, 404);
    assert.equal(((await miss.json()) as any).code, 'QELOS_MOCK_CASSETTE_MISS');
  } finally {
    await up.close();
  }
});

test('request bodies are matched after redaction', async () => {
  const up = await upstream();
  const out = tmp();
  try {
    const rec = createRecorder({ out });
    await rec.fetch(`${up.base}/api/echo`, { method: 'POST', body: JSON.stringify({ a: 1, password: 'one' }) });
    const cassette = loadCassette(out);
    const same = await cassette.respond(new Request('http://x/api/echo', { method: 'POST', body: JSON.stringify({ a: 1, password: 'two' }) }));
    assert.equal(same.status, 200);
    const other = await cassette.respond(new Request('http://x/api/echo', { method: 'POST', body: JSON.stringify({ a: 2 }) }));
    assert.equal(other.status, 404);
    assert.ok(((await other.json()) as any).closest.length >= 1);
  } finally {
    await up.close();
  }
});

test('the secret scan fails closed; redact hook fixes it; allowUnredacted overrides', async () => {
  const up = await upstream();
  try {
    const rec = createRecorder({ out: tmp() });
    await assert.rejects(() => rec.fetch(`${up.base}/api/leaky`), /still contains a JWT/);
    assert.equal(rec.exchanges.length, 0);

    const fixed = createRecorder({
      out: tmp(),
      redact: (e) => ({ ...e, responseBody: { note: 'see [token]' } }),
    });
    await fixed.fetch(`${up.base}/api/leaky`);
    assert.equal(fixed.exchanges.length, 1);

    const lax = createRecorder({ out: tmp(), allowUnredacted: true });
    await lax.fetch(`${up.base}/api/leaky`);
    assert.equal(lax.exchanges.length, 1);
  } finally {
    await up.close();
  }
});

test('refuses to record in production, and a user onMissing still runs for cassette misses', async () => {
  assert.throws(() => createRecorder({ out: tmp(), env: { NODE_ENV: 'production' } }), /production/);
  const mock = createMockQelos({
    logger: () => {},
    cassette: [],
    onMissing: () => new Response('fallback', { status: 202 }),
  });
  assert.equal((await mock.fetch('/api/anything-else')).status, 202);
});
