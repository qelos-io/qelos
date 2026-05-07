# @qelos/integrator-nuxt

Nuxt 3 integrator for [Qelos](https://qelos.io). Adds a server middleware that
identifies the current user and active workspace via the
[`@qelos/sdk`](https://www.npmjs.com/package/@qelos/sdk) before your own
Nitro/Nuxt route handlers run, and exposes them through the H3 event context.

A token-refresh hook keeps the access token fresh: when the SDK detects an
expired access token, it transparently refreshes it — either through the
request's refresh token or, for cookie-only sessions, through the access
cookie itself — and writes the rotated cookie pair back on the response.

## Install

```bash
pnpm add @qelos/integrator-nuxt
```

## Configure

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@qelos/integrator-nuxt'],
  qelos: {
    appUrl: 'https://your-qelos-app.com',
    // Optional — defaults shown:
    accessTokenCookie: 'q_access_token',
    refreshTokenCookie: 'q_refresh_token',
    requireAuth: false,
    skipPaths: ['/api/_auth', '/health'],
  },
});
```

You can also override any field at runtime via `NUXT_QELOS_*` env vars (Nuxt
runtime-config conventions apply).

## Use in server routes

The recommended wrapper, `defineQelosEventHandler`, gives you a typed `qelos`
context as a second argument and asserts the middleware ran:

```ts
// server/api/products.ts
import { defineQelosEventHandler } from '@qelos/integrator-nuxt';

export default defineQelosEventHandler(async ({ qelos }) => {
  return qelos.sdk.entities('products').getList();
});
```

Pass `{ requireAuth: true }` to short-circuit anonymous requests with `401`:

```ts
// server/api/me.ts
import { defineQelosEventHandler } from '@qelos/integrator-nuxt';

export default defineQelosEventHandler(({ qelos }) => {
  return { user: qelos.user, workspace: qelos.workspace };
}, { requireAuth: true });
```

Or use `defineEventHandler` directly — `event.context.qelos` is also populated:

```ts
// server/api/me.ts
export default defineEventHandler((event) => {
  const { user, workspace, sdk } = event.context.qelos!;
  if (!user) {
    throw createError({ statusCode: 401 });
  }
  return { user, workspace };
});
```

`event.context.qelos` is typed as `QelosRequestContext`:

| field        | description                                                |
|--------------|------------------------------------------------------------|
| `user`       | `IUser` from `@qelos/sdk` or `null` when anonymous.         |
| `workspace`  | The active `IWorkspace` for the request, or `null`.         |
| `workspaces` | All workspaces the user has access to.                      |
| `sdk`        | A request-scoped `QelosSDK` instance bound to the tokens.   |
| `tokens`     | The current access/refresh token pair (mutated on refresh). |

## Use in components / pages

`useQelos()` is auto-imported in your Vue components and reads the identity
that was resolved by the server middleware. Values are seeded during SSR and
hydrated on the client through the Nuxt payload, so no extra round-trip is
needed.

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
[`@qelos/web-sdk`](https://www.npmjs.com/package/@qelos/web-sdk) instead — the
server-side SDK in this package is bound to per-request cookies and isn't
intended for client use.

## Token refresh

When the access token is rejected, the SDK tries to recover, in order:

1. The **refresh token** (`q_refresh_token`) via
   `sdk.authentication.refreshToken()` — issues a new access + refresh pair.
2. The **cookie token** (the access token cookie itself) via
   `sdk.authentication.refreshCookieToken()` — used for cookie-only sessions
   that do not carry a separate refresh token (e.g. social-auth flows).

After a successful refresh the middleware fires the `onTokenRefresh` hook.
The default implementation writes the new tokens back to the response cookies
(`HttpOnly`, `SameSite=Lax`).

### Manual cookie refresh

Long-lived integrator-hosted sessions can also call the SDK directly to
proactively refresh the cookie token, e.g. from a Nitro route handler:

```ts
// server/api/session/refresh.post.ts
import { defineQelosEventHandler } from '@qelos/integrator-nuxt';

export default defineQelosEventHandler(async ({ qelos }) => {
  const result = await qelos.sdk.authentication.refreshCookieToken();
  // result.headers['set-cookie'] — fresh cookie value to forward
  return { user: result.payload.user };
});
```

## Custom workspace resolution / refresh hook

If the default behavior (first workspace from `sdk.workspaces.getList()` and a
cookie-based refresh writeback) doesn't fit your app, register your own
middleware instead of (or in addition to) the module's default handler:

```ts
// server/middleware/qelos.ts
import { createQelosMiddleware } from '@qelos/integrator-nuxt';

export default createQelosMiddleware({
  config: useRuntimeConfig().qelos,
  resolveWorkspace: ({ user, workspaces }) =>
    workspaces.find(w => w._id === user.metadata?.activeWorkspace) || workspaces[0] || null,
  onTokenRefresh: async ({ event, newTokens }) => {
    // your own persistence — DB, signed cookie, KV, etc.
    setCookie(event, 'q_access_token', newTokens.accessToken, { httpOnly: true });
    setCookie(event, 'q_refresh_token', newTokens.refreshToken, { httpOnly: true });
  },
});
```

To skip the module's default registration, set `qelos.disableMiddleware: true`
in `nuxt.config.ts`.

## API token mode

For service-to-service deployments where every request shares one Qelos API
token, set `apiToken` and the middleware will skip the cookie/refresh flow:

```ts
qelos: {
  appUrl: 'https://your-qelos-app.com',
  apiToken: process.env.QELOS_API_TOKEN,
}
```
