---
title: Token Refresh Functionality
---
# Token Refresh Functionality

The Qelos SDK provides automatic token refresh functionality when using OAuth authentication. This document explains how token refresh works and how to customize its behavior.

## Automatic Token Refresh

When using the `oAuthSignin` method for authentication, the SDK automatically manages access tokens and refresh tokens. When an API request fails with a 401 Unauthorized status code, the SDK will:

1. Attempt to refresh the access token using the stored refresh token
2. Retry the original request with the new access token
3. Return the response from the retried request

```typescript
// Example of authentication with oAuthSignin
await sdk.authentication.oAuthSignin({ username: "user@example.com", password: "password" });

// All subsequent API calls will automatically handle token refresh when needed
const workspaces = await sdk.workspaces.getList();
const userProfile = await sdk.authentication.getLoggedInUser();
```

## Customizing Token Refresh Behavior

You can customize the token refresh behavior by providing options when initializing the SDK:

### Setting the onFailedRefreshToken Callback

The `onFailedRefreshToken` callback is triggered when a token refresh attempt fails. This allows you to implement custom logic such as redirecting to a login page or displaying an error message.

```typescript
const sdk = new QelosSDK({
  appUrl: "https://your-app-url.com",
  onFailedRefreshToken: async () => {
    // Custom logic when token refresh fails
    console.log("Token refresh failed");
    // Redirect to login page
    window.location.href = "/login";
    // Return a new token if you have a way to get one, or null/undefined
    return null;
  }
});
```

### Controlling Automatic Token Refresh

You can control the automatic token refresh behavior using the `forceRefresh` option:

#### Enabling Token Refresh

By default, token refresh is disabled. To enable automatic token refresh for requests, set the `forceRefresh` option to `true`:

```typescript
// This request will attempt to refresh the token if it receives a 401 response
const data = await sdk.workspaces.getList({
  bypassAdmin: true
});
```

#### Default Behavior

If you don't specify the `bypassAdmin` option, it defaults to `false`, meaning that if you're the admin - you'll retrieve all data of all users.

If you specify the `bypassAdmin` option to `true`, you will get only your own data, even if you're the admin.

```typescript
// This request will NOT attempt to refresh the token if it receives a 401 response
const data = await sdk.workspaces.getList();
// Equivalent to:
// const data = await sdk.workspaces.getList({ bypassAdmin: false });
```

#### Example Use Case

```typescript
// Function that handles API calls with configurable token refresh
async function fetchData(bypassAdmin = false) {
  try {
    const response = await sdk.workspaces.getList({
      bypassAdmin,
    });
    return response;
  } catch (error) {
    if (error.status === 401 && !bypassAdmin) {
      console.log('Authentication failed and token refresh was disabled');
      // Handle 401 error manually when token refresh is disabled
      return null;
    }
    throw error;
  }
}

// Usage examples
const dataWithoutRefresh = await fetchData(false); // Uses default (false)
const dataWithRefresh = await fetchData(true); // Explicitly bypass admin privileges
```

## Handling Concurrent Requests During Token Refresh

The SDK intelligently handles concurrent requests during token refresh. If multiple requests fail due to an expired token:

1. Only one token refresh request will be made
2. All pending requests will wait for the token refresh to complete
3. Once the token is refreshed, all pending requests will be retried with the new token

This prevents unnecessary token refresh requests and ensures efficient handling of concurrent API calls.

## Error Handling

When token refresh fails and no valid `onFailedRefreshToken` callback is provided, the SDK will throw an error with details about the failed refresh attempt. Your application should handle these errors appropriately.

```typescript
try {
  const data = await sdk.someApiCall();
  // Process data
} catch (error) {
  if (error.message.includes("Failed to refresh token")) {
    // Handle token refresh failure
    console.error("Authentication expired. Please log in again.");
  } else {
    // Handle other errors
    console.error("API call failed:", error);
  }
}
```

## Best Practices

1. **Always provide an `onFailedRefreshToken` callback** when initializing the SDK to handle token refresh failures gracefully.

2. **Implement proper error handling** in your application to catch and respond to authentication errors.

3. **Consider user experience** when handling token refresh failures, such as providing a smooth transition to re-authentication.

4. **Maintain custom headers** across requests, as the SDK will preserve them during token refresh and request retries.
