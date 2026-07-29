import * as assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { test } from 'node:test';
import {
  appendMcpAccessDeniedRedirect,
  buildMcpAuthorizePath,
  buildMcpAuthorizePathFromQuery,
  buildMcpConsentPageUrl,
  buildMcpLoginRedirectUrl,
  buildMcpTokenExchangeBody,
  decodeMcpOAuthStatePayload,
  parseMcpCallbackParams,
  resolveMcpLoginRedirect,
} from '../src/mcp-auth';

function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

test('buildMcpAuthorizePath', async (t) => {
  await t.test('builds authorize path with required redirect_uri', () => {
    const path = buildMcpAuthorizePath({
      redirectUri: 'cursor://anysphere.cursor-mcp/oauth/callback',
    });
    assert.match(path, /^\/api\/auth\/mcp\/authorize\?/);
    const parsed = new URL(`https://gateway.example.com${path}`);
    assert.equal(
      parsed.searchParams.get('redirect_uri'),
      'cursor://anysphere.cursor-mcp/oauth/callback',
    );
  });

  await t.test('includes optional PKCE and client params', () => {
    const path = buildMcpAuthorizePath({
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      state: 'csrf-9',
      codeChallenge: 'abc123',
      codeChallengeMethod: 'S256',
      clientId: 'claude',
    });
    const parsed = new URL(`https://gateway.example.com${path}`);
    assert.equal(parsed.searchParams.get('state'), 'csrf-9');
    assert.equal(parsed.searchParams.get('code_challenge'), 'abc123');
    assert.equal(parsed.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(parsed.searchParams.get('client_id'), 'claude');
  });
});

test('getMcpAuthorizeUrl', async (t) => {
  const { default: QelosSDK } = await import('../src/index');

  await t.test('returns absolute authorize URL', () => {
    const sdk = new QelosSDK({ appUrl: 'https://gateway.example.com' });
    const url = sdk.authentication.getMcpAuthorizeUrl({
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      state: 's1',
    });
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://gateway.example.com');
    assert.equal(parsed.pathname, '/api/auth/mcp/authorize');
    assert.equal(parsed.searchParams.get('redirect_uri'), 'https://claude.ai/api/mcp/auth_callback');
    assert.equal(parsed.searchParams.get('state'), 's1');
  });
});

test('parseMcpCallbackParams', async (t) => {
  await t.test('parses code and state from full URL', () => {
    assert.deepEqual(
      parseMcpCallbackParams('https://claude.ai/api/mcp/auth_callback?code=abc&state=xyz'),
      { code: 'abc', state: 'xyz' },
    );
  });

  await t.test('parses error params from callback URL', () => {
    assert.deepEqual(
      parseMcpCallbackParams('cursor://cb?error=access_denied&state=xyz'),
      { error: 'access_denied', state: 'xyz' },
    );
  });

  await t.test('parses URL / URLSearchParams / query objects', () => {
    assert.deepEqual(
      parseMcpCallbackParams(new URL('http://_/cb?code=u&state=v')),
      { code: 'u', state: 'v' },
    );
    assert.deepEqual(
      parseMcpCallbackParams(new URLSearchParams('code=w&state=x')),
      { code: 'w', state: 'x' },
    );
    assert.deepEqual(parseMcpCallbackParams({ code: 'y', state: 'z' }), { code: 'y', state: 'z' });
    assert.deepEqual(parseMcpCallbackParams({ error: ['denied'] }), { error: 'denied' });
  });

  await t.test('parses fragment delivery params', () => {
    assert.deepEqual(
      parseMcpCallbackParams('https://app.example/cb#code=frag-code&state=frag-state'),
      { code: 'frag-code', state: 'frag-state' },
    );
  });

  await t.test('returns empty object when params missing', () => {
    assert.deepEqual(parseMcpCallbackParams('/no-query'), {});
    assert.deepEqual(parseMcpCallbackParams({}), {});
  });
});

test('exchangeMcpAuthorizationCode', async (t) => {
  const { default: QelosSDK } = await import('../src/index');

  await t.test('posts PKCE token exchange and returns tokens with user', async () => {
    const codeVerifier = randomBytes(32).toString('base64url');
    const redirectUri = 'https://claude.ai/api/mcp/auth_callback';
    const calls: { url: string; init?: RequestInit }[] = [];

    const sdk = new QelosSDK({
      appUrl: 'https://gateway.example.com',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init });
        if (String(url).endsWith('/api/auth/mcp/token')) {
          const body = init?.body ? String(init.body) : '';
          const params = new URLSearchParams(body);
          assert.equal(params.get('grant_type'), 'authorization_code');
          assert.equal(params.get('code'), 'auth-code-1');
          assert.equal(params.get('redirect_uri'), redirectUri);
          assert.equal(params.get('code_verifier'), codeVerifier);
          return new Response(
            JSON.stringify({
              access_token: 'at-1',
              refresh_token: 'rt-1',
              token_type: 'Bearer',
              expires_in: 18000,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        if (String(url).endsWith('/api/me')) {
          return new Response(
            JSON.stringify({ _id: 'u1', username: 'jane', email: 'jane@example.com' }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        return new Response('not found', { status: 404 });
      },
    });

    const result = await sdk.authentication.exchangeMcpAuthorizationCode({
      code: 'auth-code-1',
      redirectUri,
      codeVerifier,
    });

    assert.equal(result.accessToken, 'at-1');
    assert.equal(result.refreshToken, 'rt-1');
    assert.equal(result.expiresIn, 18000);
    assert.equal(result.user._id, 'u1');
    assert.equal(calls.length, 2);
    assert.match(calls[0]!.url, /\/api\/auth\/mcp\/token$/);
    assert.match(calls[1]!.url, /\/api\/me$/);
    assert.equal(
      (calls[0]!.init?.headers as Record<string, string>)['content-type'],
      'application/x-www-form-urlencoded',
    );
  });

  await t.test('buildMcpTokenExchangeBody matches authorize PKCE pair', () => {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = pkceChallenge(verifier);
    const path = buildMcpAuthorizePath({
      redirectUri: 'cursor://anysphere.cursor-mcp/oauth/callback',
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
    });
    const authorizeParams = new URL(`https://gateway.example.com${path}`).searchParams;
    assert.equal(authorizeParams.get('code_challenge'), challenge);
    assert.equal(authorizeParams.get('code_challenge_method'), 'S256');

    const body = buildMcpTokenExchangeBody({
      code: 'c1',
      redirectUri: 'cursor://anysphere.cursor-mcp/oauth/callback',
      codeVerifier: verifier,
    });
    assert.equal(body.get('code_verifier'), verifier);
  });
});

test('mcp authorize page helpers', async (t) => {
  await t.test('buildMcpLoginRedirectUrl encodes authorize path', () => {
    const authorizePath = '/api/auth/mcp/authorize?redirect_uri=https%3A%2F%2Fclaude.ai';
    assert.equal(
      buildMcpLoginRedirectUrl(authorizePath),
      `/login?redirect=${encodeURIComponent(authorizePath)}`,
    );
  });

  await t.test('buildMcpConsentPageUrl encodes mcp_state', () => {
    assert.equal(
      buildMcpConsentPageUrl('signed.jwt.state'),
      `/mcp/authorize?mcp_state=${encodeURIComponent('signed.jwt.state')}`,
    );
  });

  await t.test('buildMcpAuthorizePathFromQuery mirrors authorize params', () => {
    const path = buildMcpAuthorizePathFromQuery({
      redirect_uri: 'cursor://anysphere.cursor-mcp/oauth/callback',
      state: 's1',
      code_challenge: 'cc',
      code_challenge_method: 'S256',
      client_id: 'cursor',
    });
    assert.ok(path);
    const parsed = new URL(`https://gateway.example.com${path}`);
    assert.equal(parsed.searchParams.get('redirect_uri'), 'cursor://anysphere.cursor-mcp/oauth/callback');
    assert.equal(parsed.searchParams.get('state'), 's1');
    assert.equal(parsed.searchParams.get('code_challenge'), 'cc');
    assert.equal(parsed.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(parsed.searchParams.get('client_id'), 'cursor');
  });

  await t.test('resolveMcpLoginRedirect prefers redirect, then mcp_state, then authorize query', () => {
    assert.equal(
      resolveMcpLoginRedirect({ redirect: '/api/auth/mcp/authorize?redirect_uri=x' }),
      '/api/auth/mcp/authorize?redirect_uri=x',
    );
    assert.equal(
      resolveMcpLoginRedirect({ mcp_state: 'jwt' }),
      `/mcp/authorize?mcp_state=${encodeURIComponent('jwt')}`,
    );
    assert.equal(
      resolveMcpLoginRedirect({ redirect_uri: 'https://claude.ai/cb' }),
      '/api/auth/mcp/authorize?redirect_uri=https%3A%2F%2Fclaude.ai%2Fcb',
    );
    assert.equal(resolveMcpLoginRedirect({}), null);
  });

  await t.test('appendMcpAccessDeniedRedirect adds error and state', () => {
    assert.equal(
      appendMcpAccessDeniedRedirect('cursor://cb?foo=1', 'oauth-state'),
      'cursor://cb?foo=1&error=access_denied&state=oauth-state',
    );
  });

  await t.test('decodeMcpOAuthStatePayload decodes JWT payload without verification', () => {
    const payload = { ru: 'cursor://cb', s: 'oauth-state', t: 'tenant-1', cid: 'cursor' };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `header.${encoded}.signature`;

    assert.deepEqual(decodeMcpOAuthStatePayload(token), {
      redirectUri: 'cursor://cb',
      state: 'oauth-state',
      tenant: 'tenant-1',
      clientId: 'cursor',
    });
    assert.equal(decodeMcpOAuthStatePayload('not-a-jwt'), null);
  });
});
