import '../helpers/production-env';
import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { getApp } from '../../src/app';
import { setConfig } from '../../src/config';
import { secrets } from '../helpers/tokens';

describe('a plugin with neither Qelos credentials nor a refresh token handler', () => {
  test('is refused with an explanation, and the process keeps running', async () => {
    setConfig({ ...secrets, dev: false, qelosUrl: undefined });
    assert.throws(() => getApp(), /you must provide either a refresh token handler or Qelos application credentials/);
    // a startup sign-in used to end the process shortly after this error
    await new Promise((r) => setTimeout(r, 200));
  });
});
