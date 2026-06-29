import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTargetPath,
  isExternalOAuthLocation,
  publicHostForUpstream,
} from './proxy-request.ts';

describe('buildTargetPath', () => {
  it('uses rawQuery when present', () => {
    assert.equal(
      buildTargetPath({
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
