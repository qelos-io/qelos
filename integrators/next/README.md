# @qelos/integrator-next

Qelos integrator middleware for **Next.js** — supports both the **App Router**
and the **Pages Router**. Drop it into your Next.js app to identify the user
and active workspace via the Qelos SDK *before* your own handlers run, and to
keep refresh-token cookies fresh on every request.

The package is published as a sibling of `@qelos/integrator-express` and
`@qelos/integrator-nuxt` — they all expose the same `QelosRequestContext`
shape (`{ user, workspace, workspaces, sdk, tokens }`).

## Install

```bash
pnpm add @qelos/integrator-next @qelos/sdk
```

`next` (>=13.4) and `react` are peer dependencies.

## App Router

### 1. Edge middleware (`middleware.ts`)

```ts
// middleware.ts
import { createQelosMiddleware } from '@qelos/integrator-next/middleware';

export default createQelosMiddleware({
  config: {
    appUrl: process.env.QELOS_APP_URL!,
    skipPaths: ['/_next', '/favicon.ico'],
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

### 2. Server components / route handlers

```ts
// app/api/me/route.ts
import { NextResponse } from 'next/server';
import { withQelosRoute } from '@qelos/integrator-next';

export const GET = withQelosRoute(
  (_req, _ctx, qelos) => {
    if (!qelos.user) return NextResponse.json({ user: null });
    return NextResponse.json({ user: qelos.user, workspace: qelos.workspace });
  },
  { config: { appUrl: process.env.QELOS_APP_URL! } },
);
```

For server components, use `getQelosContext()` directly:

```tsx
// app/page.tsx
import { getQelosContext } from '@qelos/integrator-next/context';
import { cache } from 'react';

const loadQelos = cache(() =>
  getQelosContext({ config: { appUrl: process.env.QELOS_APP_URL! } }),
);

export default async function Page() {
  const { user, workspace } = await loadQelos();
  return <p>Hello {user?.fullName ?? 'guest'} — {workspace?.name}</p>;
}
```

Anywhere downstream — including modules outside of the Next.js component tree
— can read the active context from AsyncLocalStorage via
`getStoredQelosContext()`, provided execution went through `withQelosRoute`,
`withQelosContext`, or the Pages Router wrappers.

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

When a request arrives with an expired access token but a valid refresh
token, the SDK's failed-auth path triggers a refresh through
`/api/token/refresh`. The new pair is then written back to cookies using the
configured `accessTokenCookie` / `refreshTokenCookie` names — automatically
in App Router middleware (`response.cookies.set`), Pages Router API routes
(`Set-Cookie` header), and `getServerSideProps` responses. Override the
behaviour by passing `onTokenRefresh` to any of the wrappers.

The hook receives:

```ts
interface TokenRefreshContext<T> {
  target: T;          // NextResponse | NextApiResponse | ServerResponse | null
  oldTokens: { accessToken?: string; refreshToken?: string };
  newTokens: { accessToken: string; refreshToken: string };
  sdk: QelosSDK;
}
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
