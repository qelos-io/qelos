---
title: Nuxt Integrator
editLink: true
---

# `@qelos/integrator-nuxt`

Nuxt 3 module that registers a server middleware to identify the current
Qelos user and active workspace via the SDK *before* your Nitro/Nuxt
handlers run, exposes the result on `event.context.qelos`, and adds a
`useQelos()` composable so Vue components see the same identity that was
resolved on the server.

A token-refresh hook keeps the access token fresh: when the SDK detects an
expired access token, it transparently refreshes it using the request's
refresh token and writes the rotated cookie pair back on the response.

If you are new to Qelos, read
[Getting Started as an Integrator](../getting-started/integrators.md) first
for the overall flow (CLI, blueprints, deployment).

## 1. Install

```bash
npm install @qelos/integrator-nuxt
```

The integrator pulls `@qelos/sdk` in as a transitive dependency; you don't
need to install it separately unless you also use the SDK from your own
code.

## 2. Configure the module

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@qelos/integrator-nuxt'],
  qelos: {
    appUrl: 'https://your-qelos-instance.com',
    // Optional — defaults shown:
    accessTokenCookie: 'q_access_token',
    refreshTokenCookie: 'q_refresh_token',
    requireAuth: false,
    skipPaths: ['/api/_auth', '/health'],
  },
});
```

You can also override any field at runtime via `NUXT_QELOS_*` env vars
(Nuxt runtime-config conventions apply).

What the module does on setup:

- Registers Nitro server middleware (via the module’s server handler) that
  resolves the user, picks the active workspace, and stores the result on
  `event.context.qelos`.
- Auto-imports the `useQelos()` composable for components.
- Augments the H3 event context type so `event.context.qelos` is fully
  typed.

To skip the default middleware registration — for example when you want
full control over `resolveWorkspace` — set `qelos.disableMiddleware: true`
and register `createQelosMiddleware` from your own Nitro server
middleware file under `server/middleware/`.

### API token mode

For service-to-service deployments where every request shares one Qelos API
token, set `apiToken` and the middleware skips the cookie/refresh flow:

```ts
qelos: {
  appUrl: 'https://your-qelos-instance.com',
  apiToken: process.env.QELOS_API_TOKEN,
}
```

## 3. Access user and workspace in your routes

`event.context.qelos` is typed as `QelosRequestContext`:

| field        | description                                                 |
|--------------|-------------------------------------------------------------|
| `user`       | `IUser` from `@qelos/sdk` or `null` when anonymous.         |
| `workspace`  | The active `IWorkspace` for the request, or `null`.         |
| `workspaces` | All workspaces the user has access to.                      |
| `sdk`        | A request-scoped `QelosSDK` instance bound to the tokens.   |
| `tokens`     | The current access/refresh token pair (mutated on refresh). |

The recommended wrapper, `defineQelosEventHandler`, gives you a typed
`qelos` context as a second argument and asserts the middleware ran:

```ts
// server/api/products.ts
import { defineQelosEventHandler } from '@qelos/integrator-nuxt';

export default defineQelosEventHandler(async ({ qelos }) => {
  return qelos.sdk.entities('products').getList();
});
```

Pass `{ requireAuth: true }` to short-circuit anonymous requests with
`401`:

```ts
// server/api/me.ts
import { defineQelosEventHandler } from '@qelos/integrator-nuxt';

export default defineQelosEventHandler(({ qelos }) => {
  return { user: qelos.user, workspace: qelos.workspace };
}, { requireAuth: true });
```

Or use `defineEventHandler` directly — `event.context.qelos` is also
populated:

```ts
// server/api/me.ts
export default defineEventHandler((event) => {
  const { user, workspace } = event.context.qelos!;
  if (!user) throw createError({ statusCode: 401 });
  return { user, workspace };
});
```

### From components and pages

`useQelos()` is auto-imported in your Vue components and reads the identity
that was resolved by the server middleware. Values are seeded during SSR and
hydrated on the client through the Nuxt payload, so no extra round-trip is
needed:

```vue
<script setup lang="ts">
const { user, workspace, workspaces, isAuthenticated } = useQelos();
</script>

<template>
  <div v-if="isAuthenticated">
    Hi {{ user.firstName }} — workspace: {{ workspace?.name }}
  </div>
</template>
```

For data calls from the browser, prefer hitting your own server routes (so
refresh-token rotation stays on the server):

```vue
<script setup lang="ts">
const { data: products } = await useFetch('/api/products');
</script>
```

If you need direct browser access to the Qelos API, use
[`@qelos/web-sdk`](../web-sdk/) — the server-side SDK in this package is
bound to per-request cookies and isn't intended for client use.

## 4. Handle authentication

### Cookie-based session (recommended for browsers)

Most flows let users sign in directly against the Qelos backend (admin
panel, hosted login page, or a frontend that calls
`sdk.authentication.signin`). Qelos sets `q_access_token` and
`q_refresh_token` cookies on the user's browser; from that point the
server middleware reads them on every request.

You can also drive the login from your own Nitro endpoint:

```ts
// server/api/auth/login.post.ts
import QelosSDK from '@qelos/sdk';

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username: string; password: string }>(event);
  const sdk = new QelosSDK({ appUrl: useRuntimeConfig().qelos.appUrl });
  const { payload, headers } = await sdk.authentication.signin(body);
  if (headers['set-cookie']) appendResponseHeader(event, 'set-cookie', headers['set-cookie']);
  return { user: payload.user };
});
```

### Social login (Nuxt + Netlify)

For a **custom-domain Nuxt app** deployed to Netlify (the most common
integrator setup), use the same-origin BFF pattern proven in production by
[Flaminga](https://app.flaminga.earth). The full walkthrough — admin
config, Netlify plugin, composable, and troubleshooting — is in
[Social Authentication → Nuxt + Netlify](../auth/social-auth.md#nuxt-netlify-reference-implementation).

Summary:

1. Proxy `/api/*` to Qelos with `@qelos/plugin-netlify-api` and
   `postbuild: qelos-netlify-patch-redirects`.
2. Point the browser SDK at `location.origin`, not the Qelos tenant URL.
3. Start login with `returnUrl: '/auth/callback'` and
   `redirectUrl: '<origin>/api/auth/<provider>/callback'`.
4. On `/auth/callback`, call `exchangeAuthCallback(rt)` then redirect to
   the user's final destination.

**Auth composable** (browser, same-origin):

```ts
// composables/useQelosAuth.ts
import QelosSDK from '@qelos/sdk';
import type { SocialProvider } from '@qelos/sdk/src/authentication';

const OAUTH_STATE_KEY = 'oauth-state';
const OAUTH_RETURN_KEY = 'oauth-return';

export function useQelosAuth() {
  const config = useRuntimeConfig();

  function appUrl() {
    if (import.meta.client) return globalThis.location.origin;
    return (config.public.siteUrl as string) || 'http://localhost:3000';
  }

  function createSdk() {
    return new QelosSDK({
      appUrl: appUrl(),
      fetch: (input, init) =>
        globalThis.fetch(input, { ...init, credentials: 'include' }),
    });
  }

  function startSocialLogin(provider: SocialProvider, returnPath = '/') {
    const state = crypto.randomUUID();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    sessionStorage.setItem(OAUTH_RETURN_KEY, returnPath);

    const loginUrl = new URL(
      createSdk().authentication.getSocialLoginUrl(provider, {
        state,
        returnUrl: '/auth/callback',
      }),
    );
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
    if (returnedState !== sessionStorage.getItem(OAUTH_STATE_KEY)) {
      throw new Error('Invalid OAuth state');
    }
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    if (!rt) throw new Error('Missing refresh token');

    await createSdk().authentication.exchangeAuthCallback(rt);
    history.replaceState({}, '', globalThis.location.pathname);

    const returnPath = sessionStorage.getItem(OAUTH_RETURN_KEY) || '/';
    sessionStorage.removeItem(OAUTH_RETURN_KEY);
    return returnPath;
  }

  return { createSdk, startSocialLogin, completeSocialCallback };
}
```

**Login page** — store the post-login destination separately from
`returnUrl`:

```vue
<!-- pages/login.vue -->
<script setup lang="ts">
const route = useRoute();
const { startSocialLogin } = useQelosAuth();
const returnPath =
  typeof route.query.return === 'string' && route.query.return.startsWith('/')
    ? route.query.return
    : '/';

function onSocialLogin(provider: 'linkedin' | 'google' | 'github' | 'facebook') {
  startSocialLogin(provider, returnPath);
}
</script>
```

**Callback page** — exchange the refresh token for a session cookie:

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

**`netlify.toml` + `package.json`:**

```toml
[[plugins]]
  package = "@qelos/plugin-netlify-api"
```

```json
{
  "scripts": {
    "build": "nuxt build",
    "postbuild": "qelos-netlify-patch-redirects"
  }
}
```

::: warning `returnUrl` is not your dashboard URL
`returnUrl` is where Qelos delivers `?rt=<refreshToken>`. It must be the
route that calls `exchangeAuthCallback()` (e.g. `/auth/callback`). Putting
`/feed` or `/dashboard` here means the token lands on a page that never
exchanges it, and the user stays logged out.
:::

#### Server-side alternative (SSR / non-Netlify)

If your Nuxt app runs as a full Nitro server (not static Netlify), you can
redirect from a Nitro route instead of the browser composable above:

```ts
// server/api/auth/google.get.ts
import QelosSDK from '@qelos/sdk';

export default defineEventHandler(async (event) => {
  const sdk = new QelosSDK({ appUrl: useRuntimeConfig().qelos.appUrl });
  return sendRedirect(event, sdk.authentication.getSocialLoginUrl('google', {
    returnUrl: '/auth/callback',
  }));
});
```

```ts
// server/api/auth/callback.get.ts
import QelosSDK from '@qelos/sdk';

export default defineEventHandler(async (event) => {
  const rt = String(getQuery(event).rt);
  const sdk = new QelosSDK({ appUrl: useRuntimeConfig().qelos.appUrl });
  const { headers } = await sdk.authentication.exchangeAuthCallback(rt);
  if (headers['set-cookie']) {
    appendResponseHeader(event, 'set-cookie', headers['set-cookie']);
  }
  return sendRedirect(event, '/');
});
```

On Netlify static deploys, prefer the browser composable — the Nitro
`/api/**` handler is not available at runtime; `/api/*` is proxied by the
Netlify function instead.

### Cookies and `/api/me`

The module registers server middleware that calls **`GET /api/me`** on the
managed Qelos origin (same proxy-target rules as the `/api/**` Nitro proxy)
and forwards `Set-Cookie` with `Domain=` rewritten. The request-scoped SDK
forwards cookies on each call.

For custom workspace rules, pass `resolveWorkspace` to `createQelosMiddleware`
(if you disabled the default middleware). See [Cookie Token Lifecycle](../auth/cookie-tokens.md).

```ts
// server/middleware/qelos.ts — optional manual registration
import { createQelosMiddleware } from '@qelos/integrator-nuxt';

export default createQelosMiddleware({
  config: useRuntimeConfig().qelos,
  resolveWorkspace: ({ user, workspaces }) => {
    const wanted = user.metadata?.activeWorkspace as string | undefined;
    if (wanted) {
      const match = workspaces.find((w) => w._id === wanted);
      if (match) return match;
    }
    return user.workspace || null;
  },
});
```

Set `qelos.disableMiddleware: true` in `nuxt.config.ts` to suppress the
default registration in favor of your own.

## 5. Query entities

Inside any handler the SDK is already authenticated, so blueprint
permissions are enforced for free:

```ts
// server/api/products.ts
import { defineQelosEventHandler } from '@qelos/integrator-nuxt';

export default defineQelosEventHandler(({ qelos }) =>
  qelos.sdk.entities('products').getList({ status: 'active' }),
);

// server/api/products.post.ts
export default defineQelosEventHandler(async ({ event, qelos }) => {
  const body = await readBody(event);
  return qelos.sdk.entities('products').create(body);
}, { requireAuth: true });
```

The full surface — `getList`, `create`, `update`, `remove`, etc. — is in
the [Blueprints Operations reference](../sdk/blueprints_operations.md).

## 6. Common patterns and gotchas

- **`no website for host: <IP>` on `/api/me`.** Usually `qelos.appUrl` points
  at a raw IP via `QELOS_IP` / `QELOS_API_IP` instead of the tenant domain, or
  your app hostname is missing from `websiteUrls`. See
  [Integrator Troubleshooting](./troubleshooting.md#no-website-for-host-ip-address).
- **The integrator package is for external apps only.** Apps inside the
  Qelos monorepo MUST NOT depend on `@qelos/integrator-*` — they talk to
  the gateway directly.
- **Server-side SDK only.** `event.context.qelos.sdk` is bound to per-request
  cookies; do not pass it to the client or store it across requests. For
  the browser, use `@qelos/web-sdk` or hit your own Nitro routes.
- **`useQelos()` is read-only** — it reflects the identity resolved on the
  server during SSR. Mutating its refs on the client won't change what the
  server sees on the next request; that's driven by cookies.
- **Active workspace comes from `/api/me`’s `user.workspace`, not
  `workspaces[0]`.** Supply `resolveWorkspace` when you need another rule.
- **`requireAuth` returns `401`, not a redirect.** Add a `definePageMeta`
  middleware or check `useQelos().isAuthenticated` in your layout if you
  want a login redirect on the client.
- **`skipPaths` matches a prefix.** Add `/_nuxt`, `/_nuxt/...`,
  `/api/_auth/...`, etc. to bypass identity resolution for paths that
  shouldn't trigger an SDK call.
- **Don't mix the module's middleware with your own.** Either let the
  module register the default handler, or set `disableMiddleware: true`
  and register `createQelosMiddleware` yourself — running both adds
  needless duplicate SDK calls per request.
- **Never point `NUXT_QELOS_PROXY_TARGET` / `QELOS_IP` / `QELOS_API_IP` at a
  raw IP in production.** `resolveQelosProxyTarget` prefers these over
  `appUrl`, but the package does not rewrite the outbound `Host` header for
  IP targets. Qelos routes tenants by `Host`, so the request arrives with
  `Host: <ip>` and Qelos replies `{"message":"no website for host: <ip>"}` —
  on both the `/api/**` Nitro proxy and the `/api/me` identity round-trip.
  Treat these vars as **dev-only** overrides (e.g. reaching a Qelos instance
  that has no DNS name yet) and leave them unset — or point them at a real
  hostname — in production. If you must proxy through a raw IP, you have to
  rewrite `Host` yourself; note that `fetch`/`undici` treat `Host` as a
  forbidden header and silently ignore attempts to set it via `headers`, so
  a `fetch`-based `proxyRequest` override won't work — use a lower-level
  HTTP client instead.
