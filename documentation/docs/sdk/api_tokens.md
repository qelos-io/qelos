---
title: API Tokens
---
# API Tokens

API tokens provide long-lived, programmatic access to the Qelos platform. They are designed for scripts, CI/CD pipelines, plugins, and CLI usage — anywhere you need authenticated access without interactive login.

## Overview

### What Are API Tokens?

API tokens are user-scoped credentials that authenticate requests via the `x-api-key` HTTP header. Unlike session cookies or OAuth tokens, API tokens:

- **Do not refresh** — they are valid until expiration or revocation
- **Are workspace-locked** — if scoped to a workspace, they cannot switch to another
- **Are permanent** — no refresh cycle, no session management
- **Are hashed** — only a SHA-256 hash is stored; the raw token is shown once at creation

### When to Use API Tokens

- **CI/CD pipelines** — deploy components, push blueprints, run agents
- **Plugin Play** — authenticate plugins with a single environment variable
- **CLI automation** — script Qelos operations without interactive login
- **External integrations** — connect third-party services to your Qelos instance

## Creating Tokens (UI)

### Prerequisites

1. An admin must enable **Allow User Token Authentication** in the auth configuration
2. Your user roles must match the configured `tokenAuthenticationPermissions`

### Steps

1. Log in to the Qelos admin UI
2. Navigate to **Profile → API Tokens**
3. Click **Create Token**
4. Fill in the form:
   - **Token Name** — a descriptive nickname (e.g., "CI Pipeline - Production")
   - **Expiration** — choose a preset (30 days, 90 days, 1 year) or pick a custom date
5. Click **Create**
6. **Copy the token immediately** — it is displayed only once and cannot be retrieved later

The token format is `ql_` followed by 64 hex characters (e.g., `ql_a1b2c3d4e5f6...`).

## API Endpoints

All token management endpoints require cookie or OAuth authentication. **API token-authenticated requests cannot manage tokens** (create, list, or delete).

### List Tokens

```
GET /api/me/api-tokens
```

**Response:**

```json
[
  {
    "_id": "664f1a2b3c4d5e6f7a8b9c0d",
    "nickname": "CI Pipeline",
    "tokenPrefix": "ql_a1b2c",
    "expiresAt": "2026-12-31T00:00:00.000Z",
    "lastUsedAt": "2026-02-17T12:30:00.000Z",
    "workspace": "664f1a2b3c4d5e6f7a8b9c0e",
    "created": "2026-01-15T10:00:00.000Z"
  }
]
```

### Create Token

```
POST /api/me/api-tokens
Content-Type: application/json
```

**Request body:**

```json
{
  "nickname": "CI Pipeline",
  "expiresAt": "2026-12-31T00:00:00.000Z",
  "workspace": "optional-workspace-id"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nickname` | string | Yes | Human-readable label for the token |
| `expiresAt` | string (ISO 8601) | Yes | Expiration date (must be in the future) |
| `workspace` | string | No | Workspace ID to scope the token to |

**Response (201):**

```json
{
  "token": "ql_a1b2c3d4e5f6789...",
  "apiToken": {
    "_id": "664f1a2b3c4d5e6f7a8b9c0d",
    "nickname": "CI Pipeline",
    "tokenPrefix": "ql_a1b2c",
    "expiresAt": "2026-12-31T00:00:00.000Z",
    "created": "2026-02-17T14:00:00.000Z"
  }
}
```

> **Important:** The `token` field contains the raw token. Save it immediately — it cannot be retrieved again.

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | Missing `nickname` or `expiresAt`, or invalid/past date |
| 400 | Maximum 10 active tokens per user reached |
| 403 | User does not have permission to manage tokens |
| 403 | Request authenticated via API token (not allowed) |

### Delete (Revoke) Token

```
DELETE /api/me/api-tokens/:tokenId
```

**Response (200):**

```json
{
  "message": "Token revoked"
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 404 | Token not found or does not belong to the user |
| 403 | User does not have permission, or request via API token |

## Authentication Header

To authenticate requests using an API token, include the `x-api-key` header:

```
x-api-key: ql_your_api_token_here
```

Example with `curl`:

```bash
curl -H "x-api-key: ql_a1b2c3d4e5f6789..." \
     -H "tenant: your-tenant-id" \
     https://your-app.qelos.app/api/me
```

Example with `fetch`:

```typescript
const response = await fetch('https://your-app.qelos.app/api/me', {
  headers: {
    'x-api-key': 'ql_a1b2c3d4e5f6789...',
    'tenant': 'your-tenant-id',
  },
});
```

## Token Lifecycle

```
Creation → Usage → Expiration / Revocation
```

1. **Creation** — user creates a token via the UI or SDK. The raw token is shown once.
2. **Usage** — the token is sent as `x-api-key` on every request. The `lastUsedAt` timestamp is updated on each use.
3. **Expiration** — when the `expiresAt` date passes, the token is no longer accepted. MongoDB automatically removes expired tokens via a TTL index.
4. **Revocation** — the user can revoke a token at any time via the UI or SDK. The token is immediately invalidated (including cache eviction).

### Caching

Authentication results are cached for up to 60 minutes (or until token expiry, whichever is shorter) to reduce database load. When a token is revoked, the cache is immediately invalidated.

## SDK Methods

See [SDK Authentication](/sdk/authentication#authentication-with-api-tokens) for full SDK usage.

```typescript
// Authenticate with a token
const user = await sdk.authentication.apiTokenSignin('ql_...');

// Manage tokens (requires cookie/OAuth auth)
const tokens = await sdk.authentication.listApiTokens();
const { token } = await sdk.authentication.createApiToken({ nickname: 'My Token', expiresAt: '2026-12-31T00:00:00.000Z' });
await sdk.authentication.deleteApiToken(tokenId);
```

## Security Considerations

- **Raw tokens are never stored** — only SHA-256 hashes are persisted in the database
- **Token prefix** — the first 8 characters (`ql_xxxxx`) are stored for identification in the UI
- **No self-management** — API token-authenticated requests cannot create, list, or delete tokens. This prevents a compromised token from being used to create new tokens or revoke existing ones.
- **Rate limiting** — maximum 10 active tokens per user
- **Workspace binding** — tokens scoped to a workspace cannot access other workspaces
- **Expiration enforcement** — `expiresAt` is checked on every authentication attempt, not just via the TTL index
- **Immediate revocation** — deleting a token clears it from both the database and the authentication cache

### Best Practices

- Store tokens in environment variables or secret managers — **never commit them to version control**
- Set the shortest practical expiration date
- Scope tokens to a specific workspace when possible
- Revoke tokens that are no longer needed
- Monitor the "Last Used" column to identify stale tokens
- Use descriptive nicknames to track which token is used where (e.g., "GitHub Actions - Staging", "Plugin XYZ - Production")

## Related

- [SDK Authentication](/sdk/authentication) — all authentication methods
- [Plugin Play Configuration](/plugin-play/configuration) — using API tokens with plugins
- [Plugin Play Authentication](/plugin-play/authentication) — plugin authentication details
- [CLI Tool](/cli/) — using API tokens with the CLI
