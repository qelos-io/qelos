import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LATEST_API_VERSION,
  normalizeAcceptVersionHeader,
  resolveApiVersion,
  SUPPORTED_API_VERSIONS,
  stripApiVersionFromUrl,
} from './api-version';

test('stripApiVersionFromUrl leaves non-versioned URLs unchanged', () => {
  assert.equal(stripApiVersionFromUrl('/api/foo').rewritten, '/api/foo');
  assert.equal(stripApiVersionFromUrl('/internal-api/health').rewritten, '/internal-api/health');
});

test('stripApiVersionFromUrl rewrites /api/v1 prefix and preserves query', () => {
  const r = stripApiVersionFromUrl('/api/v1/blueprints/x?a=1');
  assert.equal(r.rewritten, '/api/blueprints/x?a=1');
  assert.equal(r.pathVersion, 'v1');
});

test('stripApiVersionFromUrl maps bare /api/v1 to /api/', () => {
  const r = stripApiVersionFromUrl('/api/v1');
  assert.equal(r.rewritten, '/api/');
  assert.equal(r.pathVersion, 'v1');
});

test('normalizeAcceptVersionHeader', () => {
  assert.equal(normalizeAcceptVersionHeader('v1'), 'v1');
  assert.equal(normalizeAcceptVersionHeader('V1'), 'v1');
  assert.equal(normalizeAcceptVersionHeader('  v2  '), 'v2');
  assert.equal(normalizeAcceptVersionHeader('bad'), undefined);
  assert.equal(normalizeAcceptVersionHeader(''), undefined);
  assert.equal(normalizeAcceptVersionHeader(undefined), undefined);
});

test('resolveApiVersion defaults to latest', () => {
  const r = resolveApiVersion(undefined, undefined, LATEST_API_VERSION, SUPPORTED_API_VERSIONS);
  assert.ok(!('error' in r));
  if ('version' in r) {
    assert.equal(r.version, LATEST_API_VERSION);
  }
});

test('resolveApiVersion uses path over header when equal', () => {
  const r = resolveApiVersion('v1', 'v1', LATEST_API_VERSION, SUPPORTED_API_VERSIONS);
  assert.ok(!('error' in r));
  if ('version' in r) {
    assert.equal(r.version, 'v1');
  }
});

test('resolveApiVersion rejects path/header mismatch', () => {
  const r = resolveApiVersion('v1', 'v2', LATEST_API_VERSION, SUPPORTED_API_VERSIONS);
  assert.ok('error' in r);
});

test('resolveApiVersion rejects unsupported version', () => {
  const r = resolveApiVersion(undefined, 'v99', LATEST_API_VERSION, SUPPORTED_API_VERSIONS);
  assert.ok('error' in r);
});

test('resolveApiVersion rejects invalid header when header present', () => {
  const r = resolveApiVersion(undefined, 'nope', LATEST_API_VERSION, SUPPORTED_API_VERSIONS);
  assert.ok('error' in r);
});
