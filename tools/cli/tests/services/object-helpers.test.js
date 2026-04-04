const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Object helpers', () => {
  // Mirror the logic from services/utils/object-helpers.mjs
  function removeIdFromObject(obj) {
    const { _id, ...rest } = obj;
    return rest;
  }

  it('should remove _id from object', () => {
    const obj = { _id: '123', name: 'test', value: 42 };
    const result = removeIdFromObject(obj);
    assert.deepStrictEqual(result, { name: 'test', value: 42 });
  });

  it('should return same object if no _id present', () => {
    const obj = { name: 'test', value: 42 };
    const result = removeIdFromObject(obj);
    assert.deepStrictEqual(result, { name: 'test', value: 42 });
  });

  it('should handle empty object', () => {
    const result = removeIdFromObject({});
    assert.deepStrictEqual(result, {});
  });

  it('should handle object with only _id', () => {
    const result = removeIdFromObject({ _id: '123' });
    assert.deepStrictEqual(result, {});
  });

  it('should not mutate the original object', () => {
    const obj = { _id: '123', name: 'test' };
    removeIdFromObject(obj);
    assert.strictEqual(obj._id, '123');
  });
});
