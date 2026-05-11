import * as assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeModuleOptions } from '../src/module-options';

test('normalizeModuleOptions wraps shorthand Nest config', () => {
  const o = normalizeModuleOptions({
    appUrl: 'https://app.example',
    apiToken: 'tok',
  });
  assert.equal(o.config.appUrl, 'https://app.example');
  assert.equal(o.config.apiToken, 'tok');
});

test('normalizeModuleOptions passes through full module options', () => {
  const full = {
    config: { appUrl: 'https://full.example', disableProxy: true },
    resolveWorkspace: async () => null,
  };
  const out = normalizeModuleOptions(full);
  assert.strictEqual(out, full);
});

test('normalizeModuleOptions prepends /api/ to skipPaths when proxy is enabled', () => {
  const out = normalizeModuleOptions({
    appUrl: 'https://app.example',
    skipPaths: ['/health'],
  });
  assert.deepEqual(out.config.skipPaths, ['/api/', '/health']);
});

test('normalizeModuleOptions does not prepend /api/ when disableProxy is true', () => {
  const out = normalizeModuleOptions({
    appUrl: 'https://app.example',
    skipPaths: ['/health'],
    disableProxy: true,
  });
  assert.deepEqual(out.config.skipPaths, ['/health']);
});
