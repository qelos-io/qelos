---
title: Express Integrator
editLink: true
---

# `@qelos/integrator-express`

Express middleware that resolves the current Qelos user, active workspace, and
a per-request SDK client *before* your route handler runs, and exposes them on
`req.qelos`.

This is the Express implementation of the Qelos integrator contract — the same
shape exposed by `@qelos/integrator-fastify`, `@qelos/integrator-nest`,
`@qelos/integrator-next`, `@qelos/integrator-nuxt`, and the FastAPI integrator.
If you are new to Qelos, read
[Getting Started as an Integrator](../getting-started/integrators.md) first
for the overall flow (CLI, blueprints, deployment).

## 1. Install

```bash
npm install @qelos/integrator-express @qelos/sdk
# express is a peer dependency
npm install express
```

Requirements:

- **Node.js ≥ 18** (the integrator uses the global `fetch`).
- **Express 4 or 5.**

## 2. Configure the middleware

```ts
// app.ts
import express from 'express';
import { createQelosMiddleware } from '@qelos/integrator-express';

const app = express();

app.use(
  createQelosMiddleware({
    config: {
      appUrl: process.env.QELOS_APP_URL!, // e.g. https://your-qelos-instance.com
    },
  }),
);
```

The middleware:

1. Reads the access token from `Authorization: Bearer …` or the
   `q_access_token` cookie, and the refresh token from `q_refresh_token`.
2. Builds a per-request `QelosSDK` instance bound to those tokens.
3. Calls `sdk.authentication.getLoggedInUser()` and
   `sdk.workspaces.getList()`.
4. Picks the active workspace (first by default — override with
   `resolveWorkspace`).
5. Attaches everything to `req.qelos` and calls `next()`.

### All configuration options

```ts
createQelosMiddleware({
  config: {
    appUrl: 'https://your-qelos-instance.com', // required

    // Service-to-service: use a static API token instead of cookies/refresh.
    apiToken: process.env.QELOS_API_TOKEN,

    // Cookie names. Defaults shown.
    accessTokenCookie: 'q_access_token',
    refreshTokenCookie: 'q_refresh_token',

    // Reject anonymous requests with 401. Defaults to false.
    requireAuth: false,

    // Skip the middleware entirely for these path prefixes.
    skipPaths: ['/health', '/metrics'],

    // Anything you want passed through to the per-request SDK.
    sdkOptions: {},
  },

  // Override workspace selection. Defaults to `workspaces[0]`.
  resolveWorkspace: ({ req, user, workspaces }) => {
    const headerId = req.headers['x-qelos-workspace'];
    return workspaces.find((w) => w._id === headerId) || workspaces[0] || null;
  },

  // Hook fired after a successful refresh. Defaults to writing the rotated
  // tokens back to cookies.
  onTokenRefresh: async ({ req, res, oldTokens, newTokens, sdk }) => {
    // ...
  },
});
```

## 3. Access user and workspace in your routes

Importing from `@qelos/integrator-express` augments `Express.Request` so
`req.qelos` is typed everywhere in your app:

```ts
interface QelosRequestContext {
  user: IUser | null;          // null for anonymous requests
  workspace: IWorkspace | null;
  workspaces: IWorkspace[];
  sdk: QelosSDK;               // bound to the current request's tokens
  tokens: QelosTokenPair;      // mutated in place when a refresh occurs
}
```

Read it directly in any handler mounted *after* the middleware:

```ts
app.get('/me', (req, res) => {
  res.json({
    user: req.qelos!.user,
    workspace: req.qelos!.workspace,
    workspaces: req.qelos!.workspaces,
  });
});
```

### Gating routes with `requireUser`

`requireUser` short-circuits with `401 { code: 'UNAUTHORIZED' }` when no user
is attached to the request:

```ts
import { requireUser } from '@qelos/integrator-express';

app.get(
  '/private',
  requireUser((req, res) => {
    // req.qelos.user is non-null inside the wrapped handler
    res.json(req.qelos!.user);
  }),
);
```

For app-wide enforcement, set `config.requireAuth: true` instead — the
middleware itself returns `401` before reaching your handlers.

## 4. Handle authentication

The integrator only **resolves** identity from existing tokens; it does not
host the login UI. There are three common patterns.

### Cookie-based session (recommended for browsers)

Most setups let users sign in directly against the Qelos backend (admin
panel, hosted login page, or a frontend that calls
`sdk.authentication.signin`). The Qelos backend sets `q_access_token` and
`q_refresh_token` cookies on the user's browser; from that point, any request
to your Express app carries those cookies and the integrator picks them up.

You can also drive the login from your own Express endpoint:

```ts
import QelosSDK from '@qelos/sdk';

app.post('/auth/login', express.json(), async (req, res) => {
  const sdk = new QelosSDK({ appUrl: process.env.QELOS_APP_URL! });
  const { payload, headers } = await sdk.authentication.signin({
    username: req.body.username,
    password: req.body.password,
  });
  // Forward the cookies set by Qelos so the browser stores the session.
  if (headers['set-cookie']) res.setHeader('set-cookie', headers['set-cookie']);
  res.json({ user: payload.user });
});
```

### Social login

The SDK exposes redirect URLs for every configured provider:

```ts
app.get('/auth/google', (req, res) => {
  const url = req.qelos!.sdk.authentication.getSocialLoginUrl('google', {
    returnUrl: 'https://your-app.com/dashboard',
  });
  res.redirect(url);
});
```

Qelos handles the OAuth handshake and redirects back to your app with a
short-lived refresh token in the URL. Exchange it server-side via
`exchangeAuthCallback` to set the cookie session:

```ts
app.get('/auth/callback', async (req, res) => {
  const sdk = new QelosSDK({ appUrl: process.env.QELOS_APP_URL! });
  const { headers } = await sdk.authentication.exchangeAuthCallback(
    String(req.query.rt),
  );
  if (headers['set-cookie']) res.setHeader('set-cookie', headers['set-cookie']);
  res.redirect('/');
});
```

### Token refresh

When the access token is rejected the SDK transparently retries with the
refresh token. After a successful refresh, the middleware fires the
`onTokenRefresh` hook. The default implementation writes the new pair back to
cookies (`HttpOnly`, `SameSite=Lax`, `Secure` whenever `appUrl` is `https://…`).

Override the hook to use your own session store:

```ts
app.use(
  createQelosMiddleware({
    config: { appUrl: process.env.QELOS_APP_URL! },
    onTokenRefresh: async ({ req, res, newTokens }) => {
      await sessionStore.rotate(req.sessionID, newTokens);
    },
  }),
);
```

The hook receives `{ req, res, oldTokens, newTokens, sdk }`. Throwing aborts
the in-flight request.

### Service-to-service (no end user)

Set `config.apiToken` to skip cookies and refresh entirely. Every request
authenticates as the API token's owner:

```ts
app.use(
  createQelosMiddleware({
    config: {
      appUrl: process.env.QELOS_APP_URL!,
      apiToken: process.env.QELOS_API_TOKEN!,
    },
  }),
);
```

## 5. Query entities

The SDK on `req.qelos.sdk` is already authenticated as the current user, so
permissions are enforced for free:

```ts
app.get(
  '/products',
  requireUser(async (req, res) => {
    const products = await req.qelos!.sdk
      .entities('products')
      .getList({ status: 'active' });
    res.json(products);
  }),
);

app.post(
  '/products',
  express.json(),
  requireUser(async (req, res) => {
    const created = await req.qelos!.sdk.entities('products').create(req.body);
    res.status(201).json(created);
  }),
);
```

The same pattern works for any blueprint — `sdk.entities('<identifier>')`
returns CRUD methods (`getList`, `create`, `update`, `remove`). See the
[Blueprints Operations reference](../sdk/blueprints_operations.md) for the
full surface.

For background jobs, scripts, and anything outside a request, build a
service-token SDK:

```ts
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: process.env.QELOS_APP_URL!,
  apiToken: process.env.QELOS_API_TOKEN!,
});
```

## 6. Common patterns and gotchas

- **The integrator package is for external apps only.** Apps inside the
  Qelos monorepo MUST NOT depend on `@qelos/integrator-*` — they talk to the
  gateway directly.
- **`req.qelos` is optional in the type signature.** It will be `undefined`
  on routes matched by `skipPaths`, and TypeScript will not let you forget
  it. Use `req.qelos!` only after a `createQelosMiddleware` mount or
  `requireUser` wrapper.
- **Anonymous requests don't throw by default.** `req.qelos.user` and
  `req.qelos.workspace` will simply be `null`. Switch to
  `config.requireAuth: true` or per-route `requireUser` when you want a
  hard `401`.
- **Mount the middleware once, near the top of the chain.** The integrator
  needs to run before any handler that reads `req.qelos`. Use `skipPaths`
  for endpoints that should bypass identity resolution (`/health`,
  `/metrics`).
- **Workspace selection defaults to the first workspace.** If your users
  belong to multiple workspaces, supply `resolveWorkspace` — typically
  reading an `x-qelos-workspace` header or a cookie. The integrator does
  not read the active workspace from user metadata for you.
- **Cookies are written via `res.cookie` when available.** If you use
  `cookie-parser` or another cookie middleware, your cookie options
  (signing, domain, etc.) keep working transparently.
- **`Secure` is set automatically based on `appUrl`.** In local development
  with an `http://` `appUrl`, cookies are written without `Secure` so
  browsers accept them. Production HTTPS instances get `Secure` for free.
- **Don't reuse the per-request SDK across requests.** It is bound to a
  specific token pair. Use `req.qelos.sdk` inside a handler; build a
  fresh SDK with `apiToken` for cron jobs or workers.
- **`req.qelos.tokens` mutates in place** after a refresh, so any code that
  reads it later in the chain sees the rotated pair.
