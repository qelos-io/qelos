const { describe, test } = require('node:test');
const assert = require('node:assert');

const config = require('../../config');
const middleware = require('./internal-call-check');

describe('internal-call-check', () => {

  describe('when request includes valid secret', () => {
    test('should continue with express middlewares', () => {
      let called = false;
      const next = () => { called = true; };
      const req = { headers: { internal_secret: config.internalSecret } };

      middleware(req, {}, next);

      assert.ok(called);
    });
  });

  describe('when request not includes valid secret', () => {
    test('should response not authorized to user', () => {
      const req = { headers: { internal_secret: 'wrong-secret-value' } };

      let statusCode;
      let jsonBody;
      let ended = false;
      const res = {
        status(code) { statusCode = code; return this; },
        json(body) { jsonBody = body; return this; },
        end() { ended = true; return this; },
      };

      middleware(req, res);

      assert.strictEqual(statusCode, 401);
      assert.deepStrictEqual(jsonBody, { message: 'you are not allowed' });
      assert.ok(ended);
    });
  });

});
