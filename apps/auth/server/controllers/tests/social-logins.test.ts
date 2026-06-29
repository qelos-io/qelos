import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loginWithGoogle, authCallbackFromGoogle } from '../social-logins/google-login';
import { loginWithGithub, authCallbackFromGithub } from '../social-logins/github-login';
import { loginWithFacebook, authCallbackFromFacebook } from '../social-logins/facebook-login';
import { loginWithLinkedIn, authCallbackFromLinkedIn } from '../social-logins/linkedin-login';
import { createResMock, createSocialReq, getQueryParamFromRedirect } from './social-logins-helpers';

describe('social login controllers', () => {
  describe('loginWithGoogle', () => {
    it('redirects to Google with tenanthost-based callback URI', async () => {
      const mock = createResMock();
      await loginWithGoogle(createSocialReq() as any, mock.res);

      assert.ok(mock.redirectUrl?.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'));
      assert.equal(
        getQueryParamFromRedirect(mock.redirectUrl!, 'redirect_uri'),
        'https://app.example.com/api/auth/google/callback',
      );
      assert.equal(getQueryParamFromRedirect(mock.redirectUrl!, 'client_id'), 'test-client');
    });

    it('uses redirectUrl query param when host is in websiteUrls', async () => {
      const mock = createResMock();
      await loginWithGoogle(
        createSocialReq({
          query: { redirectUrl: 'http://localhost:3000/my-app' },
        }) as any,
        mock.res,
      );

      assert.equal(
        getQueryParamFromRedirect(mock.redirectUrl!, 'redirect_uri'),
        'http://localhost:3000/api/auth/google/callback',
      );
    });

    it('returns 400 when callback URI cannot be resolved', async () => {
      const mock = createResMock();
      await loginWithGoogle(
        createSocialReq({ headers: { tenant: 'tenant-1' } }) as any,
        mock.res,
      );

      assert.equal(mock.statusCode, 400);
      assert.deepEqual(mock.jsonPayload, { message: 'No website URL configured for tenant' });
    });
  });

  describe('authCallbackFromGoogle', () => {
    it('returns 400 when authorization code is missing', async () => {
      const mock = createResMock();
      await authCallbackFromGoogle(createSocialReq({ query: {} }) as any, mock.res);

      assert.equal(mock.statusCode, 400);
      assert.deepEqual(mock.jsonPayload, { message: 'Invalid authorization code' });
    });

    it('returns 400 when callback URI cannot be resolved', async () => {
      const mock = createResMock();
      await authCallbackFromGoogle(
        createSocialReq({
          headers: { tenant: 'tenant-1' },
          query: { code: 'auth-code' },
        }) as any,
        mock.res,
      );

      assert.equal(mock.statusCode, 400);
      assert.deepEqual(mock.jsonPayload, { message: 'No website URL configured for tenant' });
    });
  });

  describe('loginWithGithub', () => {
    it('redirects to GitHub with tenanthost-based callback URI', async () => {
      const mock = createResMock();
      await loginWithGithub(createSocialReq() as any, mock.res);

      assert.ok(mock.redirectUrl?.startsWith('https://github.com/login/oauth/authorize?'));
      assert.equal(
        getQueryParamFromRedirect(mock.redirectUrl!, 'redirect_uri'),
        'https://app.example.com/api/auth/github/callback',
      );
    });
  });

  describe('authCallbackFromGithub', () => {
    it('returns 400 when authorization code is missing', async () => {
      const mock = createResMock();
      await authCallbackFromGithub(createSocialReq() as any, mock.res);

      assert.equal(mock.statusCode, 400);
      assert.deepEqual(mock.jsonPayload, { message: 'Invalid authorization code' });
    });
  });

  describe('loginWithFacebook', () => {
    it('redirects to Facebook with http callback URI', async () => {
      const mock = createResMock();
      await loginWithFacebook(createSocialReq() as any, mock.res);

      assert.ok(mock.redirectUrl?.startsWith('https://www.facebook.com/v15.0/dialog/oauth?'));
      assert.equal(
        getQueryParamFromRedirect(mock.redirectUrl!, 'redirect_uri'),
        'http://app.example.com/api/auth/facebook/callback',
      );
    });
  });

  describe('authCallbackFromFacebook', () => {
    it('returns 400 when authorization code is missing', async () => {
      const mock = createResMock();
      await authCallbackFromFacebook(createSocialReq() as any, mock.res);

      assert.equal(mock.statusCode, 400);
      assert.deepEqual(mock.jsonPayload, { message: 'Invalid authorization code' });
    });
  });

  describe('loginWithLinkedIn', () => {
    it('redirects to LinkedIn with tenanthost-based callback URI', async () => {
      const mock = createResMock();
      await loginWithLinkedIn(createSocialReq() as any, mock.res);

      assert.ok(mock.redirectUrl?.startsWith('https://www.linkedin.com/oauth/v2/authorization?'));
      assert.equal(
        getQueryParamFromRedirect(mock.redirectUrl!, 'redirect_uri'),
        'https://app.example.com/api/auth/linkedin/callback',
      );
    });

    it('uses redirectUrl query param as OAuth callback when it is a full callback URL', async () => {
      const mock = createResMock();
      await loginWithLinkedIn(
        createSocialReq({
          headers: { tenant: 'tenant-1', tenanthost: 'admin.example.com' },
          query: {
            redirectUrl: 'https://app.example.com/api/auth/linkedin/callback',
          },
        }) as any,
        mock.res,
      );

      assert.equal(
        getQueryParamFromRedirect(mock.redirectUrl!, 'redirect_uri'),
        'https://app.example.com/api/auth/linkedin/callback',
      );
    });
  });

  describe('authCallbackFromLinkedIn', () => {
    it('returns 400 when authorization code is missing', async () => {
      const mock = createResMock();
      await authCallbackFromLinkedIn(createSocialReq() as any, mock.res);

      assert.equal(mock.statusCode, 400);
      assert.deepEqual(mock.jsonPayload, { message: 'Invalid authorization code' });
    });
  });
});
