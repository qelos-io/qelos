# Authentication

Handles user identity for Qelos tenants: registration, login, social OAuth, sessions, and token lifecycle.

## What Users Can Do

- **Register**: Create an account with name and password
- **Sign in**: Authenticate with email/password and receive a session cookie or access/refresh token pair
- **Social login**: Sign in with Google, Facebook, LinkedIn, or GitHub when configured
- **Refresh sessions**: Renew cookie or bearer tokens without re-entering credentials
- **Sign out**: End the current session
- **OAuth callback**: Convert a refresh token into a browser cookie session

## Endpoints

### POST /api/signin
Sign in with username/email and password.

**Request**: username, password, optional token mode (cookie vs bearer)

**Response**: user object, active workspace, session cookie or access/refresh tokens

### POST /api/signup
Register a new account.

**Request**: name, username, password, optional metadata

**Response**: user object and session/tokens (same as signin)

### POST /api/token/refresh
Exchange a valid refresh token for new access and refresh tokens (OAuth-style clients).

### POST /api/cookie/refresh
Refresh an existing cookie or bearer session; returns updated cookie and user payload.

### POST /api/logout
Invalidate the current cookie or bearer token.

### POST /api/auth/callback
Convert refresh token (query param `rt`) into a browser cookie session.

### Social OAuth
Redirect flows for Google, Facebook, LinkedIn, GitHub — auto-register on first login when enabled.

## User Flow

1. User submits credentials or clicks social provider
2. Auth validates credentials and resolves tenant
3. Session cookie or token pair is issued
4. Subsequent requests include cookie, Authorization header, or `x-api-key`
5. Gateway pre-checks identity via `/api/me` before proxying

## Related

- [Users & API tokens](users-and-tokens.md)
- [Workspaces & invites](workspaces-and-invites.md)
- [Login screen](../frontend/auth/PRODUCT.md)
