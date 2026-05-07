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
    config: { appUrl: 'https://full.example' },
    resolveWorkspace: async () => null,
  };
  const out = normalizeModuleOptions(full);
  assert.strictEqual(out, full);
});
