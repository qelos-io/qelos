import { describe, mock, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// these tests read the compiled output: run `pnpm build` first (CI builds packages before running tests)
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { createMemoryCache } = require(join(root, 'dist', 'memory-cache.js'));
const { createCacheManager } = require(join(root, 'dist', 'index.js'));

describe('memory cache', () => {
  test('stores and reads values', async () => {
    const cache = createMemoryCache();
    await cache.setItem('a', '1', { ttl: 60 });
    assert.equal(await cache.getItem('a'), '1');
    assert.equal(await cache.getItem('missing'), undefined);
  });

  test('setIfNotExists only writes the first time', async () => {
    const cache = createMemoryCache();
    assert.equal(await cache.setIfNotExists('k', 'first', { ttl: 60 }), true);
    assert.equal(await cache.setIfNotExists('k', 'second', { ttl: 60 }), false);
    assert.equal(await cache.getItem('k'), 'first');
  });

  test('the periodic sweep removes expired keys and keeps the others', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
    const cache = createMemoryCache();
    await cache.setItem('short', 'x', { ttl: 1 });
    await cache.setItem('long', 'y', { ttl: 3600 });
    await cache.setItem('forever', 'z', {});
    t.mock.timers.tick(6000);
    assert.equal(await cache.getItem('short'), undefined);
    assert.equal(await cache.getItem('long'), 'y');
    assert.equal(await cache.getItem('forever'), 'z');
  });

  test('works through the cache manager, with its default ttl', async () => {
    const manager = createCacheManager(createMemoryCache(), { ttl: 60 });
    await manager.setItem('m', 'v');
    assert.equal(await manager.getItem('m'), 'v');
    assert.equal(await manager.wrap('w', () => 'computed'), 'computed');
    // wrap() stores the computed value in the background (setImmediate)
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(await manager.wrap('w', () => 'not used'), 'computed');
  });
});

describe('process lifetime', () => {
  const run = (code) =>
    spawnSync(process.execPath, ['--no-warnings', '-e', code], { cwd: root, timeout: 5000, encoding: 'utf8' });

  test('a process that only creates a memory cache exits by itself', () => {
    const result = run(`require('./dist/memory-cache').createMemoryCache(); console.log('created')`);
    assert.equal(result.error, undefined, 'the process kept running (the sweep interval is holding it)');
    assert.equal(result.status, 0);
    assert.match(result.stdout, /created/);
  });

  test('the sweep timer is still created (every 5 s) but does not hold the process', () => {
    const out = execFileSync(
      process.execPath,
      ['--no-warnings', '-e', `
        const timers = [];
        const original = global.setInterval;
        global.setInterval = (fn, ms) => { const t = original(fn, ms); timers.push({ ms, t }); return t; };
        require('./dist/memory-cache').createMemoryCache();
        console.log(JSON.stringify(timers.map(({ ms, t }) => ({ ms, hasRef: t.hasRef() }))));
        process.exit(0);
      `],
      { cwd: root, encoding: 'utf8' },
    );
    assert.deepEqual(JSON.parse(out.trim()), [{ ms: 5000, hasRef: false }]);
  });
});
