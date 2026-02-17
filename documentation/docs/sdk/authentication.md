---
title: Authentication
---
# Authentication

Authentication is a crucial component of using the Qelos SDK. This section provides a detailed overview of the main authentication methods: `signin` and `oAuthSignin`.

## Authentication with `signin` Method

To authenticate a regular user, you can use the `signin` method. This method creates a session cookie in the browser to manage the user's session.

```bash
await sdk.authentication.signin({ username: "test@test.com", password: "admin" });
```

### Description of `signin` Method

**Usage**: Ideal for scenarios where traditional session management via `cookies` is sufficient.

### Behavior:

- **Session Management:** Creates a secure, HTTP-only cookie in the browser to manage the user's session.
- **Session Maintenance:** The cookie is sent with every request to the server to maintain the authenticated session.
- **Ideal For:** Browser-based applications where managing the session through cookies is sufficient. This method is suitable for simpler use cases where advanced token management is not necessary.
- **Example Use Case**
  In a typical web application, using signin will ensure that the user remains logged in as they navigate between pages, thanks to the session cookie.

### Additional Details method `signin`:

- Sets a secure, HTTP-only cookie which helps to protect the session from client-side scripts.
- Is straightforward for applications where cookie-based session management is appropriate and no additional token handling is required.

## Authentication with `oAuthSignin` Method

For applications that require OAuth-based authentication, use the oAuthSignin method. This method retrieves both an `access token` and a `refresh token`, which are managed internally by the SDK.

```bash
await sdk.authentication.oAuthSignin({ username: "test@test.com", password: "admin" });
```

### Description of `oAuthSignin` Method

**Usage**: Best for scenarios where OAuth authentication is required or preferred, and token-based authentication is needed.

### Behavior:

- **Token Management:** Retrieves an access token and a refresh token.
- **Access Token:** Used for making authenticated API requests.
- **Refresh Token:** Used to obtain a new access token when the current one expires.
- **Ideal For:** Applications needing token-based authentication, such as those integrating with OAuth providers or requiring advanced token management and expiration handling.
- **Example Use Case**
  Useful for Single Sign-On (SSO) scenarios or applications that need to manage tokens and handle token expiration and refresh seamlessly.

### Additional Details method `oAuthSignin` :

- Provides both access and refresh tokens, which the SDK manages internally.
- Uses the access token to authenticate API requests and the refresh token to obtain new access tokens when the current one expires.
- Handles token expiration and refresh automatically behind the scenes, so developers do not need to manually manage these tokens.

## Authentication with API Tokens

For programmatic access (scripts, CI/CD, plugins, CLI), you can use **API tokens** instead of username/password credentials. API tokens are long-lived, scoped to a user and optionally a workspace, and do not require a refresh cycle.

### Creating an API Token

API tokens are created through the Qelos admin UI under **Profile → API Tokens**. An admin must first enable `allowUserTokenAuthentication` in the auth configuration, and the user's roles must match the configured `tokenAuthenticationPermissions`.

Once created, the raw token is shown **only once** — copy it and store it securely.

### Using API Tokens with the SDK

#### Option 1: Pass at construction time

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: 'https://your-app.qelos.app',
  apiToken: 'ql_your_api_token_here',
});

// No signin needed — the token is sent automatically
const user = await sdk.authentication.getLoggedInUser();
```

#### Option 2: Sign in with a token at runtime

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: 'https://your-app.qelos.app',
});

const user = await sdk.authentication.apiTokenSignin('ql_your_api_token_here');
console.log('Authenticated as', user.fullName);
```

### How It Works

- The SDK sends the token as an `x-api-key` HTTP header on every request.
- No access token or refresh token is involved — the API token is permanent until it expires or is revoked.
- Token refresh logic is automatically skipped when using API token authentication.
- If the token is scoped to a workspace, all requests are bound to that workspace. The workspace **cannot** be changed.

### Differences from OAuth / Cookie Authentication

| | OAuth (`oAuthSignin`) | Cookie (`signin`) | API Token (`apiTokenSignin`) |
|---|---|---|---|
| **Token type** | Access + Refresh | Session cookie | Permanent API key |
| **Refresh cycle** | Automatic | Automatic | None |
| **Workspace** | Can switch | Can switch | Locked at creation |
| **Use case** | SSO, browser apps | Browser apps | Scripts, CI/CD, plugins, CLI |
| **Expiration** | Short-lived (auto-refresh) | Session-based | Custom (30d, 90d, 1y, etc.) |

### Managing API Tokens via SDK

The SDK also provides methods to manage tokens programmatically (requires cookie or OAuth authentication — **not** API token auth):

```typescript
// List all tokens for the current user
const tokens = await sdk.authentication.listApiTokens();

// Create a new token
const { token, apiToken } = await sdk.authentication.createApiToken({
  nickname: 'CI Pipeline',
  expiresAt: '2026-12-31T00:00:00.000Z',
  workspace: 'optional-workspace-id',
});
console.log('Save this token:', token); // Shown only once

// Revoke a token
await sdk.authentication.deleteApiToken(apiToken._id);
```

> **Note:** Token management endpoints are blocked for API token-authenticated requests. You must use cookie or OAuth authentication to create, list, or revoke tokens.

### Security Best Practices

- **Never commit tokens** to version control. Use environment variables or secret managers.
- **Set appropriate expiration dates** — avoid creating tokens that never expire.
- **Use the minimum scope needed** — scope tokens to a specific workspace when possible.
- **Revoke unused tokens** promptly through the UI or SDK.
- **Monitor usage** — check the "Last Used" column in the API Tokens tab to identify stale tokens.
