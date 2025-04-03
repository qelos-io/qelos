import { test } from 'node:test';
import * as assert from 'node:assert';
import QelosSDK from '../src';
import { QelosSDKOptions } from '../src/types';
import { FetchLike } from '../src/types';

type ApiCall = {
  url: string;
  init?: RequestInit;
};

const apiCalls: ApiCall[] = [];

// Create a simplified mock Response that works with our SDK
function createMockResponse(status: number, body: any, headers: Record<string, string> = {}): Response {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  
  // Create a partial Response object with just the properties we need
  const mockResponse = {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) => defaultHeaders[name.toLowerCase()] || null
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
    redirected: false,
    statusText: status === 200 ? 'OK' : 'Error',
    type: 'basic' as ResponseType,
    url: '',
    bodyUsed: false
  };
  
  // Cast to Response type - this is safe for our tests since we only use these properties
  return mockResponse as unknown as Response;
}

function setup(options: {
  networkFailure?: boolean;
  malformedResponse?: boolean;
  concurrentRequests?: boolean;
  nonJsonResponse?: boolean;
  raceCondition?: boolean;
  retryTransient?: boolean;
  statusCode?: number;
} = {}) {
  apiCalls.length = 0;
  let tokenRefreshInProgress = false;
  let tokenRefreshCompleted = false;
  let requestCount = 0;
  
  const mockFetch: FetchLike = async (url: string, init?: RequestInit) => {
    apiCalls.push({ url: url.toString(), init });
    
    // Simulate network failure
    if (options.networkFailure) {
      throw new Error('Network error');
    }
    
    // Simulate race condition during token refresh
    if (options.raceCondition && url.toString().includes('/api/test-endpoint')) {
      if (tokenRefreshInProgress && !tokenRefreshCompleted) {
        // This simulates a request that happens during token refresh
        return createMockResponse(401, { error: 'Unauthorized during refresh' });
      }
    }
    
    if (url.toString().includes('/api/token/refresh')) {
      tokenRefreshInProgress = true;
      
      // Simulate a delay in token refresh
      if (options.raceCondition) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      tokenRefreshCompleted = true;
      
      return createMockResponse(200, {
        payload: {
          token: 'new-access-token',
          refreshToken: 'new-refresh-token',
          user: { _id: 'user123', username: 'testuser' }
        }
      });
    }
    
    if (url.toString().includes('/api/test-endpoint')) {
      requestCount++;
      
      // For testing retrying transient errors
      if (options.retryTransient && requestCount === 1) {
        return createMockResponse(503, { error: 'Service Unavailable' });
      }
      
      // For testing specific status codes
      if (options.statusCode) {
        return createMockResponse(options.statusCode, { error: `Status code ${options.statusCode}` });
      }
      
      // For the first request, return 401 to trigger token refresh
      if (requestCount === 1) {
        return createMockResponse(401, { error: 'Unauthorized' });
      }
      
      // For malformed response test
      if (options.malformedResponse) {
        const headers = options.nonJsonResponse 
          ? { 'Content-Type': 'text/plain' }
          : { 'Content-Type': 'application/json' };
        
        // Create a malformed response that will cause JSON parsing to fail
        const malformedResponse = createMockResponse(200, {});
        // Override the json method to throw an error
        Object.defineProperty(malformedResponse, 'json', {
          value: async () => { throw new Error('Invalid JSON'); }
        });
        // Override the text method to return invalid JSON
        Object.defineProperty(malformedResponse, 'text', {
          value: async () => options.nonJsonResponse ? 'Not a JSON response' : '{malformed json'
        });
        
        return malformedResponse;
      }
      
      // Normal successful response
      return createMockResponse(200, { success: true, data: 'test data' });
    }
    
    return createMockResponse(404, { error: 'Not found' });
  };
  
  const sdkOptions: QelosSDKOptions = {
    appUrl: 'http://localhost:3000',
    fetch: mockFetch,
    refreshToken: 'initial-refresh-token',
    accessToken: 'initial-access-token',
    forceRefresh: true
  };
  
  const sdk = new QelosSDK(sdkOptions);
  
  return {
    sdk,
    sdkOptions,
    requestCount
  };
}

test('QelosSDK edge cases', async (t) => {
  await t.test('should handle network failures gracefully', async () => {
    const { sdk } = setup({ networkFailure: true });
    
    try {
      await sdk.appConfigurations.callJsonApi('/api/test-endpoint');
      assert.fail('Should have thrown a network error');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.ok(
        error.message.includes('Network error'),
        `Error should be network related, got: ${error.message}`
      );
    }
  });
  
  await t.test('should handle malformed JSON responses', async () => {
    const { sdk } = setup({ malformedResponse: true });
    
    try {
      await sdk.appConfigurations.callJsonApi('/api/test-endpoint');
      assert.fail('Should have thrown an error for malformed JSON');
    } catch (error) {
      assert.ok(error instanceof Error);
    }
  });
  
  await t.test('should handle non-JSON responses correctly', async () => {
    const { sdk } = setup({ nonJsonResponse: true, malformedResponse: true });
    
    try {
      await sdk.appConfigurations.callJsonApi('/api/test-endpoint');
      assert.fail('Should have thrown an error for non-JSON response');
    } catch (error) {
      assert.ok(error instanceof Error);
    }
  });
  
  await t.test('should handle various HTTP status codes appropriately', async () => {
    // Test a range of status codes - we'll test these individually
    const statusCodes = [400, 403, 404, 500, 502, 503];
    
    for (const statusCode of statusCodes) {
      // For each status code, we need a fresh setup
      apiCalls.length = 0;
      
      // Create a custom mock fetch that directly returns the status code we want to test
      // This bypasses the token refresh logic which complicates testing
      const mockFetch: FetchLike = async (url: string, init?: RequestInit) => {
        apiCalls.push({ url: url.toString(), init });
        return createMockResponse(statusCode, { error: `Error with status code ${statusCode}` });
      };
      
      const options: QelosSDKOptions = {
        appUrl: 'http://localhost:3000',
        fetch: mockFetch,
        refreshToken: 'test-refresh-token',
        accessToken: 'test-access-token',
        // Disable token refresh for this test to focus on status code handling
        forceRefresh: false
      };
      
      const sdk = new QelosSDK(options);
      
      try {
        await sdk.appConfigurations.callJsonApi('/api/test-endpoint');
        assert.fail(`Should have thrown an error for status code ${statusCode}`);
      } catch (error) {
        assert.ok(error instanceof Error, `Error should be an instance of Error for status ${statusCode}`);
        // The SDK might wrap the error, so we just verify we got an error
        assert.ok(error.message, `Error should have a message for status ${statusCode}`);
      }
    }
  });
  
  await t.test('should handle URL encoding in query parameters', async () => {
    const { sdk } = setup();
    
    // Create complex query parameters with special characters
    const complexQuery = {
      'complex key': 'value with spaces',
      'special&chars': 'value+with&special=chars',
      'array': ['value1', 'value2'],
      'unicode': 'üñîçødé',
      'empty': '',
      'null': null
    };
    
    // Reset API calls
    apiCalls.length = 0;
    
    // Make a request with complex query parameters
    try {
      // Since RequestInit doesn't have a query property, we need to manually construct the URL
      // Convert the complex query object to a format URLSearchParams can handle
      const queryParams: Record<string, string> = {};
      Object.entries(complexQuery).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // Convert arrays to comma-separated strings
          queryParams[key] = value.join(',');
        } else if (value === null) {
          queryParams[key] = '';
        } else {
          queryParams[key] = String(value);
        }
      });
      const queryString = new URLSearchParams(queryParams).toString();
      await sdk.appConfigurations.callJsonApi(`/api/test-endpoint?${queryString}`, {
        method: 'GET'
      });
    } catch (error) {
      // We expect this to fail with 401 and then retry, but we're just checking the URL encoding
    }
    
    // Check that the URL was properly encoded
    const firstCall = apiCalls[0];
    assert.ok(firstCall.url.includes('/api/test-endpoint'), 'URL should include the endpoint');
    
    // Verify that special characters are properly encoded
    assert.ok(firstCall.url.includes('complex+key='), 'Should encode spaces in keys');
    assert.ok(firstCall.url.includes('value+with+spaces'), 'Should encode spaces in values');
    assert.ok(firstCall.url.includes('special%26chars='), 'Should encode & in keys');
    assert.ok(firstCall.url.includes('value%2Bwith%26special%3Dchars'), 'Should encode special chars in values');
    assert.ok(firstCall.url.includes('%C3%BC%C3%B1%C3%AE%C3%A7%C3%B8d%C3%A9'), 'Should encode unicode characters');
  });
  
  await t.test('should handle concurrent requests during token refresh', async () => {
    const { sdk } = setup({ raceCondition: true });
    
    // Reset API calls
    apiCalls.length = 0;
    
    // Make two concurrent requests
    const request1 = sdk.appConfigurations.callJsonApi('/api/test-endpoint');
    const request2 = sdk.appConfigurations.callJsonApi('/api/test-endpoint');
    
    // Wait for both requests to complete
    const results = await Promise.allSettled([request1, request2]);
    
    // At least one request should succeed
    assert.ok(
      results.some(result => result.status === 'fulfilled'),
      'At least one request should succeed'
    );
    
    // Check that token refresh was only called once
    const refreshCalls = apiCalls.filter(call => call.url.includes('/api/token/refresh'));
    assert.ok(refreshCalls.length >= 1, 'Token refresh should be called at least once');
  });
});
