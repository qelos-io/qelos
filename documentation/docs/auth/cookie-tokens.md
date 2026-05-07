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

Most application code never calls this directly — the integrator
middleware handles it.

## Automatic refresh in the integrator middleware

The Express integrator (and its sibling packages for Next, Nuxt,
Fastify, NestJS, FastAPI) wraps every request with a fresh, per-request
SDK that refreshes tokens transparently.

What the middleware does on each request (see
`integrators/express/src/middleware.ts`):

1. **Read tokens.** Pull the access token from the `q_access_token`
   cookie or from an `Authorization: Bearer …` header, and the refresh
   token from `q_refresh_token`.
2. **Build a request-scoped SDK.** The SDK is created with
   `forceRefresh: true` and a fetch hook that injects the current
   bearer token, plus a refresh callback that runs on `401` responses.
3. **Refresh on 401.** When any SDK call returns `401`, the SDK
   transparently calls `refreshToken` (OAuth pair) or
   `refreshCookieToken` (cookie pair), retries the original request,
   and then…
4. **Write the new cookies back.** The default `onTokenRefresh` hook
   serializes the rotated tokens as `Set-Cookie` headers on the
   outgoing response, so the browser receives them on the same response
   that carries the page or API result.

You get this for free — your route handlers just call
`req.qelos.sdk.<...>` and never see the refresh.

### Customizing refresh

Pass `onTokenRefresh` to override how rotated tokens are persisted (for
example, to write them to a session store instead of cookies):

```ts
import { createQelosMiddleware } from '@qelos/integrator-express';

app.use(createQelosMiddleware({
  config: {
    appUrl: process.env.QELOS_APP_URL!,
    accessTokenCookie: 'app_at',     // override default 'q_access_token'
    refreshTokenCookie: 'app_rt',
    requireAuth: false,              // 401 unauthenticated requests
    skipPaths: ['/healthz', '/public'],
  },
  onTokenRefresh: async ({ req, res, newTokens }) => {
    await req.session.save({ tokens: newTokens });
  },
}));
```

If you supply `onTokenRefresh`, the middleware will not write cookies
itself — make sure your hook persists `newTokens.accessToken` and
`newTokens.refreshToken` somewhere your next request can read.

### Concurrent requests

When several SDK calls fire in parallel and all hit a `401`, the SDK
coalesces them into a single refresh: only one
`refreshToken` / `refreshCookieToken` request goes out, every queued
call resumes with the new token, and `onTokenRefresh` runs once.

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
