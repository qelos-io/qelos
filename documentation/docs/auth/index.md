---
title: Authentication & Authorization
editLink: true
---

# Authentication & Authorization

This guide documents the full auth lifecycle for integrators building on
Qelos. It covers how users get authenticated, how sessions are kept fresh,
how programmatic clients authenticate, and how authorization is scoped to
workspaces and roles.

> Looking for the raw SDK methods? See
> [SDK Authentication](/sdk/authentication). Looking for the HTTP wire
> format? See the [Authentication API](/api/authentication).

## Sections

- [Auth modes overview](#auth-modes) — cookie vs OAuth vs API token
- [Email & password signup / signin](./email-password)
- [Social authentication (OAuth providers)](./social-auth)
- [Cookie token lifecycle and refresh](./cookie-tokens)
- [API token management](./api-tokens)
- [Permissions and roles](./permissions-roles)
- [Workspace-scoped auth](./workspaces)
- [Security best practices](./security)

## Auth modes

Qelos supports three distinct authentication modes. Pick the one that
matches the runtime your code lives in — they are not interchangeable.

| Mode | Credential | Sent as | Refresh | Where to use |
|---|---|---|---|---|
| **Cookie session** | Signed cookie token | `Cookie:` header | `POST /api/cookie/refresh` | Browser apps with a same-domain backend; the integrator middleware |
| **OAuth (bearer)** | Access + refresh JWT pair | `Authorization: Bearer <token>` | `POST /api/token/refresh` | Mobile apps, SPAs that store tokens explicitly, server-to-server with a user identity |
| **API token** | Long-lived `ql_…` key | `x-api-key:` header | None — fixed expiration | CI/CD, plugins, CLI, scripts, service accounts |

A single SDK instance uses exactly one mode for its lifetime. The choice
is made at construction time (or at the first signin call).

### Picking a mode

- **Building a browser-facing app behind one of the integrators
  (`@qelos/integrator-express`, `@qelos/integrator-next`,
  `@qelos/integrator-nuxt`, `@qelos/integrator-fastify`,
  `@qelos/integrator-nest`, `@qelos/integrator-fastapi`)?** Use cookie
  sessions. The middleware reads the cookie pair, refreshes when needed,
  and writes the new pair back on the response.
- **Building a native or non-cookie client?** Use OAuth. Persist the
  refresh token securely; the SDK will rotate the access token
  automatically.
- **Authenticating a non-interactive process?** Use an API token. It has
  no refresh cycle and can be scoped to a single workspace.

### What you get back from auth

Every successful auth (signin, signup, refresh, social callback) returns
the same shape:

```ts
{
  payload: {
    user: IUser,                  // see /sdk/typescript_types
    workspace?: IWorkspace,       // active workspace, if any
    token?: string,               // OAuth access token
    refreshToken?: string,        // OAuth refresh token
    cookieToken?: string,         // cookie session token (refresh only)
  }
}
```

`token` / `refreshToken` are present only in OAuth flows. `cookieToken`
is present only on `POST /api/cookie/refresh`. The session cookie itself
is set via `Set-Cookie` on the HTTP response — you do not handle it
manually in browser environments.

## At a glance

```ts
import QelosSDK from '@qelos/sdk';

// 1. Cookie session (browser)
const sdk = new QelosSDK({ appUrl: 'https://app.example.com' });
await sdk.authentication.signin({ username, password });

// 2. OAuth (native / SPA-managed tokens)
await sdk.authentication.oAuthSignin({ username, password });

// 3. API token (scripts, CI, plugins)
const sdk = new QelosSDK({
  appUrl: 'https://app.example.com',
  apiToken: process.env.QELOS_API_TOKEN,
});
const me = await sdk.authentication.getLoggedInUser();
```

The next pages walk through each flow in detail.
