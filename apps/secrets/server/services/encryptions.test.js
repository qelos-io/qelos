const { describe, test } = require('node:test');
const assert = require('node:assert');

const encryptions = require('./encryptions');

describe('encryptions', () => {

  describe('encrypt function', () => {
    test('should encrypt objects without throwing an error', () => {
      const result = encryptions.encrypt({ a: 1, b: 2, c: true, d: "some text" }, 'abcdefg');

      assert.notStrictEqual(result, undefined);
      assert.strictEqual(typeof result, 'string');
    });

    test('should encrypt when secret is null', () => {
      const result = encryptions.encrypt({ a: 1, b: 2, c: true, d: "some text" }, null);

      assert.notStrictEqual(result, undefined);
      assert.strictEqual(typeof result, 'string');
    });
  });

  describe('hashSecretKey function', () => {
    test('should hash a string', () => {
      const result = encryptions.hashSecretKey('abcd');
      assert.notStrictEqual(result, undefined);
    });
  });

});
