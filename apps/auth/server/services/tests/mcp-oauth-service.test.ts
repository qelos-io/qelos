import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { refreshTokenSecret } from '../../../config';
import {
  appendAuthorizationCodeRedirect,
  appendTokenRedirect,
  buildAuthorizePath,
  buildConsentPageUrl,
  buildLoginRedirectUrl,
  buildMcpOAuthState,
  buildOAuthDiscoveryDocument,
  buildTenantBaseUrl,
  createAuthorizationCode,
  getAccessTokenExpiresIn,
  isRedirectUriPermitted,
  parseAuthorizeQuery,
  toOAuthTokenResponse,
  unpackMcpOAuthState,
  usesPkce,
  validatePkceMethod,
  verifyPkceChallenge,
} from '../mcp-oauth-service';

const permittedCallbackUrls = [
  'cursor://anysphere.cursor-mcp/oauth/callback',
  'https://claude.ai/api/mcp/auth_callback',
  'https://localhost:6274/oauth/callback',
  'https://chatgpt.com/aip/mcp/oauth/callback',
  'https://app.devin.ai/*',
];

describe('isRedirectUriPermitted', () => {
  it('accepts exact permitted callback URLs', () => {
    assert.equal(
      isRedirectUriPermitted('cursor://anysphere.cursor-mcp/oauth/callback', permittedCallbackUrls),
      true,
    );
    assert.equal(
      isRedirectUriPermitted('https://claude.ai/api/mcp/auth_callback', permittedCallbackUrls),
      true,
    );
  });

  it('accepts wildcard prefix matches', () => {
    assert.equal(
      isRedirectUriPermitted('https://app.devin.ai/oauth/callback', permittedCallbackUrls),
      true,
    );
  });

  it('accepts known-client family matches for Claude', () => {
    assert.equal(
      isRedirectUriPermitted('https://claude.ai/api/mcp/other_callback', permittedCallbackUrls),
      true,
    );
  });

  it('rejects unauthorized redirect URIs with 400 semantics', () => {
    assert.equal(isRedirectUriPermitted('https://evil.example.com/callback', permittedCallbackUrls), false);
    assert.equal(isRedirectUriPermitted('', permittedCallbackUrls), false);
    assert.equal(isRedirectUriPermitted('https://claude.ai/callback', []), false);
  });
});

describe('MCP OAuth state', () => {
  it('round-trips authorize params through signed state', () => {
    const packed = buildMcpOAuthState({
      redirectUri: 'cursor://anysphere.cursor-mcp/oauth/callback',
      state: 'client-state',
      codeChallenge: 'challenge-value',
      codeChallengeMethod: 'S256',
      clientId: 'cursor',
      tenant: 'tenant-1',
    });

    const unpacked = unpackMcpOAuthState(packed);
    assert.deepEqual(unpacked, {
      ru: 'cursor://anysphere.cursor-mcp/oauth/callback',
      s: 'client-state',
      cc: 'challenge-value',
      ccm: 'S256',
      cid: 'cursor',
      t: 'tenant-1',
    });
    assert.equal(usesPkce(unpacked!), true);
  });

  it('rejects expired state tokens', () => {
    const expired = jwt.sign({ ru: 'https://claude.ai/cb', t: 'tenant-1' }, refreshTokenSecret, { expiresIn: -1 });
    assert.equal(unpackMcpOAuthState(expired), null);
  });
});

describe('authorize routing helpers', () => {
  it('builds authorize path with PKCE params', () => {
    const path = buildAuthorizePath({
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      state: 'abc',
      codeChallenge: 'xyz',
      codeChallengeMethod: 'S256',
      tenant: 'tenant-1',
    });

    assert.match(path, /^\/api\/auth\/mcp\/authorize\?/);
    assert.match(path, /redirect_uri=/);
    assert.match(path, /code_challenge=xyz/);
  });

  it('builds login redirect preserving authorize path', () => {
    const authorizePath = '/api/auth/mcp/authorize?redirect_uri=https%3A%2F%2Fclaude.ai';
    assert.equal(
      buildLoginRedirectUrl(authorizePath),
      `/login?redirect=${encodeURIComponent(authorizePath)}`,
    );
  });

  it('builds consent page URL with packed state', () => {
    const packed = buildMcpOAuthState({
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      tenant: 'tenant-1',
    });
    assert.equal(
      buildConsentPageUrl(packed),
      `/mcp/authorize?mcp_state=${encodeURIComponent(packed)}`,
    );
  });

  it('parses authorize query params', () => {
    assert.deepEqual(parseAuthorizeQuery({
      redirect_uri: 'https://claude.ai/cb',
      state: 's1',
      code_challenge: 'cc',
      code_challenge_method: 'S256',
      client_id: 'claude',
    }), {
      redirectUri: 'https://claude.ai/cb',
      state: 's1',
      codeChallenge: 'cc',
      codeChallengeMethod: 'S256',
      clientId: 'claude',
    });
  });
});

describe('PKCE verification', () => {
  it('validates supported code challenge methods', () => {
    assert.equal(validatePkceMethod('S256'), true);
    assert.equal(validatePkceMethod('plain'), true);
    assert.equal(validatePkceMethod('invalid'), false);
  });

  it('verifies S256 code challenges end-to-end', () => {
    const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    assert.equal(verifyPkceChallenge(codeVerifier, codeChallenge, 'S256'), true);
    assert.equal(verifyPkceChallenge('wrong-verifier', codeChallenge, 'S256'), false);
  });

  it('supports plain PKCE method', () => {
    assert.equal(verifyPkceChallenge('plain-value', 'plain-value', 'plain'), true);
    assert.equal(verifyPkceChallenge('other', 'plain-value', 'plain'), false);
  });

  it('completes PKCE redirect and token response shape', () => {
    const code = createAuthorizationCode();
    const redirect = appendAuthorizationCodeRedirect(
      'https://claude.ai/api/mcp/auth_callback',
      code,
      'client-state',
    );

    assert.match(redirect, /code=/);
    assert.match(redirect, /state=client-state/);

    const tokens = {
      accessToken: jwt.sign({ sub: 'user-1' }, refreshTokenSecret, { expiresIn: '5m' }),
      refreshToken: 'refresh-token-value',
      expiresIn: 300,
    };

    assert.deepEqual(toOAuthTokenResponse(tokens), {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: 'Bearer',
      expires_in: 300,
    });
  });
});

describe('token redirect delivery', () => {
  it('delivers tokens in query string by default', () => {
    const redirect = appendTokenRedirect('https://localhost:6274/oauth/callback', {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 300,
    }, 'state-1');

    assert.match(redirect, /access_token=access/);
    assert.match(redirect, /refresh_token=refresh/);
    assert.match(redirect, /state=state-1/);
  });

  it('delivers tokens in URL fragment when requested', () => {
    const redirect = appendTokenRedirect(
      'https://localhost:6274/oauth/callback',
      { accessToken: 'access', refreshToken: 'refresh', expiresIn: 300 },
      null,
      'fragment',
    );

    assert.match(redirect, /#access_token=access/);
  });
});

describe('OAuth discovery', () => {
  it('advertises MCP authorize and token endpoints', () => {
    const doc = buildOAuthDiscoveryDocument('https://app.example.com');
    assert.equal(doc.issuer, 'https://app.example.com');
    assert.equal(doc.authorization_endpoint, 'https://app.example.com/api/auth/mcp/authorize');
    assert.equal(doc.token_endpoint, 'https://app.example.com/api/auth/mcp/token');
    assert.deepEqual(doc.code_challenge_methods_supported, ['S256', 'plain']);
  });

  it('builds tenant base URLs from tenanthost', () => {
    assert.equal(buildTenantBaseUrl('app.example.com'), 'https://app.example.com');
    assert.equal(buildTenantBaseUrl('http://localhost:3000'), 'http://localhost:3000');
  });
});

describe('getAccessTokenExpiresIn', () => {
  it('reads exp claim from access token', () => {
    const token = jwt.sign({ sub: 'user-1' }, refreshTokenSecret, { expiresIn: 120 });
    const expiresIn = getAccessTokenExpiresIn(token);
    assert.ok(expiresIn > 0 && expiresIn <= 120);
  });
});
