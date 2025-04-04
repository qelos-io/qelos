---
title: Error Handling Guide
---

# {{ $frontmatter.title }}

This comprehensive guide explains how to handle errors in the Qelos SDK effectively. Proper error handling is crucial for building robust applications that can gracefully recover from failures and provide a good user experience.

## Common Error Patterns

The Qelos SDK can throw several types of errors that you should be prepared to handle:

### 1. Network Errors

These occur when there are connectivity issues between your application and the Qelos API.

```typescript
try {
  await sdk.workspaces.getList();
} catch (error) {
  if (error.name === 'TypeError' || error.message.includes('network')) {
    // Handle network error
    console.error('Network error. Please check your connection.');
    // Implement retry logic or fallback behavior
  }
}
```

### 2. Authentication Errors

These occur when there are issues with user authentication or token validity.

```typescript
try {
  await sdk.authentication.getUserProfile();
} catch (error) {
  if (error.status === 401) {
    // Handle authentication error
    console.error('Authentication failed. Please log in again.');
    // Redirect to login page
    window.location.href = '/login';
  }
}
```

### 3. Permission Errors

These occur when a user doesn't have sufficient permissions to access a resource.

```typescript
try {
  await sdk.workspaces.getList();
} catch (error) {
  if (error.status === 403) {
    // Handle permission error
    console.error('You do not have permission to access this resource.');
    // Show appropriate UI message
  }
}
```

### 4. Resource Not Found Errors

These occur when the requested resource doesn't exist.

```typescript
try {
  const userId = '12345';
  await sdk.users.getUser(userId);
} catch (error) {
  if (error.status === 404) {
    // Handle not found error
    console.error(`User with ID ${userId} not found.`);
    // Show appropriate UI message or fallback
  }
}
```

### 5. Server Errors

These occur when there's an issue on the server side.

```typescript
try {
  await sdk.blueprints.getList();
} catch (error) {
  if (error.status >= 500) {
    // Handle server error
    console.error('Server error. Please try again later.');
    // Implement retry logic with exponential backoff
  }
}
```

## Creating a Global Error Handler

Implementing a global error handler can centralize your error handling logic and ensure consistent behavior across your application.

```typescript
// Define error handler
const handleApiError = (error) => {
  // Log the error for debugging
  console.error('API Error:', error);

  // Extract useful information
  const status = error.status || 0;
  const message = error.message || 'Unknown error';
  
  // Handle based on error type
  if (status === 401) {
    // Authentication error
    notifyUser('Your session has expired. Please log in again.');
    redirectToLogin();
    return;
  }
  
  if (status === 403) {
    notifyUser('You do not have permission to perform this action.');
    return;
  }
  
  if (status === 404) {
    notifyUser('The requested resource was not found.');
    return;
  }
  
  if (status >= 500) {
    notifyUser('We\'re experiencing technical difficulties. Please try again later.');
    return;
  }
  
  if (message.includes('network') || error.name === 'TypeError') {
    notifyUser('Network error. Please check your internet connection.');
    return;
  }
  
  // Default error message
  notifyUser('An error occurred. Please try again.');
};

// Usage in your application
try {
  const workspaces = await sdk.workspaces.getList();
  // Process workspaces
} catch (error) {
  handleApiError(error);
}
```

## Implementing Retry Logic

For transient errors like network issues or server errors, implementing retry logic can improve the resilience of your application.

```typescript
async function callWithRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Only retry for specific error types
      if (
        error.status >= 500 || // Server errors
        error.name === 'TypeError' || // Network errors
        error.message.includes('network')
      ) {
        lastError = error;
        // Exponential backoff
        const backoffTime = delay * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1} failed. Retrying in ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      } else {
        // Don't retry for client errors
        throw error;
      }
    }
  }
  
  // If we've exhausted all retries
  console.error(`Failed after ${maxRetries} attempts`);
  throw lastError;
}

// Usage
try {
  const blueprints = await callWithRetry(() => sdk.blueprints.getList());
  // Process blueprints
} catch (error) {
  handleApiError(error);
}
```

## Error Handling with Token Refresh

When using token refresh functionality, you need to handle cases where token refresh fails.

```typescript
// Initialize SDK with token refresh failure handler
const sdk = new QelosSDK({
  appUrl: 'https://your-qelos-app.com',
  forceRefresh: true,
  onFailedRefreshToken: async () => {
    console.log('Token refresh failed');
    // Store the current URL to redirect back after login
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    // Redirect to login page
    window.location.href = '/login';
    return null;
  }
});
```

## Debugging Techniques

When troubleshooting SDK errors, these techniques can help identify the root cause:

### 1. Enable Verbose Logging

Implement a logging wrapper around SDK calls to capture detailed information:

```typescript
async function loggedApiCall(fn, description) {
  console.log(`Starting API call: ${description}`);
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    console.log(`API call succeeded: ${description} (${duration.toFixed(2)}ms)`);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`API call failed: ${description} (${duration.toFixed(2)}ms)`, error);
    throw error;
  }
}

// Usage
try {
  const users = await loggedApiCall(
    () => sdk.users.getList(),
    'Fetch users'
  );
  // Process users
} catch (error) {
  handleApiError(error);
}
```

### 2. Inspect Network Requests

Use browser developer tools to inspect network requests and responses for detailed error information.

## Best Practices

1. **Always use try-catch blocks** when making API calls to handle potential errors gracefully.

2. **Provide meaningful error messages** to users that help them understand what went wrong and how to resolve the issue.

3. **Implement retry logic** for transient errors like network failures or server errors.

4. **Log errors** for debugging and monitoring purposes, but be careful not to log sensitive information.

5. **Handle authentication errors** by redirecting users to the login page or refreshing tokens automatically.

6. **Implement graceful degradation** so your application can still function (possibly with limited capabilities) even when some API calls fail.

7. **Use TypeScript** to catch potential errors at compile time and provide better type safety.

8. **Test error scenarios** to ensure your error handling works as expected in various failure scenarios.

## Conclusion

Robust error handling is essential for creating a reliable and user-friendly application. By implementing the patterns and practices described in this guide, you can ensure that your application gracefully handles errors and provides a good user experience even when things go wrong.
