# @qelos/integrator-nuxt

Nuxt 3 integrator for [Qelos](https://qelos.io). Adds a server middleware that
identifies the current user and active workspace via the
[`@qelos/sdk`](https://www.npmjs.com/package/@qelos/sdk) before your own
Nitro/Nuxt route handlers run, and exposes them through the H3 event context.

A token-refresh hook keeps the access token fresh: when the SDK detects an
expired access token, it transparently refreshes it using the request's refresh
token and writes the rotated cookie pair back on the response.

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
