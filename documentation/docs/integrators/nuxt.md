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

### Social login

```ts
// server/api/auth/google.get.ts
import QelosSDK from '@qelos/sdk';

export default defineEventHandler(async (event) => {
  const sdk = new QelosSDK({ appUrl: useRuntimeConfig().qelos.appUrl });
  return sendRedirect(event, sdk.authentication.getSocialLoginUrl('google', {
    returnUrl: 'https://your-app.com/dashboard',
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
  if (headers['set-cookie']) appendResponseHeader(event, 'set-cookie', headers['set-cookie']);
  return sendRedirect(event, '/');
});
```

### Token refresh

When the access token is rejected, the SDK tries the refresh token. After
a successful refresh the module fires the `onTokenRefresh` hook. The
default implementation writes the rotated tokens back as cookies
(`HttpOnly`, `SameSite=Lax`, `Secure` whenever `appUrl` is `https://…`).

Override the behavior — and/or the workspace selection — by registering
your own middleware:

```ts
// server/middleware/qelos.ts
import { createQelosMiddleware } from '@qelos/integrator-nuxt';

export default createQelosMiddleware({
  config: useRuntimeConfig().qelos,
  resolveWorkspace: ({ user, workspaces }) =>
    workspaces.find(w => w._id === user.metadata?.activeWorkspace) || workspaces[0] || null,
  onTokenRefresh: async ({ event, newTokens }) => {
    setCookie(event, 'q_access_token', newTokens.accessToken, { httpOnly: true });
    if (newTokens.refreshToken) {
      setCookie(event, 'q_refresh_token', newTokens.refreshToken, { httpOnly: true });
    }
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

- **The integrator package is for external apps only.** Apps inside the
  Qelos monorepo MUST NOT depend on `@qelos/integrator-*` — they talk to
  the gateway directly.
- **Server-side SDK only.** `event.context.qelos.sdk` is bound to per-request
  cookies; do not pass it to the client or store it across requests. For
  the browser, use `@qelos/web-sdk` or hit your own Nitro routes.
- **`useQelos()` is read-only** — it reflects the identity resolved on the
  server during SSR. Mutating its refs on the client won't change what the
  server sees on the next request; that's driven by cookies.
- **Workspace selection defaults to the first workspace.** Supply a custom
  `resolveWorkspace` if your users belong to multiple workspaces.
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
