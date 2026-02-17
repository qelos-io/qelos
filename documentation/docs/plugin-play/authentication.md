---
title: Authentication
---
# Authentication

Plugin Play authenticates with your Qelos instance to access APIs on behalf of a configured user. There are two supported authentication methods.

## API Token Authentication (Recommended)

API tokens provide the simplest and most reliable authentication for plugins. A single environment variable replaces the need for username/password credentials.

```bash
QELOS_URL=https://your-app.qelos.app
QELOS_API_TOKEN=ql_your_api_token_here
```

When configured, Plugin Play:
1. Calls `sdk.authentication.apiTokenSignin(apiToken)` on startup
2. Sends the `x-api-key` header on every subsequent request
3. Skips all token refresh logic — the API token is permanent until expiration or revocation

### Creating a Token for Your Plugin

1. Log in to your Qelos admin UI
2. Navigate to **Profile → API Tokens**
3. Click **Create Token**
4. Set a descriptive nickname (e.g., "My Plugin - Production")
5. Optionally scope it to a specific workspace
6. Set an expiration date
7. Copy the token — it is shown **only once**

### Benefits Over Username/Password

- **No refresh overhead** — eliminates the OAuth refresh cycle entirely
- **Single credential** — one environment variable instead of two
- **Workspace-scoped** — bind the token to a specific workspace at creation
- **Revocable** — revoke access instantly without changing passwords
- **Auditable** — each token tracks its last usage time

## Username / Password Authentication (Legacy)

The legacy method uses OAuth signin with automatic token refresh:

```bash
QELOS_URL=https://your-app.qelos.app
QELOS_USERNAME=admin@company.com
QELOS_PASSWORD=secret
```

Plugin Play calls `sdk.authentication.oAuthSignin()` and handles token refresh automatically via `onFailedRefreshToken`.

This method is still supported but **API tokens are recommended** for new deployments.

## Authentication Priority

If both `QELOS_API_TOKEN` and `QELOS_USERNAME`/`QELOS_PASSWORD` are set, the API token takes priority.

## Troubleshooting

- **401 errors** — verify the token has not expired or been revoked
- **403 errors** — ensure the token's user has the required roles and permissions
- **Workspace mismatch** — if the token is scoped to a workspace, all operations are bound to that workspace

See [Configuration](/plugin-play/configuration) for the full list of environment variables.
