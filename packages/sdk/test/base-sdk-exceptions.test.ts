import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import BaseSDK from '../src/base-sdk';
import { QelosSDKOptions } from '../src/types';

/**
 * Tests for BaseSDK exception handling in callJsonApi method
 * 
 * These tests verify that the BaseSDK correctly handles various error scenarios:
 * - Errors during initial API call
 * - Errors during response parsing
 * - Errors during token refresh
 * - Errors when calling onFailedRefreshToken
 * - Non-JSON responses with error status
 */
test('BaseSDK exception handling', async (t) => {
  // Mock response factory to simulate different responses
  const createMockResponse = (status: number, data: any, contentType = 'application/json') => {
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    const res = new Response(body);
    Object.defineProperty(res, 'status', { value: status });
    Object.defineProperty(res, 'ok', { value: status >= 200 && status < 300 });
    res.headers.set('Content-Type', contentType);
    return res;
  };

  // Setup function to create BaseSDK instances with different configurations
  const setup = (config: {
    failInitialCall?: boolean;
    failExtraHeaders?: boolean;
    failRefreshToken?: boolean;
    failOnFailedRefreshToken?: boolean;
    invalidJsonResponse?: boolean;
    nonJsonErrorResponse?: boolean;
    forceRefresh?: boolean;
  } = {}) => {
    // Mock fetch function that returns different responses based on configuration
    const mockFetch = async (input: RequestInfo, init?: RequestInit) => {
      const url = input.toString();
      // Simulate network failure for initial API call
      if (config.failInitialCall) {
        throw new Error('Network error');
      }

      // Return different responses based on URL and configuration
      if (url.includes('/api/test-endpoint')) {
        if (config.invalidJsonResponse) {
          return createMockResponse(200, '{invalid-json}', 'application/json');
        }
        if (config.nonJsonErrorResponse) {
          return createMockResponse(400, 'Bad request error message', 'text/plain');
        }
        return createMockResponse(401, { error: 'Unauthorized' });
      }

      if (url.includes('/api/token/refresh')) {
        if (config.failRefreshToken) {
          return createMockResponse(401, { error: 'Invalid refresh token' });
        }
        return createMockResponse(200, {
          payload: {
            token: 'new-access-token',
            refreshToken: 'new-refresh-token',
            user: { _id: 'user123', username: 'testuser' }
          }
        });
      }

      return createMockResponse(404, { error: 'Not found' });
    };

    // Create extraHeaders function based on configuration
    const extraHeaders = async (relativeUrl: string, forceRefresh = false): Promise<{ [key: string]: string }> => {
      if (config.failExtraHeaders) {
        throw new Error('could not get extra headers');
      }
      // For token refresh tests, don't return authorization header if it's a refresh attempt
      if (forceRefresh && config.failRefreshToken) {
        return {}; // Empty object but still conforms to the expected return type
      }
      return { authorization: 'Bearer test-token' };
    };

    // Create onFailedRefreshToken function based on configuration
    const onFailedRefreshToken = async () => {
      if (config.failOnFailedRefreshToken) {
        throw new Error('Failed to handle refresh token');
      }
    };

    // Initialize SDK options
    const options: QelosSDKOptions = {
      appUrl: 'http://localhost:3000',
      fetch: mockFetch,
      extraHeaders,
      forceRefresh: config.forceRefresh !== false,
      onFailedRefreshToken: config.failOnFailedRefreshToken !== undefined ? onFailedRefreshToken : undefined
    };

    return new BaseSDK(options);
  };

  await t.test('should handle network errors during initial API call', async () => {
    const sdk = setup({ failInitialCall: true });

    try {
      await sdk.callJsonApi('/api/test-endpoint');
      assert.fail('Should have thrown an error for network failure');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'Network error');
    }
  });

  await t.test('should handle errors during extraHeaders call', async () => {
    const sdk = setup({ failExtraHeaders: true });

    try {
      await sdk.callJsonApi('/api/test-endpoint');
      assert.fail('Should have thrown an error for extraHeaders failure');
    } catch (error) {
      assert.ok(error instanceof Error);
      // The BaseSDK implementation will try to refresh the token when extraHeaders fails
      // and then throw 'could not able to refresh token' if no onFailedRefreshToken is provided
      assert.equal(error.message, 'could not able to refresh token');
    }
  });

  await t.test('should handle failed token refresh', async () => {
    const sdk = setup({ failRefreshToken: true, forceRefresh: true });

    try {
      await sdk.callJsonApi('/api/test-endpoint');
      assert.fail('Should have thrown an error when token refresh fails');
    } catch (error) {
      assert.ok(error instanceof Error);
      // When token refresh fails and no onFailedRefreshToken is provided
      assert.equal(error.message, 'could not able to refresh token');
    }
  });

  await t.test('should handle errors in onFailedRefreshToken callback', async () => {
    const sdk = setup({ 
      failRefreshToken: true, 
      failOnFailedRefreshToken: true,
      forceRefresh: true 
    });

    try {
      await sdk.callJsonApi('/api/test-endpoint');
      assert.fail('Should have thrown an error when onFailedRefreshToken fails');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'could not handle failed refresh token');
    }
  });

  await t.test('should handle invalid JSON responses', async () => {
    const sdk = setup({ invalidJsonResponse: true });

    try {
      await sdk.callJsonApi('/api/test-endpoint');
      assert.fail('Should have thrown an error for invalid JSON');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes('JSON'));
    }
  });

  await t.test('should handle non-JSON error responses', async () => {
    const sdk = setup({ nonJsonErrorResponse: true });

    try {
      await sdk.callJsonApi('/api/test-endpoint');
      assert.fail('Should have thrown an error for non-JSON error response');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'Bad request error message');
    }
  });

  await t.test('should handle errors during token refresh after extraHeaders error', async () => {
    const sdk = setup({ 
      failExtraHeaders: true,
      failRefreshToken: true,
      forceRefresh: true 
    });

    try {
      await sdk.callJsonApi('/api/test-endpoint');
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'could not able to refresh token');
    }
  });
});
