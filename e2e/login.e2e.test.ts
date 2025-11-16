import QelosAdministratorSDK from '@qelos/sdk/administrator';
import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { setTimeout } from 'node:timers/promises';

describe('Login', () => {

  async function login() {
    const sdk = new QelosAdministratorSDK({
      fetch: fetch,
      appUrl: 'http://localhost:3000',
      forceRefresh: true
    });

    const data = await sdk.authentication.oAuthSignin({
      username: 'test@test.com',
      password: 'admin'
    });

    return {
      sdk, data
    }
  }

  test('should login', async () => {
    const { sdk, data } = await login();

    assert.equal(typeof data.payload, 'object');
    ['refreshToken', 'token', 'user', 'workspace'].map(key => {
      assert.ok(data.payload[key], 'Missing ' + key);
    })
  });

  test('should refresh token automatically', async () => {
    // you need to run auth service with env var: TOKEN_EXPIRATION=5s (default is 300m)
    const { sdk, data } = await login();

    assert.equal(sdk.authentication.accessToken, data.payload.token);

    await setTimeout(5100);
    const user = await sdk.authentication.getLoggedInUser();

    assert.equal(user.username, data.payload.user.username);
    assert.notEqual(sdk.authentication.accessToken, data.payload.token);
  });

});