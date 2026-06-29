import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { refreshTokenSecret } from '../../../config';
import {
  appendCallbackParams,
  buildOAuthCallbackRedirectUri,
  buildProviderState,
  buildRedirectUri,
  extractAuthCode,
  extractRedirectUrl,
  extractReturnUrl,
  extractState,
  getOAuthCallbackRedirectUri,
  isReturnUrlSafe,
  isUrlHostInWebsiteUrls,
  normalizeWebsiteHost,
  unpackProviderState,
} from '../social-login-redirect';

const websiteUrls = ['app.example.com', 'localhost:3000', '127.0.0.1'];

function createReq(overrides: Record<string, unknown> = {}) {
  const base = {
    headers: { tenant: 'tenant-1', tenanthost: 'app.example.com' },
    query: {},
    appConfig: { websiteUrls },
  };
  return { ...base, ...overrides } as any;
}

describe('normalizeWebsiteHost', () => {
  it('strips protocol from full URLs', () => {
    assert.equal(normalizeWebsiteHost('https://app.example.com'), 'app.example.com');
  });

  it('keeps host:port entries as-is', () => {
    assert.equal(normalizeWebsiteHost('localhost:3000'), 'localhost:3000');
  });
});

describe('isUrlHostInWebsiteUrls', () => {
  it('accepts URLs whose host is listed', () => {
    assert.equal(isUrlHostInWebsiteUrls('https://app.example.com/page', websiteUrls), true);
    assert.equal(isUrlHostInWebsiteUrls('http://localhost:3000', websiteUrls), true);
  });

  it('rejects relative URLs', () => {
    assert.equal(isUrlHostInWebsiteUrls('/dashboard', websiteUrls), false);
  });

  it('rejects URLs whose host is not listed', () => {
    assert.equal(isUrlHostInWebsiteUrls('https://evil.example.com', websiteUrls), false);
  });
});

describe('buildRedirectUri', () => {
  it('builds https URI from tenanthost', () => {
    assert.equal(
      buildRedirectUri('app.example.com', '/api/auth/google/callback'),
      'https://app.example.com/api/auth/google/callback',
    );
  });

  it('builds http URI when useHttps is false', () => {
    assert.equal(
      buildRedirectUri('app.example.com', '/api/auth/facebook/callback', false),
      'http://app.example.com/api/auth/facebook/callback',
    );
  });

  it('preserves protocol when tenanthost includes it', () => {
    assert.equal(
      buildRedirectUri('http://localhost:3000', '/api/auth/google/callback'),
      'http://localhost:3000/api/auth/google/callback',
    );
  });
});

describe('buildOAuthCallbackRedirectUri', () => {
  it('uses redirectUrl when its host is in websiteUrls', () => {
    assert.equal(
      buildOAuthCallbackRedirectUri(
        '/api/auth/google/callback',
        websiteUrls,
        'http://localhost:3000/app',
        'gateway.example.com',
      ),
      'http://localhost:3000/api/auth/google/callback',
    );
  });

  it('falls back to tenanthost when redirectUrl host is not allowed', () => {
    assert.equal(
      buildOAuthCallbackRedirectUri(
        '/api/auth/google/callback',
        websiteUrls,
        'https://evil.example.com/app',
        'app.example.com',
      ),
      'https://app.example.com/api/auth/google/callback',
    );
  });

  it('falls back to tenanthost when redirectUrl is omitted', () => {
    assert.equal(
      buildOAuthCallbackRedirectUri('/api/auth/google/callback', websiteUrls, null, 'app.example.com'),
      'https://app.example.com/api/auth/google/callback',
    );
  });

  it('returns null when neither redirectUrl nor tenanthost can be used', () => {
    assert.equal(buildOAuthCallbackRedirectUri('/api/auth/google/callback', websiteUrls), null);
  });
});

describe('query extractors', () => {
  it('extractState reads state query param', () => {
    assert.equal(extractState(createReq({ query: { state: 'csrf-token' } })), 'csrf-token');
  });

  it('extractRedirectUrl reads redirectUrl query param', () => {
    assert.equal(
      extractRedirectUrl(createReq({ query: { redirectUrl: 'https://app.example.com' } })),
      'https://app.example.com',
    );
  });

  it('extractReturnUrl reads returnUrl query param', () => {
    assert.equal(
      extractReturnUrl(createReq({ query: { returnUrl: 'https://app.example.com/callback' } })),
      'https://app.example.com/callback',
    );
  });

  it('extractAuthCode reads code query param', () => {
    assert.equal(extractAuthCode(createReq({ query: { code: 'oauth-code' } })), 'oauth-code');
  });
});

describe('buildProviderState / unpackProviderState', () => {
  it('returns raw user state when no returnUrl or redirectUrl', () => {
    const req = createReq({ query: { state: 'plain-state' } });
    assert.equal(buildProviderState(req), 'plain-state');
  });

  it('round-trips returnUrl and redirectUrl through signed state', () => {
    const req = createReq({
      query: {
        state: 'user-state',
        returnUrl: 'https://app.example.com/done',
        redirectUrl: 'http://localhost:3000',
      },
    });
    const packed = buildProviderState(req);
    assert.ok(packed);
    assert.notEqual(packed, 'user-state');

    const callbackReq = createReq({ query: { state: packed } });
    assert.deepEqual(unpackProviderState(callbackReq), {
      userState: 'user-state',
      returnUrl: 'https://app.example.com/done',
      redirectUrl: 'http://localhost:3000',
    });
  });

  it('treats unsigned state as raw user state', () => {
    const req = createReq({ query: { state: 'legacy-state' } });
    assert.deepEqual(unpackProviderState(req), {
      userState: 'legacy-state',
      returnUrl: null,
      redirectUrl: null,
    });
  });
});

describe('getOAuthCallbackRedirectUri', () => {
  it('reads redirectUrl from query on login', () => {
    const req = createReq({
      query: { redirectUrl: 'http://localhost:3000/app' },
    });
    assert.equal(
      getOAuthCallbackRedirectUri(req, '/api/auth/google/callback'),
      'http://localhost:3000/api/auth/google/callback',
    );
  });

  it('reads redirectUrl from signed state on callback', () => {
    const state = jwt.sign({ rd: 'http://localhost:3000' }, refreshTokenSecret, { expiresIn: '10m' });
    const req = createReq({
      headers: { tenant: 'tenant-1' },
      query: { state },
    });
    assert.equal(
      getOAuthCallbackRedirectUri(req, '/api/auth/google/callback'),
      'http://localhost:3000/api/auth/google/callback',
    );
  });
});

describe('isReturnUrlSafe', () => {
  it('accepts relative paths', () => {
    assert.equal(isReturnUrlSafe('/dashboard', websiteUrls), true);
  });

  it('rejects protocol-relative paths', () => {
    assert.equal(isReturnUrlSafe('//evil.example.com', websiteUrls), false);
  });

  it('accepts absolute URLs whose host is listed in websiteUrls', () => {
    assert.equal(isReturnUrlSafe('https://app.example.com/callback', websiteUrls), true);
    assert.equal(isReturnUrlSafe('http://localhost:3000/callback', websiteUrls), true);
    assert.equal(isReturnUrlSafe('https://127.0.0.1/settings', websiteUrls), true);
  });

  it('rejects absolute URLs whose host is not listed in websiteUrls', () => {
    assert.equal(isReturnUrlSafe('https://evil.example.com/callback', websiteUrls), false);
  });

  it('rejects empty returnUrl', () => {
    assert.equal(isReturnUrlSafe('', websiteUrls), false);
  });
});

describe('appendCallbackParams', () => {
  it('appends refresh token to a URL without query string', () => {
    assert.equal(
      appendCallbackParams('https://app.example.com/callback', 'rt-123', 'state-1'),
      'https://app.example.com/callback?rt=rt-123&state=state-1',
    );
  });

  it('appends refresh token to a URL with existing query string', () => {
    assert.equal(
      appendCallbackParams('https://app.example.com/callback?foo=bar', 'rt-123'),
      'https://app.example.com/callback?foo=bar&rt=rt-123',
    );
  });
});
