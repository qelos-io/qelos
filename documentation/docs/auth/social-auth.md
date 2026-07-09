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
    │ │ &redirectUrl           │                           │
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
const url = sdk.authentication.getSocialLoginUrl('linkedin', {
  state: crypto.randomUUID(),       // CSRF token (recommended)
  returnUrl: '/auth/callback',      // token handoff page in YOUR app — not the post-login destination
});
// When your app proxies /api/* on a custom domain, also set redirectUrl:
url.searchParams.set(
  'redirectUrl',
  `${window.location.origin}/api/auth/linkedin/callback`,
);
```

| Option | Purpose |
|---|---|
| `state` | Opaque CSRF value. Persist it client-side (e.g. `sessionStorage`) and verify on return. |
| `returnUrl` | **Token handoff page** — where Qelos redirects after step 7 with `?rt=<refreshToken>`. This must be a route in your app that calls `exchangeAuthCallback()` (e.g. `/auth/callback`). It is **not** the user's final destination after login. Absolute URLs must use a host listed in app-configuration `metadata.websiteUrls`; relative paths starting with `/` are also allowed. When omitted, Qelos sets a cookie and redirects to `/`. |
| `redirectUrl` | OAuth provider callback origin override. Pass the **full callback URL** (e.g. `https://app.example.com/api/auth/linkedin/callback`) when your app proxies `/api/*` on a custom domain. The host must appear in `metadata.websiteUrls`. Qelos registers this URI with the OAuth provider. When omitted, the callback URI is built from the request `tenanthost`. Register every callback URL with the OAuth provider (LinkedIn Developer Portal, Google Cloud Console, etc.). |

`getSocialLoginUrl()` returns an absolute URL — it does not redirect. To
trigger the navigation, either set `location.href` yourself or use the
shorthand:

```ts
sdk.authentication.startSocialLogin('linkedin', {
  state,
  returnUrl: '/auth/callback',
});
// Then append redirectUrl if needed (see Nuxt + Netlify example below).
```

`startSocialLogin()` throws if called outside a browser environment.

## Nuxt + Netlify (reference implementation)

[Flaminga](https://app.flaminga.earth) is a production Nuxt 3 app that uses Qelos social login end-to-end. The pattern below is distilled from that codebase and is the recommended approach when you deploy a static Nuxt site to Netlify and proxy `/api/*` to your Qelos tenant.

### Architecture

```
Browser (https://app.example.com)
  │  same-origin fetch + credentials:include
  ▼
Netlify  /api/*  →  qelos-api-proxy function  →  Qelos gateway
  │
  │  OAuth start: GET /api/auth/linkedin?returnUrl=/auth/callback&redirectUrl=…
  ▼
LinkedIn  →  /api/auth/linkedin/callback  →  Qelos  →  /auth/callback?rt=…&state=…
  │
  │  exchangeAuthCallback(rt)  →  session cookie on app.example.com
  ▼
Your app (e.g. /feed)
```

The browser never talks to the Qelos tenant URL directly. The SDK's `appUrl` is **`location.origin`** (your Netlify site), and `/api/*` is proxied to Qelos.

### 1. Qelos admin configuration

In **Admin → App configuration → Hostnames**, add every domain your app runs on:

```json
"websiteUrls": [
  "app.example.com",
  "your-tenant.qelos.app"
]
```

In **Admin → Auth configuration**, enable the provider and link an integration source (e.g. LinkedIn). For LinkedIn, use scope `openid email profile`.

In the **LinkedIn Developer Portal**, register the callback URL:

```
https://app.example.com/api/auth/linkedin/callback
```

Use the same host you pass as `redirectUrl` below.

### 2. Netlify proxy

Install the Netlify build plugin and patch redirects after `nuxt build`:

```json
{
  "devDependencies": {
    "@qelos/plugin-netlify-api": "^4.1.2"
  },
  "scripts": {
    "build": "nuxt build",
    "postbuild": "qelos-netlify-patch-redirects"
  }
}
```

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[plugins]]
  package = "@qelos/plugin-netlify-api"
```

Set `QELOS_API_IP` in Netlify environment variables to your Qelos gateway IP or URL. See [API Proxy](../plugins/api-proxy.md) for details.

::: warning
Social login **requires** the function proxy (default). The proxy must forward the full query string (`returnUrl`, `redirectUrl`, `state`) to Qelos. Use `@qelos/plugin-netlify-api` **≥ 4.1.2** and the `postbuild` script so `_redirects` and `qelos-api-proxy` are deployed correctly.
:::

### 3. Nuxt module

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@qelos/integrator-nuxt'],
  nitro: { preset: 'netlify' },
  qelos: {
    appUrl: process.env.NUXT_QELOS_URL || process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3010',
    requireAuth: false,
  },
  runtimeConfig: {
    public: {
      siteUrl: 'https://app.example.com',
    },
  },
});
```

For local development, set `NUXT_QELOS_URL` to your Qelos tenant URL so the Nitro dev proxy forwards `/api/*` to Qelos.

### 4. Auth composable

Create a composable that drives the SDK from the browser against the same origin:

```ts
// composables/useQelosAuth.ts
import QelosSDK from '@qelos/sdk';
import type { SocialProvider } from '@qelos/sdk/src/authentication';

const OAUTH_STATE_KEY = 'oauth-state';
const OAUTH_RETURN_KEY = 'oauth-return';

export function useQelosAuth() {
  const config = useRuntimeConfig();
  const user = useState('qelos-user', () => undefined as IUser | null | undefined);

  function appUrl(): string {
    if (import.meta.client) return globalThis.location.origin;
    return (config.public.siteUrl as string) || 'http://localhost:3010';
  }

  function createSdk() {
    return new QelosSDK({
      appUrl: appUrl(),
      fetch: (input, init) => globalThis.fetch(input, { ...init, credentials: 'include' }),
    });
  }

  function startSocialLogin(provider: SocialProvider, returnPath = '/') {
    const state = crypto.randomUUID();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    sessionStorage.setItem(OAUTH_RETURN_KEY, returnPath);

    const loginUrl = new URL(createSdk().authentication.getSocialLoginUrl(provider, {
      state,
      returnUrl: '/auth/callback', // token handoff — NOT returnPath
    }));
    loginUrl.searchParams.set(
      'redirectUrl',
      `${appUrl()}/api/auth/${provider}/callback`,
    );
    window.location.href = loginUrl.toString();
  }

  async function completeSocialCallback(): Promise<string> {
    const params = new URLSearchParams(globalThis.location.search);
    const rt = params.get('rt');
    const returnedState = params.get('state');
    const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);

    if (!expectedState || returnedState !== expectedState) {
      throw new Error('Invalid OAuth state');
    }
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    if (!rt) throw new Error('Missing refresh token');

    await createSdk().authentication.exchangeAuthCallback(rt);
    history.replaceState({}, '', globalThis.location.pathname);
    await loadUser();

    const returnPath = sessionStorage.getItem(OAUTH_RETURN_KEY) || '/';
    sessionStorage.removeItem(OAUTH_RETURN_KEY);
    return returnPath;
  }

  async function loadUser() {
    try {
      user.value = await createSdk().authentication.getLoggedInUser();
    } catch {
      user.value = null;
    }
  }

  return { user, createSdk, loadUser, startSocialLogin, completeSocialCallback };
}
```

**Critical:** `returnUrl` must be your callback route (`/auth/callback`), not the page the user should land on after login. Store the final destination separately (e.g. `sessionStorage`) and redirect there after `exchangeAuthCallback()`.

### 5. Login and callback pages

```vue
<!-- pages/login.vue -->
<script setup lang="ts">
const { startSocialLogin } = useQelosAuth();
const returnPath = useRoute().query.return?.toString() || '/';

function onLinkedIn() {
  startSocialLogin('linkedin', returnPath.startsWith('/') ? returnPath : '/');
}
</script>
```

```vue
<!-- pages/auth/callback.vue -->
<script setup lang="ts">
definePageMeta({ layout: false });
const { completeSocialCallback } = useQelosAuth();

onMounted(async () => {
  const returnPath = await completeSocialCallback();
  await navigateTo(returnPath);
});
</script>
```

### Common mistakes

| Mistake | Symptom |
|---|---|
| `returnUrl` set to `/feed` (final destination) instead of `/auth/callback` | OAuth completes but user is never logged in — `exchangeAuthCallback` never runs |
| Missing `redirectUrl` on a custom domain | Qelos falls back to `tenanthost` (often the admin subdomain); LinkedIn reports `redirect_uri` mismatch |
| App domain not in `websiteUrls` | `redirectUrl` rejected; wrong callback host |
| Missing Netlify `postbuild` / plugin | Query params stripped; `redirectUrl` never reaches auth |
| LinkedIn callback URL not registered | Provider error: "redirect_uri does not match" |

See also: [Nuxt integrator — social login](../integrators/nuxt.md#social-login-nuxt--netlify) and [API Proxy](../plugins/api-proxy.md).

### OAuth callback URI resolution

On `GET /api/auth/:provider` and `GET /api/auth/:provider/callback`, Qelos
loads the tenant's app-configuration and resolves the `redirect_uri` sent to
the OAuth provider as follows:

1. If `redirectUrl` is present (query on login, or packed in signed OAuth
   `state` on callback) **and** its host matches an entry in
   `metadata.websiteUrls`, use
   `<redirectUrl origin>/api/auth/:provider/callback`.
2. Otherwise use `<tenanthost>/api/auth/:provider/callback` (HTTPS by default;
   Facebook uses HTTP).

Multi-domain tenants should list every hostname in **Admin → App configuration →
Hostnames** (`metadata.websiteUrls`) and whitelist the matching callback URLs
with each OAuth provider.

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

## HTTP API reference

### `GET /api/auth/:provider`

| Query param | Required | Description |
|---|---|---|
| `state` | no | Opaque value echoed on return. |
| `returnUrl` | no | Post-auth redirect for the SDK flow (see table above). |
| `redirectUrl` | no | Override OAuth callback origin when host is in `websiteUrls`. |

### `GET /api/auth/:provider/callback`

OAuth provider redirect target. Uses the same callback URI resolution as the
login step (including `redirectUrl` recovered from signed `state`).

### `POST /api/auth/callback?rt=<refreshToken>`

Exchanges the refresh token from step 7 for a cookie session. Used by
`exchangeAuthCallback()`.

## Errors

| Symptom | Cause |
|---|---|
| Redirect loop ending at `/api/auth/<p>?error=disabled` | Provider not enabled in the auth config |
| 400 `No website URL configured for tenant` | Could not resolve OAuth callback URI (missing `tenanthost` and no valid `redirectUrl`) |
| 400 from `exchangeAuthCallback` | Missing `rt` parameter |
| 401 from `exchangeAuthCallback` | Refresh token invalid, expired, or already exchanged |
| Stuck on provider page | Callback URL not whitelisted with the provider |
| Provider error: `redirect_uri does not match` | `redirectUrl` not reaching Qelos (proxy dropped query params), wrong `tenanthost` fallback, or callback URL not registered with the provider for the host Qelos actually sends |
| OAuth completes but user not logged in | `returnUrl` points to final destination instead of your `/auth/callback` handoff page |
| Browser lands on `/` instead of `returnUrl` | `returnUrl` host not listed in `metadata.websiteUrls` |

## What the user gets

A successful exchange leaves the SDK in the same state as a successful
[email/password signin](./email-password) — a cookie session is active,
and the user can be re-fetched via `sdk.authentication.getLoggedInUser()`.

To use OAuth tokens (bearer pair) instead of a cookie session for social
logins, use the OAuth signin path on your own backend after exchanging
the refresh token via `sdk.authentication.refreshToken(rt)`. Most apps
should stick with the cookie flow.
