---
title: Troubleshooting Guide
---

# {{ $frontmatter.title }}

This guide helps you diagnose and resolve common issues when working with the Qelos SDK. If you encounter problems while using the SDK, follow these troubleshooting steps to identify and fix the issues.

## Authentication Issues

### Problem: 401 Unauthorized Errors

**Symptoms:**
- API calls fail with 401 status code
- User is unexpectedly logged out
- Token refresh attempts fail

**Possible Causes:**
1. Access token has expired and token refresh is not enabled
2. Refresh token has expired or is invalid
3. User credentials are incorrect
4. Authentication headers are missing or malformed

**Solutions:**

1. **Enable automatic token refresh:**

```typescript
const sdk = new QelosSDK({
  appUrl: 'https://your-app-url.com',
  forceRefresh: true
});
```

2. **Implement an onFailedRefreshToken callback:**

```typescript
const sdk = new QelosSDK({
  appUrl: 'https://your-app-url.com',
  forceRefresh: true,
  onFailedRefreshToken: async () => {
    // Redirect to login page
    window.location.href = '/login';
    return null;
  }
});
```

3. **Check authentication state before making requests:**

```typescript
async function callApiWithAuthCheck() {
  // First check if user is authenticated
  try {
    await sdk.authentication.getLoggedInUser();
    // If we get here, authentication is valid
    return sdk.workspaces.getWorkspaces();
  } catch (error) {
    if (error.status === 401) {
      // Redirect to login
      window.location.href = '/login';
      return null;
    }
    throw error;
  }
}
```

### Problem: Token Refresh Loop

**Symptoms:**
- Multiple token refresh requests in quick succession
- Application appears to freeze or crash
- Console shows repeated 401 errors

**Possible Causes:**
1. The refresh token is invalid but the SDK keeps trying to use it
2. The server is consistently rejecting the refresh token
3. There's a race condition with multiple concurrent requests

**Solutions:**

1. **Implement proper error handling in onFailedRefreshToken:**

```typescript
let isRedirecting = false;

const sdk = new QelosSDK({
  appUrl: 'https://your-app-url.com',
  forceRefresh: true,
  onFailedRefreshToken: async () => {
    // Prevent multiple redirects
    if (isRedirecting) return null;
    
    isRedirecting = true;
    console.log('Token refresh failed, redirecting to login');
    
    // Clear auth state
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    
    // Redirect to login
    window.location.href = '/login';
    return null;
  }
});
```

2. **Clear stored tokens when refresh fails:**

Ensure you clear any stored tokens when a refresh attempt fails to prevent further failed attempts.

## Network Issues

### Problem: Network Request Failures

**Symptoms:**
- API calls fail with network errors
- Console shows TypeError or network-related errors
- Requests time out

**Possible Causes:**
1. Network connectivity issues
2. CORS configuration problems
3. Server is down or unreachable
4. Firewall or proxy blocking requests

**Solutions:**

1. **Implement retry logic for transient failures:**

```typescript
async function callWithRetry(fn, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.log(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;
      
      // Only retry for network errors, not for 4xx status codes
      if (error.status && error.status < 500) {
        throw error;
      }
      
      // Wait before retrying (with exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  
  throw lastError;
}

// Usage
try {
  const blueprints = await callWithRetry(() => sdk.blueprints.getList());
  console.log('Success:', blueprints);
} catch (error) {
  console.error('All retry attempts failed:', error);
}
```

2. **Check CORS configuration:**

Ensure your server has proper CORS headers configured if you're making cross-origin requests.

3. **Implement offline detection:**

```typescript
window.addEventListener('online', () => {
  console.log('Back online, retrying pending requests');
  // Retry pending requests
});

window.addEventListener('offline', () => {
  console.log('Connection lost, pausing requests');
  // Pause new requests
});

// Check before making requests
function safeApiCall(endpoint) {
  if (!navigator.onLine) {
    console.log('Offline, cannot make request');
    return Promise.reject(new Error('Currently offline'));
  }
  
  return sdk.workspaces.getList();
}
```

## Data Handling Issues

### Problem: Unexpected Response Formats

**Symptoms:**
- TypeError when accessing response properties
- Undefined values in response data
- Console shows JSON parsing errors

**Possible Causes:**
1. API response format has changed
2. Server returned an error response with a different structure
3. Response is not valid JSON

**Solutions:**

1. **Validate response data before using it:**

```typescript
function isValidUserResponse(data) {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.name === 'string'
  );
}

async function getUser(userId) {
  try {
    const response = await sdk.users.getUser(userId);
    
    if (!isValidUserResponse(response)) {
      console.error('Invalid user response format:', response);
      throw new Error('Invalid response format');
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}
```

2. **Use TypeScript for better type checking:**

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

async function getUser(userId: string): Promise<User> {
  return sdk.users.getUser(userId);
}
```

3. **Handle non-JSON responses:**

```typescript
async function safeJsonCall(endpoint) {
  try {
    return await sdk.workspaces.getList();
  } catch (error) {
    if (error.message.includes('JSON')) {
      console.error('Failed to parse JSON response:', error);
      // Handle the error appropriately
    }
    throw error;
  }
}
```

## Performance Issues

### Problem: Slow API Responses

**Symptoms:**
- API calls take a long time to complete
- UI appears unresponsive during API calls
- Multiple similar requests are made in quick succession

**Possible Causes:**
1. Network latency
2. Server performance issues
3. Inefficient API usage (too many requests)
4. Large response payloads

**Solutions:**

1. **Implement request caching:**

```typescript
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute in milliseconds

async function cachedApiCall(endpoint, options = {}) {
  const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
  
  // Check if we have a valid cached response
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    const age = Date.now() - timestamp;
    
    if (age < CACHE_TTL) {
      console.log(`Using cached response for ${endpoint} (age: ${age}ms)`);
      return data;
    }
  }
  
  // Make the API call
  const response = await sdk.workspaces.getList(options);
  
  // Cache the response
  cache.set(cacheKey, {
    data: response,
    timestamp: Date.now()
  });
  
  return response;
}
```

2. **Debounce or throttle frequent API calls:**

```typescript
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Usage for search functionality
const debouncedSearch = debounce(async (term) => {
  try {
    const results = await sdk.blueprints.entitiesOf('todo').getList({})
    updateSearchResults(results);
  } catch (error) {
    console.error('Search failed:', error);
  }
}, 300);

// In your UI event handler
searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```
## Debugging Techniques

### Console Logging

Add detailed logging to track SDK operations:

```typescript
// Create a logging wrapper
function logApiCall(options = {}) {
  console.log(`API Call: workspaces.getList`, options);
  const startTime = performance.now();
  
  return sdk.workspaces.getList(options)
    .then(response => {
      const duration = performance.now() - startTime;
      console.log(`API Response (${duration.toFixed(2)}ms): workspaces.getList`, response);
      return response;
    })
    .catch(error => {
      const duration = performance.now() - startTime;
      console.error(`API Error (${duration.toFixed(2)}ms): workspaces.getList`, error);
      throw error;
    });
}
```

### Network Monitoring

Use browser developer tools to inspect network requests:

1. Open your browser's developer tools (F12 or Ctrl+Shift+I)
2. Go to the Network tab
3. Filter for XHR/Fetch requests
4. Look for requests to your API endpoints
5. Examine request headers, payload, and response

### SDK Version Compatibility

Ensure you're using a compatible version of the SDK:

```typescript
import { version } from '@qelos/sdk';

console.log('Qelos SDK Version:', version);

// Check for minimum required version
const [major, minor, patch] = version.split('.').map(Number);
const isCompatible = major > 3 || (major === 3 && minor >= 8);

if (!isCompatible) {
  console.warn(`Warning: Current SDK version ${version} may not be compatible. Please upgrade to v3.8.0 or later.`);
}
```

## Getting Help

If you've tried the troubleshooting steps above and are still experiencing issues, you can get help through the following channels:

1. **Check the Documentation**: Make sure you've reviewed all relevant documentation sections.

2. **Search for Known Issues**: Check the Qelos GitLab repository for similar issues that may have been reported.

3. **Contact Support**: Reach out to Velocitech LTD support team with details about your issue, including:
   - SDK version
   - Browser and OS information
   - Steps to reproduce the issue
   - Error messages and stack traces
   - Code samples demonstrating the issue

4. **Community Discord**: Join the Qelos Discord server at [https://discord.gg/WJRswGxdHs](https://discord.gg/WJRswGxdHs) to get help from the community.

## Conclusion

By following this troubleshooting guide, you should be able to identify and resolve most common issues when working with the Qelos SDK. Remember to implement proper error handling, use TypeScript for better type safety, and follow best practices for API usage to create a robust and reliable application.
