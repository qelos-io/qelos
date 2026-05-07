# @qelos/integrator-next

Qelos integrator middleware for **Next.js** — supports both the **App Router**
and the **Pages Router**, on Next.js **14** and **15**. Drop it into your
Next.js app to identify the user and active workspace via the Qelos SDK
*before* your own handlers run, and to keep refresh-token cookies fresh on
every request.

The package is a sibling of `@qelos/integrator-express` and
`@qelos/integrator-nuxt` — they all expose the same `QelosRequestContext`
shape (`{ user, workspace, workspaces, sdk, tokens }`).

## Install

```bash
pnpm add @qelos/integrator-next @qelos/sdk
```

`next` (>=13.4) and `react` are peer dependencies. Tested with Next.js 14.2
and 15.x on both the App Router and the Pages Router.

## Quick start

Set `QELOS_APP_URL` (and any optional vars below) in your environment, then
re-export the pre-built middleware and use the no-arg context loader:

```ts
// middleware.ts
export { qelosMiddleware as middleware } from '@qelos/integrator-next/middleware';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

```tsx
// app/dashboard/page.tsx
import { getQelosContext } from '@qelos/integrator-next/context';

export default async function Dashboard() {
  const { user, sdk } = await getQelosContext();
  if (!user) return <p>Please sign in.</p>;
  const products = await sdk.entities('products').getList();
  return <div>Welcome {user.fullName}, you have {products.length} products</div>;
}
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `QELOS_APP_URL` | — (required) | Qelos backend base URL |
| `QELOS_API_TOKEN` | — | Service-to-service token (skips refresh logic) |
| `QELOS_ACCESS_TOKEN_COOKIE` | `q_access_token` | Cookie name for the access token |
| `QELOS_REFRESH_TOKEN_COOKIE` | `q_refresh_token` | Cookie name for the refresh token |
| `QELOS_REQUIRE_AUTH` | `false` | Set `true` to reject anonymous requests with 401 |
| `QELOS_SKIP_PATHS` | — | Comma-separated path prefixes to bypass entirely |

## Explicit configuration (App Router)

When you need control over `resolveWorkspace`, `onTokenRefresh`, or any other
option, call the factory yourself.

### 1. Edge middleware

```ts
// middleware.ts
import { createQelosMiddleware } from '@qelos/integrator-next/middleware';

export default createQelosMiddleware({
  config: {
    appUrl: process.env.QELOS_APP_URL!,
    skipPaths: ['/_next', '/favicon.ico'],
    requireAuth: false,
  },
  resolveWorkspace: ({ req, workspaces }) => {
    const slug = req.nextUrl.searchParams.get('workspace');
    return workspaces.find((w) => (w as any).slug === slug) ?? workspaces[0] ?? null;
  },
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

The middleware:

- Reads tokens from cookies (`q_access_token`, `q_refresh_token`) or the
  `Authorization` header.
- Calls the Qelos SDK to resolve the user and the active workspace.
- Forwards the resolved ids to downstream handlers via the
  `x-qelos-user-id` and `x-qelos-workspace-id` request headers.
- Refreshes the access/refresh token pair when needed and writes the new
  cookies onto the outbound response.
- Returns `401` early when `config.requireAuth: true` and the user cannot be
  resolved.

### 2. Server components (RSC)

`getQelosContext()` is safe to call inside React Server Components on both
Next.js 14 (sync `cookies()` / `headers()`) and Next.js 15 (async). Wrap it
with React's `cache()` so re-renders within the same request reuse the result:

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

### 3. Route handlers (`app/api/**/route.ts`)

```ts
// app/api/me/route.ts
import { NextResponse } from 'next/server';
import { withQelosRoute } from '@qelos/integrator-next/route';

export const GET = withQelosRoute((_req, _ctx, qelos) => {
  if (!qelos.user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: qelos.user, workspace: qelos.workspace });
});
```

Anywhere downstream — including modules outside the React tree — can read the
active context from AsyncLocalStorage via `getStoredQelosContext()`, provided
execution went through `withQelosRoute`, `withQelosContext`, or one of the
Pages Router wrappers.

```ts
// services/products.ts
import { getStoredQelosContext } from '@qelos/integrator-next/context';

export async function listProducts() {
  const qelos = getStoredQelosContext();
  if (!qelos?.sdk) throw new Error('no qelos context');
  return qelos.sdk.entities('products').getList();
}
```

## Pages Router

### API routes

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

### `getServerSideProps`

```ts
// pages/dashboard.tsx
import { withQelosSSR } from '@qelos/integrator-next/pages';

export const getServerSideProps = withQelosSSR(
  async (_ctx, qelos) => ({ props: { user: qelos.user, workspace: qelos.workspace } }),
  { config: { appUrl: process.env.QELOS_APP_URL!, requireAuth: true } },
);
```

## Token refresh

When a request arrives with an expired access token, the SDK's failed-auth
path triggers a refresh, in order:

1. If a refresh token is present, calls
   `sdk.authentication.refreshToken()` (`POST /api/token/refresh`) — issues a
   new access + refresh pair.
2. Otherwise, calls `sdk.authentication.refreshCookieToken()`
   (`POST /api/cookie/refresh`) — used for cookie-only sessions that do not
   carry a separate refresh token (e.g. social-auth flows).

The new pair is then written back to cookies using the configured
`accessTokenCookie` / `refreshTokenCookie` names — automatically in App
Router middleware (`response.cookies.set`), Pages Router API routes
(`Set-Cookie` header), and `getServerSideProps` responses.

App Router server components and route handlers cannot mutate cookies after
rendering starts, so the default refresh hook there is a no-op — the new
tokens are still applied to the in-memory pair so subsequent SDK calls in the
same request use the fresh access token. To persist the refreshed pair, hand
the request off to a route handler that calls `cookies().set(...)`.

Override the behaviour by passing `onTokenRefresh` to any of the wrappers.
The hook receives:

```ts
interface TokenRefreshContext<T> {
  target: T;          // NextResponse | NextApiResponse | ServerResponse | null
  oldTokens: { accessToken?: string; refreshToken?: string };
  newTokens: { accessToken: string; refreshToken?: string };
  sdk: QelosSDK;
}
```

### Manual cookie refresh

Long-lived integrator-hosted sessions can also call the SDK directly to
proactively refresh the cookie token. From a route handler that owns the
response (so it can mutate cookies):

```ts
// app/api/session/refresh/route.ts
import { NextResponse } from 'next/server';
import { withQelosRoute } from '@qelos/integrator-next/route';

export const POST = withQelosRoute(async (_req, _ctx, qelos) => {
  const result = await qelos.sdk.authentication.refreshCookieToken();
  // result.headers['set-cookie'] — fresh cookie value to forward
  return NextResponse.json({ user: result.payload.user });
});
```

## Configuration

```ts
interface QelosNextConfig {
  appUrl: string;                 // Qelos backend base URL
  apiToken?: string;              // service-to-service token (skips refresh logic)
  accessTokenCookie?: string;     // default 'q_access_token'
  refreshTokenCookie?: string;    // default 'q_refresh_token'
  requireAuth?: boolean;          // 401/redirect on anonymous (default false)
  skipPaths?: string[];           // path prefixes to bypass entirely
  sdkOptions?: Partial<QelosSDKOptions>;
}
```

## Subpath exports

| Import | Purpose |
|---|---|
| `@qelos/integrator-next` | Everything (re-exports of all subpaths) |
| `@qelos/integrator-next/middleware` | Edge middleware (`qelosMiddleware`, `createQelosMiddleware`) |
| `@qelos/integrator-next/context` | Server-component / route-handler context (`getQelosContext`, `getStoredQelosContext`) |
| `@qelos/integrator-next/route` | App Router route wrapper (`withQelosRoute`) |
| `@qelos/integrator-next/pages` | Pages Router wrappers (`withQelosApi`, `withQelosSSR`) |
| `@qelos/integrator-next/types` | Shared types |
