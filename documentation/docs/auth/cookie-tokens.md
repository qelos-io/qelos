---
title: Cookie Token Lifecycle
editLink: true
---

# Cookie Token Lifecycle and Refresh

Cookie sessions are the default mode for browser-facing apps and the
Qelos integrators. This page covers what is in the cookie, how it gets
refreshed, and how the integrator middleware handles refresh
automatically.

## What's in the cookie

After signin (or social-callback exchange), Qelos sets a single
`HttpOnly` cookie containing a signed JWT. The cookie is named per
tenant; the integrator-side default is `q_access_token`, with a paired
`q_refresh_token` cookie used for transparent refresh.

```
Set-Cookie: q_access_token=eyJhbGc…; HttpOnly; SameSite=Lax; Path=/
Set-Cookie: q_refresh_token=eyJhbGc…; HttpOnly; SameSite=Lax; Path=/
```

Cookie attributes:

- `HttpOnly` — JavaScript on the client cannot read the value.
- `SameSite=Lax` for same-domain deployments; `SameSite=None; Secure` is
  set when the auth service has a `cookieBaseDomain` (cross-subdomain
  setups).
- `Secure` — set whenever the configured `appUrl` is `https://`.
- `Path=/` — sent on every request to the integrator app.

## Refreshing manually

```ts
const result = await sdk.authentication.refreshCookieToken();
// result.payload.cookieToken      — the new cookie value (server-set on response)
// result.payload.user
// result.payload.workspace
// result.headers['set-cookie']    — the Set-Cookie header to relay to the browser
```

`refreshCookieToken()` calls `POST /api/cookie/refresh`. If the SDK is
running in a browser, the cookie is replayed automatically and the new
cookie is set by the response. If you are running server-side and need
to authenticate the refresh request explicitly, pass the existing
cookie token:

```ts
await sdk.authentication.refreshCookieToken(currentCookieToken);
```

Most application code never calls this directly — session updates from Qelos
often arrive as `Set-Cookie` on `/api/me` or SDK responses when using an
integrator (see below).

## Automatic identity and cookies in integrator middleware

Server-side integrators (Express, Next.js, Nuxt, Fastify, NestJS, FastAPI)
identify the user by calling the managed Qelos app’s **`GET /api/me`**
through the resolved proxy target (same origin as your BFF). They forward the
inbound **`Cookie`** and **`Authorization`** headers, then forward any
upstream **`Set-Cookie`** headers from that response with the **`Domain=`**
attribute rewritten to your app’s host so the browser keeps a first-party
session.

They then create a **request-scoped SDK** whose `extraHeaders` hook forwards
the current cookies on every SDK call — so cookie rotations applied earlier in
the pipeline are visible to subsequent API calls in the same request.

This replaces older middleware patterns that wired `forceRefresh` and
`onTokenRefresh` inside the integrator. For low-level SDK refresh options when
you construct `QelosSDK` yourself, see [Token refresh](../sdk/token_refresh.md).

### Custom persistence

If you **do not** use an integrator and instead instantiate `QelosSDK`
directly, you can pass `onTokenRefresh` / cookie hooks as documented in the
SDK — that path is independent from integrator middleware.

### Concurrent requests

When several SDK calls hit a `401`, the SDK may coalesce refresh work (see SDK
docs). Integrators rely on the shared `/api/me` probe plus per-request SDK
instances rather than mutable token pairs on the context object.

## When refresh fails

A failed refresh (expired refresh token, revoked session, network
error) propagates as an error. To handle it explicitly, wire
`onFailedRefreshToken` when constructing the SDK directly:

```ts
const sdk = new QelosSDK({
  appUrl: process.env.QELOS_APP_URL!,
  onFailedRefreshToken: async () => {
    // e.g. clear local state and bounce to login
    location.href = '/login';
    return null;
  },
});
```

In integrator-managed apps you usually do not need this — the
middleware lets the error bubble and your error handler decides what to
do (redirect to login, return 401, etc.).

## Logging out

`sdk.authentication.logout()` clears server-side tokens and the cookie.
After logout, the next request through the middleware will see no auth
material and fall through to your unauthenticated handling
(`requireAuth: true` → 401, otherwise just a non-populated
`req.qelos.user`).
