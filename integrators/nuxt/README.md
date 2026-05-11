# @qelos/integrator-nuxt

Nuxt 3 integrator for [Qelos](https://qelos.io). It plugs into a Nuxt app's
Nitro server to make the Nuxt host act as a same-origin BFF for a managed
Qelos app: requests under `/api/**` are proxied to Qelos, and every other
request resolves the current user up front so your route handlers and Vue
components can use them directly.

## Install

```bash
pnpm add @qelos/integrator-nuxt
```

> Requires Node 18+ — the middleware uses
> [`Response.headers.getSetCookie()`](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie)
> to pipe individual upstream `Set-Cookie` headers back to the client.

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

## API proxy

The module registers a catch-all `/api/**` Nitro server handler that
transparently proxies any request the consuming Nuxt app does not handle
itself to the configured Qelos managed-app origin. This lets the Nuxt app
act as a same-origin BFF: `@qelos/sdk` calls from the browser, server, or
the Qelos web SDK can all hit `/api/...` on the Nuxt host and reach Qelos
without CORS or cross-site cookie pain.

User-defined `server/api/*.ts` (and `server/routes/*.ts`) routes still
take precedence — the proxy only catches requests no other handler matched.

### Cookie domain rewrite

The proxy forwards the incoming `Cookie` header as-is (the Qelos session
cookie name is treated as opaque) and forwards upstream `Set-Cookie`
headers back to the client, rewriting the `Domain=` attribute on every
upstream cookie to the inbound request's own host. That way the session
cookie set by Qelos is valid on the Nuxt app's domain regardless of which
host Qelos issues cookies from.

### Resolving the proxy target

The managed Qelos app URL (`qelos.appUrl`) is the proxy target. Env vars are
only dev-time overrides for when the configured `appUrl` isn't reachable from
the local host:

1. `NUXT_QELOS_PROXY_TARGET` env var.
2. `QELOS_IP` env var (dev fallback).
3. `QELOS_API_IP` env var (dev fallback).
4. `qelos.appUrl`.

If none of these are set, the handler responds with `503` so misconfiguration
fails loudly.

### Opting out

Set `qelos.disableProxy: true` in `nuxt.config.ts` to skip registration of
the proxy handler — useful when the Nuxt app implements every `/api/*`
route itself or terminates the proxy elsewhere (CDN, reverse proxy, etc.).

WebSocket upgrades are not proxied; route them explicitly if needed.

## Middleware

On every non-`/api/` request, the server middleware identifies the current
user by calling the managed Qelos app directly:

1. Resolve the upstream origin the same way the `/api/**` proxy does
   (`NUXT_QELOS_PROXY_TARGET` → `QELOS_IP` → `QELOS_API_IP` →
   `qelos.appUrl`).
2. Issue `fetch('${upstream}/api/me')` with the incoming request's `Cookie`
   header forwarded verbatim — the Qelos session cookie name is opaque to
   the integrator, so the whole header is piped through unchanged. Any
   incoming `Authorization` header is forwarded too.
3. For every `Set-Cookie` header on the upstream response, rewrite the
   `Domain=` attribute to the inbound request's `Host` (port stripped) and
   append it to the outgoing response. This is how session rotations from
   Qelos reach the browser when the managed app and the Nuxt host live on
   different origins.
4. On `2xx`, parse the JSON body and expose it as
   `event.context.qelos.user`. On any other status (or a network error),
   leave `user = null` — and respond with `401` if `qelos.requireAuth` is
   set.

The middleware is independent from the `/api/**` proxy: the proxy handles
forwarding of API calls themselves, while the middleware identifies the
user on every page/non-API request before your route handlers run. To
avoid double-hitting Qelos for `/api/me` (once for proxying, once for user
resolution), the module adds `/api/` to `skipPaths` automatically when the
proxy is enabled.

> The middleware does not attempt to strip the `Secure` attribute from
> rotated cookies. In local dev over plain HTTP, browsers will drop
> `Secure` cookies — configure the managed Qelos app to issue non-`Secure`
> cookies in that environment, or run the Nuxt host over HTTPS.

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

| field        | description                                                      |
|--------------|------------------------------------------------------------------|
| `user`       | The `IUser` body returned by `/api/me`, or `null` when anonymous. |
| `workspace`  | The active `IWorkspace` for the request, or `null`.               |
| `workspaces` | All workspaces the user has access to.                            |
| `sdk`        | A request-scoped `QelosSDK` instance bound to the live cookies.   |

The `sdk` reads cookies from the current `H3Event` on every call, so any
session rotation piped through by the middleware is picked up automatically
by subsequent SDK requests in the same handler.

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
session cookies stay on the server):

```vue
<script setup lang="ts">
const { data: products } = await useFetch('/api/products');
</script>
```

If you need direct browser access to the Qelos API, use
[`@qelos/web-sdk`](https://www.npmjs.com/package/@qelos/web-sdk) instead — the
server-side SDK in this package is bound to per-request cookies and isn't
intended for client use.

## Custom workspace resolution

If the default behavior (first workspace from `sdk.workspaces.getList()`)
doesn't fit your app, register your own middleware instead of (or in
addition to) the module's default handler:

```ts
// server/middleware/qelos.ts
import { createQelosMiddleware } from '@qelos/integrator-nuxt';

export default createQelosMiddleware({
  config: useRuntimeConfig().qelos,
  resolveWorkspace: ({ user, workspaces }) =>
    workspaces.find(w => w._id === user.metadata?.activeWorkspace) || workspaces[0] || null,
});
```

To skip the module's default registration, set `qelos.disableMiddleware: true`
in `nuxt.config.ts`.

## API token mode

For service-to-service deployments where every request shares one Qelos API
token, set `apiToken` and the middleware will skip the cookie flow entirely
and build an SDK that authenticates with the static token:

```ts
qelos: {
  appUrl: 'https://your-qelos-app.com',
  apiToken: process.env.QELOS_API_TOKEN,
}
```
