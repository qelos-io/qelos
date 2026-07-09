import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTargetPath,
  isExternalOAuthLocation,
  isUpstreamApiHost,
  publicHostForUpstream,
} from './proxy-request.ts';

describe('buildTargetPath', () => {
  it('uses rawQuery when present', () => {
    assert.equal(
      buildTargetPath({
        path: '/.netlify/functions/qelos-api-proxy',
        rawUrl: '/api/auth/linkedin',
        rawQuery: 'redirectUrl=https%3A%2F%2Fapp.example.com%2Fcallback&state=abc',
      }),
      '/api/auth/linkedin?redirectUrl=https%3A%2F%2Fapp.example.com%2Fcallback&state=abc',
    );
  });

  it('falls back to search embedded in rawUrl', () => {
    assert.equal(
      buildTargetPath({
        rawUrl: '/api/auth/linkedin?redirectUrl=https%3A%2F%2Fapp.example.com%2Fcallback',
      }),
      '/api/auth/linkedin?redirectUrl=https%3A%2F%2Fapp.example.com%2Fcallback',
    );
  });

  it('falls back to queryStringParameters', () => {
    assert.equal(
      buildTargetPath({
        rawUrl: '/api/auth/linkedin',
        queryStringParameters: {
          redirectUrl: 'https://app.example.com/api/auth/linkedin/callback',
          state: 'abc',
        },
      }),
      '/api/auth/linkedin?redirectUrl=https%3A%2F%2Fapp.example.com%2Fapi%2Fauth%2Flinkedin%2Fcallback&state=abc',
    );
  });

  it('prefers /api path and query from event.path when rawUrl targets the function', () => {
    assert.equal(
      buildTargetPath({
        path: '/api/auth/linkedin?redirectUrl=https%3A%2F%2Fapp.example.com%2Fapi%2Fauth%2Flinkedin%2Fcallback&state=abc',
        rawUrl: 'https://app.example.com/.netlify/functions/qelos-api-proxy',
        rawQuery: '',
        queryStringParameters: null,
      }),
      '/api/auth/linkedin?redirectUrl=https%3A%2F%2Fapp.example.com%2Fapi%2Fauth%2Flinkedin%2Fcallback&state=abc',
    );
  });
});

describe('publicHostForUpstream', () => {
  it('prefers x-forwarded-host over host', () => {
    assert.equal(
      publicHostForUpstream(
        {
          headers: {
            host: 'admin.example.com',
            'x-forwarded-host': 'app.example.com',
          },
          rawUrl: '/api/me',
        },
        '159.203.152.168',
      ),
      'app.example.com',
    );
  });

  it('prefers rawUrl host over upstream API host header', () => {
    assert.equal(
      publicHostForUpstream(
        {
          headers: {
            host: 'admin.example.com',
          },
          rawUrl: 'https://app.example.com/api/auth/linkedin',
        },
        'admin.example.com',
      ),
      'app.example.com',
    );
  });
});

describe('isUpstreamApiHost', () => {
  it('treats configured upstream host as internal', () => {
    assert.equal(isUpstreamApiHost('admin.example.com', 'https://admin.example.com'), true);
    assert.equal(isUpstreamApiHost('app.example.com', 'https://admin.example.com'), false);
  });
});

describe('isExternalOAuthLocation', () => {
  it('detects LinkedIn authorization URLs', () => {
    assert.equal(
      isExternalOAuthLocation(
        'https://www.linkedin.com/oauth/v2/authorization?redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback',
      ),
      true,
    );
  });

  it('rejects same-origin API redirects', () => {
    assert.equal(isExternalOAuthLocation('https://app.example.com/api/me'), false);
  });
});
