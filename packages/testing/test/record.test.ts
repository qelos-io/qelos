import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localizeCookie, parseRecordArgs, record } from '../src/cli/record.js';
import { createMockQelos } from '../src/index.js';

const JWT = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sigsigsigsig';

test('parseRecordArgs: defaults, flags and validation', () => {
  const a = parseRecordArgs(['record', '--target', 'https://t.example.com/some/path', '--port=4000', '--include', '/api/,/x/', '--append']);
  assert.equal(a.target, 'https://t.example.com');
  assert.equal(a.port, 4000);
  assert.deepEqual(a.include, ['/api/', '/x/']);
  assert.equal(a.append, true);
  assert.equal(a.out, './qelos-fixtures');
  assert.throws(() => parseRecordArgs(['record']), /--target/);
  assert.throws(() => parseRecordArgs(['record', '--target', 'ftp://x']), /http/);
  assert.throws(() => parseRecordArgs(['record', '--target', 'nope']), /valid URL/);
  assert.throws(() => parseRecordArgs(['record', '--target', 'http://x', '--wat']), /Unknown argument/);
});

test('localizeCookie drops Domain and Secure only', () => {
  assert.equal(localizeCookie('a=b; Domain=t.example.com; Path=/api; Secure; HttpOnly'), 'a=b; Path=/api; HttpOnly');
});

test('record proxy forwards to the target, returns real responses, records a redacted cassette that replays', async () => {
  const seen: Array<{ url?: string; auth?: string; host?: string }> = [];
  const upstream = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      seen.push({ url: req.url, auth: req.headers.authorization, host: req.headers.host });
      if (req.url === '/api/signin') {
        res.setHeader('set-cookie', 'qlt=abc; Domain=t.example.com; Path=/api; Secure; HttpOnly');
        res.setHeader('content-type', 'application/json');
        return res.end(JSON.stringify({ payload: { token: JWT, user: { email: 'a@x.com' } }, echo: JSON.parse(body) }));
      }
      if (req.url === '/api/plans?active=true') {
        res.setHeader('content-type', 'application/json');
        return res.end(JSON.stringify([{ id: 'p1', name: 'Pro' }]));
      }
      res.statusCode = 302;
      res.setHeader('location', '/elsewhere');
      res.end();
    });
  });
  await new Promise<void>((r) => upstream.listen(0, '127.0.0.1', () => r()));
  const target = `http://127.0.0.1:${(upstream.address() as any).port}`;
  const out = mkdtempSync(join(tmpdir(), 'qelos-record-'));
  const lines: string[] = [];
  const proxy = await record(['record', '--target', target, '--out', out], { out: (m) => lines.push(m), err: (m) => lines.push(m) });
  try {
    assert.ok(lines.some((l) => l.includes('record ready')));

    const signin = await fetch(`${proxy.origin}/api/signin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer real-token-value-123456' },
      body: JSON.stringify({ username: 'a@x.com', password: 'real-password' }),
    });
    assert.equal(signin.status, 200);
    assert.equal(((await signin.json()) as any).payload.token, JWT); // the client still gets the real response
    assert.equal(signin.headers.getSetCookie()[0], 'qlt=abc; Path=/api; HttpOnly');
    assert.equal(seen[0].auth, 'Bearer real-token-value-123456'); // credentials are forwarded
    assert.equal(seen[0].host, new URL(target).host);

    const plans: any = await (await fetch(`${proxy.origin}/api/plans?active=true`)).json();
    assert.equal(plans[0].name, 'Pro');
    const redirect = await fetch(`${proxy.origin}/api/old`, { redirect: 'manual' });
    assert.equal(redirect.status, 302);

    const raw = readFileSync(proxy.file, 'utf8');
    assert.ok(!raw.includes('real-password'));
    assert.ok(!raw.includes(JWT));
    assert.ok(!raw.includes('real-token-value'));
    assert.ok(raw.includes('"/api/plans"') || raw.includes('/api/plans'));

    const mock = createMockQelos({ logger: () => {}, cassette: out });
    const replayed: any = await (await mock.fetch('/api/plans?active=true')).json();
    assert.equal(replayed[0].name, 'Pro');
  } finally {
    await proxy.close();
    upstream.closeAllConnections();
    await new Promise<void>((r) => upstream.close(() => r()));
  }
});
