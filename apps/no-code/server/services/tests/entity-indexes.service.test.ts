import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_INDEXED_PROPERTIES,
  getIndexName,
  getIndexedKeys,
  getIndexedPropertiesError,
  hasIndexedKeysChanged,
  isIndexable,
} from '../entity-indexes.service';

const prop = (type: string, extra: any = {}) => ({ title: 'T', type, description: '', required: false, ...extra }) as any;

describe('entity-indexes.service', () => {
  it('indexes only flagged, scalar properties with plain keys', () => {
    const properties = {
      status: prop('string', { indexed: true }),
      price: prop('number', { indexed: true }),
      note: prop('string'),
      config: prop('object', { indexed: true }),
      file: prop('file', { indexed: true }),
      'a.b': prop('string', { indexed: true }),
      $x: prop('string', { indexed: true }),
    };
    assert.deepEqual(getIndexedKeys(properties), ['price', 'status']);
    assert.equal(isIndexable('note', properties.note), false);
    assert.equal(isIndexable('status', undefined), false);
  });

  it('explains why a flag is refused', () => {
    assert.match(getIndexedPropertiesError({ config: prop('object', { indexed: true }) })!, /"config" cannot be indexed/);
    assert.match(getIndexedPropertiesError({ 'a.b': prop('string', { indexed: true }) })!, /"a.b" cannot be indexed/);
    assert.equal(getIndexedPropertiesError({ ok: prop('string', { indexed: true }), other: prop('string') }), null);
    assert.equal(getIndexedPropertiesError(undefined), null);
  });

  it('caps the indexed properties per blueprint', () => {
    const many = Object.fromEntries(Array.from({ length: MAX_INDEXED_PROPERTIES + 1 }, (_, i) => [`p${i}`, prop('string', { indexed: true })]));
    assert.match(getIndexedPropertiesError(many)!, new RegExp(`at most ${MAX_INDEXED_PROPERTIES}`));
    const allowed = Object.fromEntries(Array.from({ length: MAX_INDEXED_PROPERTIES }, (_, i) => [`p${i}`, prop('string', { indexed: true })]));
    assert.equal(getIndexedPropertiesError(allowed), null);
  });

  it('names indexes deterministically, short, and per tenant/blueprint/key', () => {
    const name = getIndexName('t1', 'orders', 'status');
    assert.equal(name, getIndexName('t1', 'orders', 'status'));
    assert.match(name, /^ix_[0-9a-f]{20}$/);
    assert.notEqual(name, getIndexName('t2', 'orders', 'status'));
    assert.notEqual(name, getIndexName('t1', 'orders2', 'status'));
    assert.notEqual(name, getIndexName('t1', 'orders', 'price'));
  });

  it('detects when the indexed set changed, or a previous build failed', () => {
    const before = { a: prop('string', { indexed: true }), b: prop('string') };
    assert.equal(hasIndexedKeysChanged(before, { ...before, b: prop('number') }), false);
    assert.equal(hasIndexedKeysChanged(before, { ...before, b: prop('string', { indexed: true }) }), true);
    assert.equal(hasIndexedKeysChanged(before, { b: prop('string') }), true);
    assert.equal(hasIndexedKeysChanged(undefined, undefined), false);
    assert.equal(hasIndexedKeysChanged(before, before, { indexes: { a: { state: 'failed', name: 'ix_x' } } }), true);
    assert.equal(hasIndexedKeysChanged(before, before, { indexes: { a: { state: 'ready', name: 'ix_x' } } }), false);
  });
});
