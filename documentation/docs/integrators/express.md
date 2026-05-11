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

Typical setup uses `createQelosIntegrator`, which registers user-resolution
middleware and a catch-all `/api/**` reverse proxy (unless `disableProxy` is
set). Mount **your** `/api` routes before the proxy so they stay authoritative.

```ts
// app.ts
import express from 'express';
import { createQelosIntegrator } from '@qelos/integrator-express';

const app = express();

const qelos = createQelosIntegrator({
  config: {
    appUrl: process.env.QELOS_APP_URL!, // e.g. https://your-qelos-instance.com
  },
});

app.use(qelos.middleware);

app.get('/me', (req, res) => {
  res.json({ user: req.qelos.user, workspace: req.qelos.workspace });
});

if (qelos.proxy) {
  app.use('/api', qelos.proxy);
}
```

Lower-level `createQelosMiddleware` and `createQelosProxy` are exported if you
prefer to wire each piece yourself.

The middleware:

1. Resolves the managed Qelos origin (same rules as the `/api/**` proxy).
2. Calls `fetch` on `{upstream}/api/me` with inbound `Cookie` and
   `Authorization` forwarded.
3. Forwards upstream `Set-Cookie` from that response with `Domain=` rewritten
   to the inbound host.
4. Sets `req.qelos.user` from the JSON body on success; loads `workspaces`
   via `sdk.workspaces.getList()`.
5. Sets `workspace` from `user.workspace` or from `resolveWorkspace` —
   **not** from `workspaces[0]`.

### All configuration options

```ts
createQelosIntegrator({
  config: {
    appUrl: 'https://your-qelos-instance.com', // required

    apiToken: process.env.QELOS_API_TOKEN,

    requireAuth: false,

    skipPaths: ['/health', '/metrics'],

    disableProxy: false,

    sdkOptions: {},
  },

  resolveWorkspace: ({ req, user, workspaces }) => {
    const headerId = req.headers['x-qelos-workspace'];
    return (
      workspaces.find((w) => w._id === headerId) ||
      user.workspace ||
      null
    );
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
  sdk: QelosSDK;               // forwards Cookie / Authorization per call
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

### Cookies and SDK calls

Rotated session cookies from Qelos reach the browser via `Set-Cookie` on the
`/api/me` probe and on responses from SDK calls your handlers make. The
request-scoped `req.qelos.sdk` uses `extraHeaders` so each call sees the
current `Cookie` / `Authorization` values for that request.

For `refreshCookieToken()` and other explicit refresh APIs, see
[Cookie Token Lifecycle](../auth/cookie-tokens.md).

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
- **`req.qelos` is omitted when `skipPaths` matches.** On skipped routes the
  middleware does not attach context; use optional chaining or gate routes.
- **Anonymous requests don't throw by default.** `req.qelos.user` and
  `req.qelos.workspace` will simply be `null`. Switch to
  `config.requireAuth: true` or per-route `requireUser` when you want a
  hard `401`.
- **Mount user-resolution middleware before handlers that read `req.qelos`.**
  Use `skipPaths` for `/health`, `/metrics`, etc.
- **Active workspace comes from `/api/me`’s `user.workspace`, not
  `workspaces[0]`.** Supply `resolveWorkspace` when you need another rule.
- **Don't reuse the per-request SDK across requests.** Use `req.qelos.sdk`
  inside a handler; build a fresh SDK with `apiToken` for cron jobs or workers.
