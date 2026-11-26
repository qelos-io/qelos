import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { isAllowedHostHeader, isLoopbackHost, parseServeArgs, serve } from '../src/cli/serve.js';

test('parseServeArgs: defaults, flags and inline values', () => {
  assert.deepEqual(parseServeArgs([]), { port: 0, host: '127.0.0.1' });
  assert.deepEqual(parseServeArgs(['serve', '--dir', 'x', '--port=8080', '--host', 'localhost']), {
    dir: 'x',
    port: 8080,
    host: 'localhost',
  });
  assert.equal(parseServeArgs(['serve', '--strict']).strict, true);
  assert.throws(() => parseServeArgs(['--port', '70000']));
  assert.throws(() => parseServeArgs(['--nope']));
});

test('host helpers', () => {
  assert.ok(isLoopbackHost('127.0.0.1') && isLoopbackHost('localhost') && !isLoopbackHost('0.0.0.0'));
  assert.ok(isAllowedHostHeader('localhost:5000', '127.0.0.1', 5000));
  assert.ok(!isAllowedHostHeader('evil.example:5000', '127.0.0.1', 5000));
  assert.ok(!isAllowedHostHeader(undefined, '127.0.0.1', 5000));
  assert.ok(isAllowedHostHeader('10.0.0.5:5000', '10.0.0.5', 5000));
  assert.ok(!isAllowedHostHeader('localhost:5000', '10.0.0.5', 5000));
});

test('serve: ready line, health endpoint and host rejection', async () => {
  const out: string[] = [];
  const err: string[] = [];
  const handle = await serve([], { out: (m) => out.push(m), err: (m) => err.push(m) });
  try {
    assert.equal(out[0], `QELOS_MOCK_READY ${handle.origin}`);
    assert.ok(!err.some((m) => m.includes('WARNING')));
    const res = await fetch(`${handle.origin}/__qelos_mock__/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    const { port } = new URL(handle.origin);
    const status = await new Promise<number>((resolve, reject) => {
      const r = request(
        { host: '127.0.0.1', port, path: '/__qelos_mock__/health', headers: { host: 'evil.example' } },
        (rs) => {
          rs.resume();
          resolve(rs.statusCode!);
        },
      );
      r.on('error', reject);
      r.end();
    });
    assert.equal(status, 403);
  } finally {
    await handle.close();
  }
});

test('serve: warns when bound to a non-loopback host', async () => {
  const err: string[] = [];
  const handle = await serve(['--host', '0.0.0.0'], { out: () => {}, err: (m) => err.push(m) });
  try {
    assert.ok(err.some((m) => m.includes('WARNING')));
  } finally {
    await handle.close();
  }
});
