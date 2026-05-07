---
title: Social Authentication
editLink: true
---

# Social Authentication

Qelos supports OAuth-based social login through four providers:

```ts
type SocialProvider = 'linkedin' | 'facebook' | 'google' | 'github';
```

Each provider must be enabled and configured (client id, client secret,
allowed callback origins) by an admin in the Auth service config. Once
enabled, the SDK exposes a uniform flow regardless of provider.

## End-to-end flow

```
┌────────┐                ┌──────────┐                ┌──────────┐
│ Client │                │  Qelos   │                │ Provider │
└───┬────┘                └────┬─────┘                └────┬─────┘
    │                          │                           │
    │ 1. getSocialLoginUrl(p)  │                           │
    │ ───────────────────────► │                           │
    │ │ /api/auth/<provider>   │                           │
    │ │ ?state&returnUrl       │                           │
    │ ◄─────────────────────── │                           │
    │                          │                           │
    │ 2. browser navigates to /api/auth/<provider>         │
    │ ────────────────────────►│                           │
    │                          │ 3. 302 → provider auth    │
    │                          │ ────────────────────────► │
    │                          │                           │
    │ 4. user authorizes on provider                       │
    │                          │                           │
    │                          │ 5. 302 → /api/auth/<p>/callback?code=…
    │                          │ ◄──────────────────────── │
    │                          │                           │
    │                          │ 6. exchange code, mint    │
    │                          │    refresh token (rt)     │
    │ 7. 302 → returnUrl?rt=…  │                           │
    │ ◄────────────────────────│                           │
    │                          │                           │
    │ 8. exchangeAuthCallback(rt)                          │
    │ ───────────────────────► │                           │
    │                          │ 9. verify rt, set cookie  │
    │                          │    session, return user   │
    │ ◄─────────────────────── │                           │
    │                          │                           │
```

The browser is never given an access token directly. Step 7 hands it a
single-use refresh token in the URL; step 8 immediately swaps that for a
proper cookie session and the URL parameter is discarded.

## Step 1 — Build the login URL

```ts
const url = sdk.authentication.getSocialLoginUrl('google', {
  state: crypto.randomUUID(),       // CSRF token (recommended)
  returnUrl: 'https://app.example.com/auth/finish',
});
```

| Option | Purpose |
|---|---|
| `state` | Opaque CSRF value. Persist it client-side (e.g. `sessionStorage`) and verify on return. |
| `returnUrl` | Where Qelos should redirect after step 7. Defaults to the configured app origin. The host must be allow-listed in the auth service. |

`getSocialLoginUrl()` returns an absolute URL — it does not redirect. To
trigger the navigation, either set `location.href` yourself or use the
shorthand:

```ts
sdk.authentication.startSocialLogin('google', {
  state,
  returnUrl: 'https://app.example.com/auth/finish',
});
```

`startSocialLogin()` throws if called outside a browser environment.

## Step 7/8 — Handle the callback

After the user authorizes the app, Qelos redirects the browser to your
`returnUrl` with two query parameters:

- `rt` — the single-use refresh token to exchange.
- `state` — echoed back from step 1, if you supplied it.

On the page mounted at `returnUrl`:

```ts
const params = new URLSearchParams(location.search);
const rt = params.get('rt');
const returnedState = params.get('state');

if (returnedState !== sessionStorage.getItem('oauth_state')) {
  throw new Error('state mismatch — possible CSRF');
}
sessionStorage.removeItem('oauth_state');

if (!rt) throw new Error('missing refresh token');

const { payload } = await sdk.authentication.exchangeAuthCallback(rt);
// payload.user, payload.workspace
// session cookie is now set on the response
```

`exchangeAuthCallback()` posts the refresh token to
`POST /api/auth/callback?rt=…`, the server verifies it, mints a cookie
session, and returns the user payload. Strip `rt` from the URL afterward
so it does not leak into history, analytics, or the Referer header:

```ts
history.replaceState({}, '', location.pathname);
```

## Errors

| Symptom | Cause |
|---|---|
| Redirect loop ending at `/api/auth/<p>?error=disabled` | Provider not enabled in the auth config |
| 400 from `exchangeAuthCallback` | Missing `rt` parameter |
| 401 from `exchangeAuthCallback` | Refresh token invalid, expired, or already exchanged |
| Stuck on provider page | Callback URL not whitelisted with the provider |

## What the user gets

A successful exchange leaves the SDK in the same state as a successful
[email/password signin](./email-password) — a cookie session is active,
and the user can be re-fetched via `sdk.authentication.getLoggedInUser()`.

To use OAuth tokens (bearer pair) instead of a cookie session for social
logins, use the OAuth signin path on your own backend after exchanging
the refresh token via `sdk.authentication.refreshToken(rt)`. Most apps
should stick with the cookie flow.
