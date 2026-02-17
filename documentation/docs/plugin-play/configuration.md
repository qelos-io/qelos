---
title: Configuration
---
# Configuration

Learn how to configure your Plugin Play application with manifest options and configuration settings.

## Manifest Configuration

```typescript
import { configure } from '@qelos/plugin-play';

configure({
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Plugin description',
  manifestUrl: '/manifest.json',
  proxyPath: '/api/proxy'
}, {
  qelosUrl: process.env.QELOS_URL,
  qelosUsername: process.env.QELOS_USERNAME,
  qelosPassword: process.env.QELOS_PASSWORD
});
```

## Authentication Options

Plugin Play supports two authentication methods for connecting to your Qelos instance.

### API Token Authentication (Recommended)

API tokens are the **recommended** approach for plugin authentication because:
- **No refresh token overhead** — the token is permanent until expiration or revocation
- **Simpler configuration** — a single environment variable
- **Workspace-scoped** — can be bound to a specific workspace at creation time

```typescript
import { configure } from '@qelos/plugin-play';

configure({
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Plugin description',
  manifestUrl: '/manifest.json',
  proxyPath: '/api/proxy'
}, {
  qelosUrl: process.env.QELOS_URL,
  qelosApiToken: process.env.QELOS_API_TOKEN,
});
```

Set the environment variable:

```bash
QELOS_URL=https://your-app.qelos.app
QELOS_API_TOKEN=ql_your_api_token_here
```

When `qelosApiToken` is set:
- Plugin Play uses `apiTokenSignin` instead of `oAuthSignin`
- Token refresh logic is skipped (`forceRefresh` is disabled, `onFailedRefreshToken` is not set)
- The `x-api-key` header is sent on every request automatically

### Username / Password Authentication (Legacy)

For backward compatibility, you can still use username/password credentials:

```typescript
configure({
  name: 'My Plugin',
  // ...
}, {
  qelosUrl: process.env.QELOS_URL,
  qelosUsername: process.env.QELOS_USERNAME,
  qelosPassword: process.env.QELOS_PASSWORD,
});
```

This method uses OAuth signin with automatic token refresh.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `QELOS_URL` | Your Qelos instance URL | Yes |
| `QELOS_API_TOKEN` | API token for authentication | No (use instead of username/password) |
| `QELOS_USERNAME` | Username for OAuth authentication | No (legacy) |
| `QELOS_PASSWORD` | Password for OAuth authentication | No (legacy) |

> **Note:** If `QELOS_API_TOKEN` is set, it takes priority over username/password credentials.

## SDK for URL

When creating SDK instances for external Qelos URLs (e.g., for cross-instance communication), you can also pass an API token:

```typescript
import { getSdkForUrl } from '@qelos/plugin-play';

const sdk = getSdkForUrl({
  appUrl: 'https://other-instance.qelos.app',
  apiToken: process.env.OTHER_INSTANCE_API_TOKEN,
});
```
