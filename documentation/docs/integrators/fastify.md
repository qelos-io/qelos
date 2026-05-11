---
title: Fastify Integrator
editLink: true
---

# `@qelos/integrator-fastify`

Fastify plugin that resolves the current Qelos user, active workspace, and
a per-request SDK client *before* your route handler runs, and exposes them
on `request.qelos`.

This is the Fastify implementation of the Qelos integrator contract — the
same shape exposed by `@qelos/integrator-express`,
`@qelos/integrator-nest`, `@qelos/integrator-next`,
`@qelos/integrator-nuxt`, and the FastAPI integrator.

If you are new to Qelos, read
[Getting Started as an Integrator](../getting-started/integrators.md) first
for the overall flow (CLI, blueprints, deployment).

## 1. Install

```bash
npm install @qelos/integrator-fastify @qelos/sdk
# fastify is a peer dependency
npm install fastify
```

Requirements:

- **Node.js ≥ 18** (the integrator uses the global `fetch`).
- **Fastify 4 or 5.**

## 2. Configure the plugin

```ts
// server.ts
import Fastify from 'fastify';
import qelosFastify from '@qelos/integrator-fastify';

const app = Fastify();

await app.register(qelosFastify, {
  config: {
    appUrl: process.env.QELOS_APP_URL!, // e.g. https://your-qelos-instance.com
  },
});
```

The plugin runs as a `preHandler` hook and:

1. Resolves the managed Qelos origin (same rules as the bundled `/api/**`
   proxy).
2. Calls `GET {upstream}/api/me` with inbound `Cookie` and `Authorization`
   forwarded.
3. Rewrites upstream `Set-Cookie` `Domain=` to the inbound host.
4. Sets `user` from JSON on success; loads `workspaces` via
   `sdk.workspaces.getList()`.
5. Sets `workspace` from `user.workspace` or `resolveWorkspace` — **not**
   from `workspaces[0]`.

When `disableProxy` is not `true`, the plugin also registers a catch-all
`/api/*` proxy (see package README).

### All configuration options

```ts
await app.register(qelosFastify, {
  config: {
    appUrl: 'https://your-qelos-instance.com', // required

    apiToken: process.env.QELOS_API_TOKEN,

    requireAuth: false,

    skipPaths: ['/health', '/metrics'],

    disableProxy: false,

    sdkOptions: {},
  },

  resolveWorkspace: ({ request, user, workspaces }) => {
    const headerId = request.headers['x-qelos-workspace'];
    return (
      workspaces.find((w) => w._id === headerId) ||
      user.workspace ||
      null
    );
  },
});
```

## 3. Access user and workspace in your routes

Importing from `@qelos/integrator-fastify` augments `FastifyRequest` so
`request.qelos` is typed everywhere in your app:

```ts
interface QelosRequestContext {
  user: IUser | null;          // null for anonymous requests
  workspace: IWorkspace | null;
  workspaces: IWorkspace[];
  sdk: QelosSDK;               // forwards Cookie / Authorization per call
}
```

Read it in any handler:

```ts
app.get('/me', async (request) => ({
  user: request.qelos!.user,
  workspace: request.qelos!.workspace,
  workspaces: request.qelos!.workspaces,
}));
```

### Gating routes with `requireUser`

`requireUser` is a `preHandler` hook that short-circuits with
`401 { code: 'UNAUTHORIZED' }` when no user is attached:

```ts
import { requireUser } from '@qelos/integrator-fastify';

app.get(
  '/private',
  { preHandler: requireUser },
  async (request) => request.qelos!.user,
);
```

For app-wide enforcement, set `config.requireAuth: true` instead.

## 4. Handle authentication

The integrator only **resolves** identity from existing tokens; it does not
host the login UI.

### Cookie-based session (recommended for browsers)

Most flows let users sign in directly against the Qelos backend (admin
panel, hosted login page, or a frontend that calls
`sdk.authentication.signin`). Qelos sets `q_access_token` and
`q_refresh_token` cookies on the user's browser; the plugin picks them up
on subsequent requests.

You can also drive the login from a Fastify route:

```ts
import QelosSDK from '@qelos/sdk';

app.post('/auth/login', async (request, reply) => {
  const sdk = new QelosSDK({ appUrl: process.env.QELOS_APP_URL! });
  const { payload, headers } = await sdk.authentication.signin(
    request.body as { username: string; password: string },
  );
  if (headers['set-cookie']) reply.header('set-cookie', headers['set-cookie']);
  return { user: payload.user };
});
```

### Social login

```ts
app.get('/auth/google', async (_request, reply) => {
  const sdk = new QelosSDK({ appUrl: process.env.QELOS_APP_URL! });
  return reply.redirect(
    sdk.authentication.getSocialLoginUrl('google', {
      returnUrl: 'https://your-app.com/dashboard',
    }),
  );
});

app.get('/auth/callback', async (request, reply) => {
  const sdk = new QelosSDK({ appUrl: process.env.QELOS_APP_URL! });
  const { headers } = await sdk.authentication.exchangeAuthCallback(
    String((request.query as Record<string, string>).rt),
  );
  if (headers['set-cookie']) reply.header('set-cookie', headers['set-cookie']);
  return reply.redirect('/');
});
```

### Cookies and SDK calls

Rotations from Qelos arrive as `Set-Cookie` on the `/api/me` probe and on SDK
responses. The request-scoped SDK forwards cookies on each call.

See [Cookie Token Lifecycle](../auth/cookie-tokens.md).

### Service-to-service (no end user)

Set `config.apiToken` to skip cookies and refresh entirely:

```ts
await app.register(qelosFastify, {
  config: {
    appUrl: process.env.QELOS_APP_URL!,
    apiToken: process.env.QELOS_API_TOKEN!,
  },
});
```

## 5. Query entities

The SDK on `request.qelos.sdk` is already authenticated as the current
user, so blueprint permissions are enforced for free:

```ts
app.get(
  '/products',
  { preHandler: requireUser },
  async (request) => request.qelos!.sdk.entities('products').getList({ status: 'active' }),
);

app.post(
  '/products',
  { preHandler: requireUser },
  async (request, reply) => {
    const created = await request.qelos!.sdk.entities('products').create(request.body as any);
    reply.code(201);
    return created;
  },
);
```

The full surface — `getList`, `create`, `update`, `remove`, etc. — is in
the [Blueprints Operations reference](../sdk/blueprints_operations.md).

## 6. Common patterns and gotchas

- **The integrator package is for external apps only.** Apps inside the
  Qelos monorepo MUST NOT depend on `@qelos/integrator-*` — they talk to
  the gateway directly.
- **`fastify-plugin` encapsulation is disabled.** The plugin is wrapped
  with `fastify-plugin`, so registering it once at the root applies to
  every route. To scope it, register it inside an `await
  app.register(async (instance) => { … })` boundary.
- **`request.qelos` is optional in the type signature.** It will be
  `undefined` on routes matched by `skipPaths`. Use `request.qelos!` only
  inside routes covered by the plugin.
- **Anonymous requests don't throw by default.** `request.qelos.user` and
  `request.qelos.workspace` will simply be `null`. Switch to
  `config.requireAuth: true` or per-route `{ preHandler: requireUser }`
  when you want a hard `401`.
- **Cookies:** upstream `Set-Cookie` from `/api/me` and from proxied `/api/**`
  responses are forwarded with `Domain=` rewritten to your host.
- **`Secure` cookies:** the proxy does not strip `Secure` — configure Qelos /
  TLS for local HTTP if browsers drop cookies.
- **Active workspace comes from `/api/me`’s `user.workspace`, not
  `workspaces[0]`.** Supply `resolveWorkspace` when you need another rule.
- **Don't reuse the per-request SDK across requests.** Build a fresh SDK with
  `apiToken` for cron jobs or workers.
