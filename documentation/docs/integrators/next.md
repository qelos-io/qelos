---
title: Next.js Integrator
editLink: true
---

# `@qelos/integrator-next`

Qelos integrator for **Next.js**. Supports both the **App Router** and the
**Pages Router** on Next.js **14** and **15**, drops in as edge middleware,
and exposes the same `QelosRequestContext` shape (`{ user, workspace,
workspaces, sdk }`) as the Express, Fastify, NestJS, Nuxt, and FastAPI
integrators.

If you are new to Qelos, read
[Getting Started as an Integrator](../getting-started/integrators.md) first
for the overall flow (CLI, blueprints, deployment).

## 1. Install

```bash
npm install @qelos/integrator-next @qelos/sdk
```

`next` (≥13.4) and `react` are peer dependencies. Tested with Next.js
14.2 and 15.x, on both routers.

### Environment variables

The factory reads these by default — you can also pass them inline via
`config: { … }` to any wrapper:

| Variable | Default | Description |
|---|---|---|
| `QELOS_APP_URL` | — (required) | Qelos backend base URL |
| `QELOS_API_TOKEN` | — | Service-to-service token |
| `QELOS_REQUIRE_AUTH` | `false` | Set `true` to reject anonymous requests with 401 |
| `QELOS_SKIP_PATHS` | — | Comma-separated path prefixes to bypass entirely |
| `QELOS_DISABLE_PROXY` | `false` | Set `true` to disable auto `/api/` skip when not using the BFF proxy pattern |

## 2. Configure the middleware

For most apps, re-export the pre-built middleware:

```ts
// middleware.ts
export { qelosMiddleware as middleware } from '@qelos/integrator-next/middleware';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

When you need explicit control over `resolveWorkspace` or other options,
call the factory yourself:

```ts
// middleware.ts
import { createQelosMiddleware } from '@qelos/integrator-next/middleware';

export default createQelosMiddleware({
  config: {
    appUrl: process.env.QELOS_APP_URL!,
    skipPaths: ['/_next', '/favicon.ico'],
    requireAuth: false,
  },
  resolveWorkspace: ({ req, user, workspaces }) => {
    const slug = req.nextUrl.searchParams.get('workspace');
    const bySlug = workspaces.find((w) => (w as { slug?: string }).slug === slug);
    return bySlug || user.workspace || null;
  },
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

The middleware:

- Resolves the managed Qelos origin (proxy target env overrides, then `appUrl`).
- Calls `GET /api/me` on that origin with inbound `Cookie` and `Authorization`,
  and forwards upstream `Set-Cookie` with `Domain=` rewritten to the inbound
  host.
- Loads `workspaces` via the request-scoped SDK; sets `workspace` from
  `user.workspace` or `resolveWorkspace` — **not** `workspaces[0]`.
- Forwards resolved ids to downstream handlers via `x-qelos-user-id` and
  `x-qelos-workspace-id` headers for App Router consumers (`getQelosContext`).
- Returns `401` early when `config.requireAuth: true` and the user cannot be
  resolved.

Mount the App Router catch-all API proxy route from `@qelos/integrator-next`
when you want `/api/**` same-origin proxying (see package README).

### Configuration shape

```ts
interface QelosNextConfig {
  appUrl: string;
  apiToken?: string;
  requireAuth?: boolean;
  skipPaths?: string[];
  sdkOptions?: Partial<QelosSDKOptions>;
  disableProxy?: boolean;
}
```

## 3. Access user and workspace in your routes

There is no single `withQelos()` helper. Use **`withQelosRoute`** for App
Router route handlers, **`withQelosApi`** / **`withQelosSSR`** for the
Pages Router, **`withQelosContext`** to run arbitrary async server code with
context (including AsyncLocalStorage for `getStoredQelosContext()`), and
**`getQelosContext()`** in server components.

`QelosRequestContext` is the same shape across every integrator:

```ts
interface QelosRequestContext {
  user: IUser | null;
  workspace: IWorkspace | null;
  workspaces: IWorkspace[];
  sdk: QelosSDK;
}
```

How you read it depends on where you are.

### Server components (App Router)

`getQelosContext()` is safe to call in any RSC on Next.js 14 (sync
`cookies()` / `headers()`) and Next.js 15 (async). Wrap it in
`React.cache` so every component in the same request shares one fetch:

```tsx
// lib/qelos.ts
import { cache } from 'react';
import { getQelosContext } from '@qelos/integrator-next/context';

export const loadQelos = cache(() => getQelosContext());
```

```tsx
// app/page.tsx
import { loadQelos } from '../lib/qelos';

export default async function Page() {
  const { user, workspace } = await loadQelos();
  return <p>Hello {user?.fullName ?? 'guest'} — {workspace?.name}</p>;
}
```

`requireQelosUser()` is the same call but throws `401` when the user is
absent, intended for protected pages.

### Route handlers (App Router)

```ts
// app/api/me/route.ts
import { NextResponse } from 'next/server';
import { withQelosRoute } from '@qelos/integrator-next/route';

export const GET = withQelosRoute((_req, _ctx, qelos) => {
  if (!qelos.user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: qelos.user, workspace: qelos.workspace });
});
```

`withQelosRoute` also stores the context in AsyncLocalStorage. Anywhere
downstream — including modules outside the React tree — can read it via
`getStoredQelosContext()`:

```ts
// services/products.ts
import { getStoredQelosContext } from '@qelos/integrator-next/context';

export async function listProducts() {
  const qelos = getStoredQelosContext();
  if (!qelos?.sdk) throw new Error('no qelos context');
  return qelos.sdk.entities('products').getList();
}
```

### Pages Router

API routes:

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

`getServerSideProps`:

```ts
// pages/dashboard.tsx
import { withQelosSSR } from '@qelos/integrator-next/pages';

export const getServerSideProps = withQelosSSR(
  async (_ctx, qelos) => ({ props: { user: qelos.user, workspace: qelos.workspace } }),
  { config: { appUrl: process.env.QELOS_APP_URL!, requireAuth: true } },
);
```

`requireQelosApiUser` is a hand-rolled gate equivalent to `requireUser` in
the other integrators — it returns `401` when no user is attached.

## 4. Handle authentication

### Cookie-based session (recommended for browsers)

Most flows let users sign in directly against the Qelos backend (admin
panel, hosted login page, or a frontend that calls
`sdk.authentication.signin`). Qelos sets `q_access_token` and
`q_refresh_token` cookies on the user's browser; from that point on the
edge middleware reads them and `getQelosContext()` returns a populated
context.

You can also drive the login from a Next.js route handler:

```ts
// app/api/auth/login/route.ts
import QelosSDK from '@qelos/sdk';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { username, password } = await req.json();
  const sdk = new QelosSDK({ appUrl: process.env.QELOS_APP_URL! });
  const { payload, headers } = await sdk.authentication.signin({ username, password });
  const res = NextResponse.json({ user: payload.user });
  // Forward the cookies set by Qelos so the browser stores the session.
  if (headers['set-cookie']) res.headers.set('set-cookie', headers['set-cookie']!);
  return res;
}
```

### Social login

The SDK exposes redirect URLs for every configured provider — redirect the
user, let Qelos handle the OAuth handshake, then exchange the returned
refresh token for a cookie session in your callback route handler:

```ts
// app/api/auth/google/route.ts
import { NextResponse } from 'next/server';
import QelosSDK from '@qelos/sdk';

export async function GET() {
  const sdk = new QelosSDK({ appUrl: process.env.QELOS_APP_URL! });
  return NextResponse.redirect(
    sdk.authentication.getSocialLoginUrl('google', {
      returnUrl: 'https://your-app.com/dashboard',
    }),
  );
}
```

```ts
// app/api/auth/callback/route.ts
import { NextResponse } from 'next/server';
import QelosSDK from '@qelos/sdk';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sdk = new QelosSDK({ appUrl: process.env.QELOS_APP_URL! });
  const { headers } = await sdk.authentication.exchangeAuthCallback(url.searchParams.get('rt')!);
  const res = NextResponse.redirect(new URL('/', req.url));
  if (headers['set-cookie']) res.headers.set('set-cookie', headers['set-cookie']!);
  return res;
}
```

### Cookies and `/api/me`

Edge middleware identifies the user via **`GET /api/me`** on the resolved Qelos
origin and forwards `Set-Cookie` from that response (with `Domain=` rewritten).
The request-scoped SDK forwards cookies on downstream SDK calls. For
`refreshCookieToken()` and manual refresh flows, see
[Cookie Token Lifecycle](../auth/cookie-tokens.md).

### Service-to-service (no end user)

Set `config.apiToken` (or `QELOS_API_TOKEN`) to skip cookies and refresh
entirely.

## 5. Query entities

Inside any wrapper that exposes `qelos`, the SDK is already authenticated
as the current user, so blueprint permissions are enforced for free:

```tsx
// app/dashboard/page.tsx
import { getQelosContext } from '@qelos/integrator-next/context';

export default async function Dashboard() {
  const { user, sdk } = await getQelosContext();
  if (!user) return <p>Please sign in.</p>;
  const products = await sdk.entities('products').getList({ status: 'active' });
  return <div>Welcome {user.fullName}, you have {products.length} products</div>;
}
```

```ts
// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { withQelosRoute } from '@qelos/integrator-next/route';

export const POST = withQelosRoute(async (req, _ctx, qelos) => {
  if (!qelos.user) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  const created = await qelos.sdk.entities('products').create(await req.json());
  return NextResponse.json(created, { status: 201 });
});
```

The full surface — `getList`, `create`, `update`, `remove`, etc. — is in
the [Blueprints Operations reference](../sdk/blueprints_operations.md).

## 6. Subpath exports

| Import | Purpose |
|---|---|
| `@qelos/integrator-next` | Everything (re-exports of all subpaths) |
| `@qelos/integrator-next/middleware` | Edge middleware (`qelosMiddleware`, `createQelosMiddleware`) |
| `@qelos/integrator-next/context` | Server-component / route-handler context (`getQelosContext`, `getStoredQelosContext`, `requireQelosUser`) |
| `@qelos/integrator-next/route` | App Router route wrapper (`withQelosRoute`) |
| `@qelos/integrator-next/pages` | Pages Router wrappers (`withQelosApi`, `withQelosSSR`, `requireQelosApiUser`) |
| `@qelos/integrator-next/types` | Shared types |

## 7. Common patterns and gotchas

- **The integrator package is for external apps only.** Apps inside the
  Qelos monorepo MUST NOT depend on `@qelos/integrator-*` — they talk to the
  gateway directly.
- **The middleware runs on the edge.** Don't import Node-only APIs into
  `middleware.ts` — keep heavy work in route handlers, server components,
  or `getServerSideProps`.
- **Cookie rotations from Qelos** reach the browser via `Set-Cookie` on the
  middleware's `/api/me` round-trip and on API responses when you use the
  catch-all BFF proxy pattern.
- **`getStoredQelosContext()` only works inside `withQelosRoute` /
  `withQelosContext`** (or the Pages Router wrappers). Outside that
  AsyncLocalStorage scope it returns `undefined` — call `getQelosContext()`
  explicitly instead.
- **Cache `getQelosContext()` per render.** Wrap it in `React.cache` so
  multiple components in the same render don't repeat the user lookup.
- **`config.requireAuth: true` returns `401` from the middleware.** It does
  not redirect to a login page; if you want a redirect, write a custom
  middleware or guard the page in a server component with
  `requireQelosUser()` and `redirect('/login')`.
- **Active workspace comes from `/api/me`’s `user.workspace`, not
  `workspaces[0]`.** Supply `resolveWorkspace` when you need another rule.
- **Don't reuse the per-request SDK across requests.** Build a fresh
  `QelosSDK` with `apiToken` for cron jobs and workers.
