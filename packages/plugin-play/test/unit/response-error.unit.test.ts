import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ResponseError } from '../../src/response-error';

describe('ResponseError', () => {
  test('a string message becomes the message and the response message, with a 401 default', () => {
    const error = new ResponseError('not allowed');
    assert.equal(error.message, 'not allowed');
    assert.equal(error.responseMessage, 'not allowed');
    assert.equal(error.status, 401);
    assert.ok(error instanceof Error);
    assert.equal(error.internalMetadata, undefined);
  });

  test('an object keeps itself as internal metadata and uses its message', () => {
    const data = { message: 'quota exceeded', limit: 10 };
    const error = new ResponseError(data, 429);
    assert.equal(error.message, 'quota exceeded');
    assert.equal(error.status, 429);
    assert.deepEqual(error.internalMetadata, data);
  });

  test('a response message can differ from the internal message', () => {
    const error = new ResponseError('db connection refused on 10.0.0.4', 500, 'something went wrong');
    assert.equal(error.message, 'db connection refused on 10.0.0.4');
    assert.equal(error.responseMessage, 'something went wrong');
  });
});
