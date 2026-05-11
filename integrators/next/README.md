# @qelos/integrator-next

Next.js integrator for [Qelos](https://qelos.io). It turns your Next.js host into
a same-origin BFF for a managed Qelos app: Edge middleware resolves the current
user via `GET /api/me` with inbound cookies forwarded verbatim, a Node catch-all
route proxies `/api/**` to Qelos with `Set-Cookie` domain rewriting, and the
SDK reads live `Cookie` / `Authorization` headers on every call — no
integrator-managed access or refresh tokens.

Supports the **App Router** and the **Pages Router** on Next.js **14** and
**15**.

> Requires **Node 18+** — the middleware and proxy use
> [`Response.headers.getSetCookie()`](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie)
> to forward individual upstream `Set-Cookie` headers.

## Install

```bash
pnpm add @qelos/integrator-next @qelos/sdk
```

`next` (>=13.4) and `react` are peer dependencies.

## Quick start

Set `QELOS_APP_URL`, then wire Edge middleware and a catch-all API proxy route.

```ts
// middleware.ts
export { qelosMiddleware as middleware } from '@qelos/integrator-next/middleware';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

```ts
// app/api/[...qelos]/route.ts
import { createQelosApiProxyHandlers } from '@qelos/integrator-next/runtime/api-proxy';

const { runtime, GET, POST, PUT, PATCH, DELETE, OPTIONS } =
  createQelosApiProxyHandlers({ appUrl: process.env.QELOS_APP_URL! });

export { runtime, GET, POST, PUT, PATCH, DELETE, OPTIONS };
```

```tsx
// app/dashboard/page.tsx
import { getQelosContext } from '@qelos/integrator-next/context';

export default async function Dashboard() {
  const { user, sdk } = await getQelosContext();
  if (!user) return <p>Please sign in.</p>;
  const products = await sdk.entities('products').getList();
  return (
    <div>
      Welcome {user.fullName}, you have {products.length} products
    </div>
  );
}
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `QELOS_APP_URL` | — (required for default exports) | Qelos managed-app base URL |
| `QELOS_API_TOKEN` | — | Service-to-service token (skips cookie identity for anonymous resolution) |
| `QELOS_REQUIRE_AUTH` | `false` | `true` / `1` → anonymous requests get `401` from middleware |
| `QELOS_SKIP_PATHS` | — | Comma-separated path prefixes to bypass middleware |
| `QELOS_DISABLE_PROXY` | `false` | `true` when you are **not** using the catch-all `/api/**` proxy — skips auto `/api/` in middleware `skipPaths` |

Dev-time proxy target overrides (same resolution order as the proxy):

1. `NEXT_QELOS_PROXY_TARGET`
2. `QELOS_IP`
3. `QELOS_API_IP`
4. `appUrl` from config / `QELOS_APP_URL`

## BFF proxy (`/api/**`)

Register a catch-all App Router handler (see above) that exports the handlers
from `createQelosApiProxyHandlers`. Every request your app does not handle
itself is forwarded to the configured Qelos origin; the response body streams
back and upstream `Set-Cookie` headers are rewritten so `Domain=` matches the
inbound `Host` (port stripped).

User-defined routes under `app/api/...` still take precedence over the catch-all
segment — the proxy only runs for paths nothing else matched.

### Opting out (`disableProxy`)

Set `disableProxy: true` on `QelosNextConfig` when you do not use the catch-all
proxy. Middleware will then **not** auto-prepend `/api/` to `skipPaths`, so you
can run your own `/api/*` handlers without the integrator skipping them for the
proxy.

WebSocket upgrades are not proxied.

## Edge middleware

On each matched request, middleware:

1. Resolves the upstream origin (`NEXT_QELOS_PROXY_TARGET` → `QELOS_IP` →
   `QELOS_API_IP` → `appUrl`). If neither that nor `apiToken` is configured and
   `requireAuth` is false, identity headers are cleared and the request
   continues anonymously.
2. When an upstream origin exists, issues `fetch('${origin}/api/me', { redirect:
   'manual' })` with the inbound `Cookie` and `Authorization` headers forwarded.
3. Appends every upstream `Set-Cookie` to the outgoing response after rewriting
   `Domain=` to the inbound `Host`.
4. On `200` JSON, uses that body as `IUser`, loads workspaces via the SDK, and
   sets the active workspace from `user.workspace` (or your `resolveWorkspace`
   callback) — **not** `workspaces[0]`.
5. Forwards `x-qelos-user-id` and `x-qelos-workspace-id` on the rewritten request
   headers for downstream App Router code.

When the proxy is enabled (`disableProxy !== true`), `/api/` is prepended to
`skipPaths` so middleware does not run the `/api/me` probe on proxied API
traffic (avoids double upstream calls).

> Edge middleware runs in the Edge runtime. The `/api/me` round-trip uses the
> standard `fetch` API with `redirect: 'manual'`. In local dev over plain HTTP,
> browsers may drop upstream `Secure` cookies — use HTTPS locally or configure
> Qelos for non-`Secure` cookies in development.

## App Router server code

Wrap `getQelosContext()` with React `cache()` if you want one resolution per
request. It performs the same `/api/me` identification as middleware (with live
headers) and attempts to apply upstream `Set-Cookie` values through
`next/headers` `cookies().set` when the runtime allows it.

### Route handlers

```ts
// app/api/me/route.ts
import { NextResponse } from 'next/server';
import { withQelosRoute } from '@qelos/integrator-next/route';

export const GET = withQelosRoute((_req, _ctx, qelos) => {
  if (!qelos.user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: qelos.user, workspace: qelos.workspace });
});
```

## Pages Router

```ts
// pages/api/me.ts
import { withQelosApi } from '@qelos/integrator-next/pages';

export default withQelosApi(
  (req, res) => {
    res.json({ user: req.qelos!.user, workspace: req.qelos!.workspace });
  },
  { config: { appUrl: process.env.QELOS_APP_URL! } },
);
```

```ts
// pages/dashboard.tsx
import { withQelosSSR } from '@qelos/integrator-next/pages';

export const getServerSideProps = withQelosSSR(
  async (_ctx, qelos) => ({
    props: { user: qelos.user, workspace: qelos.workspace },
  }),
  { config: { appUrl: process.env.QELOS_APP_URL!, requireAuth: true } },
);
```

## Configuration (`QelosNextConfig`)

| Field | Description |
|-------|-------------|
| `appUrl` | Qelos managed-app base URL |
| `apiToken` | Static token — no `/api/me` cookie identity |
| `requireAuth` | Reject anonymous requests (`401` / redirect) |
| `skipPaths` | Path prefixes to bypass middleware (and `/api/` is auto-prepended when the proxy is enabled) |
| `disableProxy` | Opt out of auto `/api/` skip for middleware |
| `sdkOptions` | Extra `QelosSDK` constructor options |

## Subpath exports

| Import | Purpose |
|--------|---------|
| `@qelos/integrator-next` | Barrel |
| `@qelos/integrator-next/middleware` | Edge middleware |
| `@qelos/integrator-next/context` | `getQelosContext`, AsyncLocalStorage helpers |
| `@qelos/integrator-next/route` | `withQelosRoute` |
| `@qelos/integrator-next/pages` | Pages Router wrappers |
| `@qelos/integrator-next/runtime/api-proxy` | Catch-all proxy handlers (`runtime = 'nodejs'`) |
| `@qelos/integrator-next/types` | Types and header name constants |

## Social auth

`completeSocialAuthCallback` and the re-exported SDK helpers forward Qelos
session cookies from `socialCallback` onto your Node response — use them from
a route handler that owns the response object.
