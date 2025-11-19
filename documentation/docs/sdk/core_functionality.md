---
title: Core SDK Functionality
---

# {{ $frontmatter.title }}

This section covers the core functionality of the Qelos SDK, including initialization, custom headers management, and other base features that are available directly from the main SDK instance.

## SDK Initialization

To use the Qelos SDK, you first need to initialize it with the appropriate options:

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: 'https://your-qelos-app.com',
  fetch: globalThis.fetch, // Required: provide fetch implementation
  forceRefresh: true, // Enable automatic token refresh
  // Optional: provide initial tokens if available
  accessToken: 'existing-access-token',
  refreshToken: 'existing-refresh-token',
});
```

### SDK Options

The `QelosSDKOptions` interface supports the following properties:

- **appUrl**: The base URL of your Qelos application (required)
- **fetch**: Fetch implementation to use for API requests (required)
- **forceRefresh**: Whether to automatically refresh tokens when needed (optional)
- **accessToken**: An initial access token (optional)
- **refreshToken**: An initial refresh token (optional)
- **getAccessToken**: A function that returns the current access token (optional)
- **extraHeaders**: A function that returns additional headers for API requests (optional)
- **onFailedRefreshToken**: Callback function when token refresh fails (optional)
- **extraQueryParams**: Function that returns additional query parameters for requests (optional)

## Managing Custom Headers

The SDK allows you to add custom headers to all API requests, which can be useful for adding tracking information, custom authentication, or other metadata.

### Setting a Custom Header

To add a custom header to all API requests:

```typescript
sdk.setCustomHeader('X-Custom-Header', 'custom-value');
```

This header will be included in all subsequent API requests made by the SDK.

### Removing a Custom Header

To remove a previously set custom header:

```typescript
sdk.removeCustomHeader('X-Custom-Header');
```

## Token Management

The SDK automatically manages authentication tokens when using OAuth-based authentication. The tokens are stored internally and used for authenticating API requests.

### Getting the Current Access Token

You can retrieve the current access token using the authentication module:

```typescript
const currentToken = sdk.authentication.accessToken;
```

### Automatic Token Refresh

When `forceRefresh` is enabled in the SDK options, the SDK will automatically refresh the access token when it expires. This happens transparently when making API requests.

If you need to manually refresh the token:

```typescript
await sdk.authentication.refreshToken();
```

## Available Modules

The Qelos SDK provides several modules for interacting with different aspects of your application:

- **authentication**: User authentication and session management
- **workspaces**: Multi-tenant workspace management
- **invites**: Workspace invitation management
- **blueprints**: Data model definition and entity management
- **blocks**: Content block management
- **appConfigurations**: Application configuration management

Each module provides specific methods for interacting with its respective functionality. Refer to the dedicated documentation pages for each module for more details.

## Example: Complete SDK Setup

Here's a complete example of initializing the SDK and setting up custom headers:

```typescript
import QelosSDK from '@qelos/sdk';

// Initialize the SDK
const sdk = new QelosSDK({
  appUrl: 'https://your-qelos-app.com',
  fetch: globalThis.fetch,
  forceRefresh: true,
});

// Add custom headers for tracking
sdk.setCustomHeader('X-Client-Version', '1.0.0');
sdk.setCustomHeader('X-Client-Platform', 'web');

// Authenticate the user
await sdk.authentication.oAuthSignin({
  username: 'user@example.com',
  password: 'password'
});

// Now you can use any of the SDK modules
const workspaces = await sdk.workspaces.getList();
const userProfile = await sdk.authentication.getLoggedInUser();
```

## Emitting Platform Events

The SDK provides a utility function to emit platform-wide events. These events can be used for auditing, analytics, or triggering other processes within the Qelos ecosystem.

### `emitPlatformEvent(platformEvent)`

This function sends a platform event to the Qelos backend.

**Arguments**

- `platformEvent` (`PlatformEvent`): An object containing the event details.

### The `PlatformEvent` Interface

The `PlatformEvent` object has the following structure:

- **tenant** (`string`): The ID of the tenant where the event occurred.
- **user** (`string`, optional): The ID of the user who triggered the event.
- **source** (`string`): The source of the event (e.g., 'auth-service', 'billing-module').
- **kind** (`string`): The type or category of the event (e.g., 'security', 'billing', 'user-management').
- **eventName** (`string`): A specific name for the event (e.g., 'user-login', 'invoice-paid').
- **description** (`string`): A human-readable description of the event.
- **metadata** (`any`): Any additional data associated with the event.
- **created** (`Date`, optional): The timestamp of when the event was created. Defaults to the current time if not provided.

### Example: Emitting an Event

Here's an example of how to emit an event when a user logs in:

```typescript
import { emitPlatformEvent } from '@qelos/api-kit';

emitPlatformEvent({
  tenant: 'tenant-id-123',
  user: 'user-id-456',
  source: 'my-custom-app',
  kind: 'authentication',
  eventName: 'user-logged-in',
  description: 'User successfully logged into the application.',
  metadata: {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 ...'
  }
});
```
