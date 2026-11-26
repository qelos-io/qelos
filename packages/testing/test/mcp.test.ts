import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createMockSdk } from '../src/sdk/index.js';

const redirectUri = 'http://localhost:8088/callback';
const codeVerifier = 'a-verifier-of-the-app-0123456789-0123456789';
const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
const pkce = { redirectUri, codeChallenge, codeChallengeMethod: 'S256', state: 'st' };

function setup(configuration?: object) {
  const { sdk, mock } = createMockSdk({
    seed: {
      personas: [{ email: 'user@x.com', roles: ['user'] }],
      ...(configuration ? { configurations: [{ key: 'mcp-configuration', metadata: configuration }] } : {}),
    },
  });
  const authentication = (sdk as any).authentication;
  /** open the authorize page, as the browser of a user would */
  const authorize = (options: object = pkce, persona = '&persona=user@x.com') =>
    mock.fetch(`${authentication.getMcpAuthorizeUrl(options)}${persona}`);
  const code = async () => new URL((await authorize()).headers.get('location')!).searchParams.get('code')!;
  return { authentication, mock, authorize, code };
}

describe('MCP sign-in', () => {
  test('a user comes back with a code the SDK exchanges for a session', async () => {
    const { authentication, authorize } = setup();
    const response = await authorize();
    assert.equal(response.status, 302);
    const callback = new URL(response.headers.get('location')!);
    assert.deepEqual([callback.origin + callback.pathname, callback.searchParams.get('state')], [redirectUri, 'st']);

    const result = await authentication.exchangeMcpAuthorizationCode({ code: callback.searchParams.get('code'), redirectUri, codeVerifier });
    assert.equal(result.user.email, 'user@x.com');
    assert.ok(result.accessToken && result.refreshToken && result.expiresIn > 0);
    assert.equal((await authentication.getLoggedInUser()).email, 'user@x.com');
  });

  test('a code works once, with its verifier and address', async () => {
    const { authentication, code } = setup();
    const first = await code();
    const exchange = (options: object) => authentication.exchangeMcpAuthorizationCode({ code: first, redirectUri, codeVerifier, ...options });
    await assert.rejects(exchange({ codeVerifier: 'wrong' }), /invalid_grant/);
    await assert.rejects(exchange({ redirectUri: 'http://localhost:8089/callback' }), /invalid_grant/);
    await exchange({});
    await assert.rejects(exchange({}), /invalid_grant/);
  });

  test('without a signed-in user the browser is sent to the login page', async () => {
    const { authorize } = setup();
    const location = (await authorize(pkce, '')).headers.get('location')!;
    assert.match(location, /^\/login\?redirect=/);
    assert.match(decodeURIComponent(location), /\/api\/auth\/mcp\/authorize\?redirect_uri=/);
  });

  test('without PKCE the tokens are in the address', async () => {
    const { authorize } = setup();
    const callback = new URL((await authorize({ redirectUri })).headers.get('location')!);
    assert.deepEqual([!!callback.searchParams.get('access_token'), callback.searchParams.get('token_type')], [true, 'Bearer']);
  });

  test('follows the mcp-configuration of the tenant once there is one', async () => {
    const off = setup({ enabled: false, permittedCallbackUrls: [redirectUri] });
    assert.equal((await off.authorize()).status, 503);

    const on = setup({ enabled: true, permittedCallbackUrls: ['http://localhost:*/callback'] });
    assert.equal((await on.authorize()).status, 302);
    assert.equal((await on.authorize({ ...pkce, redirectUri: 'https://other.example/callback' })).status, 400);
    await assert.rejects(
      on.authentication.exchangeMcpAuthorizationCode({ code: 'x', redirectUri: 'https://other.example/callback', codeVerifier }),
      /redirect_uri is not permitted/,
    );
  });
});
