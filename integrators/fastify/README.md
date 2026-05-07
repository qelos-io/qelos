# @qelos/integrator-fastify

Fastify plugin that calls the Qelos SDK to identify the current user and
their active workspace before your route handler runs, exposing them on
`request.qelos.user` / `request.qelos.workspace`.

This is the Fastify implementation of the Qelos integrator contract — the same
shape exposed by `@qelos/integrator-express`, `@qelos/integrator-nuxt`,
`@qelos/plugin-netlify-api`, etc.

## Install

```sh
npm install @qelos/integrator-fastify @qelos/sdk
# fastify is a peer dependency
npm install fastify
```

## Quick start

```ts
import Fastify from 'fastify';
import qelosFastify, { requireUser } from '@qelos/integrator-fastify';

const app = Fastify();

await app.register(qelosFastify, {
  config: {
    appUrl: process.env.QELOS_APP_URL!, // e.g. https://yourdomain.com
  },
});

app.get('/me', async (request) => {
  // user/workspace are null when the request is anonymous
  return {
    user: request.qelos!.user,
    workspace: request.qelos!.workspace,
  };
});

// Short-circuit with 401 when there is no authenticated user:
app.get(
  '/private',
  { preHandler: requireUser },
  async (request) => request.qelos!.user,
);
```

## What the plugin does

1. Reads the access token from `Authorization: Bearer ...` or the
   `q_access_token` cookie, and the refresh token from `q_refresh_token`.
2. Builds a per-request Qelos SDK instance bound to those tokens.
3. Calls `sdk.authentication.getLoggedInUser()` and
   `sdk.workspaces.getList()`.
4. Picks the active workspace (first by default — override with
   `resolveWorkspace`).
5. Attaches everything to `request.qelos`.

The plugin never throws for anonymous requests by default — it just leaves
`request.qelos.user` and `request.qelos.workspace` as `null`. Pass
`requireAuth: true` to short-circuit anonymous requests with `401`.

## Token refresh

When the access token is rejected, the SDK tries to recover, in order:

1. The **refresh token** (`q_refresh_token`) via
   `sdk.authentication.refreshToken()` — issues a new access + refresh pair.
2. The **cookie token** (the access token cookie itself) via
   `sdk.authentication.refreshCookieToken()` — used for cookie-only sessions
   that do not carry a separate refresh token (e.g. social-auth flows).

After a successful refresh the plugin fires the `onTokenRefresh` hook. The
default implementation writes the new tokens back to the response cookies
(`HttpOnly`, `SameSite=Lax`, `Secure` whenever `appUrl` is `https://...`).

You can supply your own — for example, to mint your own session cookie or push
the new tokens into a session store:

```ts
await app.register(qelosFastify, {
  config: { appUrl: process.env.QELOS_APP_URL! },
  onTokenRefresh: async ({ request, reply, newTokens }) => {
    await sessionStore.rotate(request.session.id, newTokens);
  },
});
```

The hook receives `{ request, reply, oldTokens, newTokens, sdk }`. Throwing
aborts the in-flight request.

### Manual cookie refresh

Long-lived integrator-hosted sessions can also call the SDK directly to
proactively refresh the cookie token:

```ts
const result = await request.qelos!.sdk.authentication.refreshCookieToken();
// result.headers['set-cookie'] — fresh cookie value to forward
// result.payload.user        — refreshed user
```

## Configuration

```ts
await app.register(qelosFastify, {
  config: {
    appUrl: 'https://yourdomain.com', // required

    // Service-to-service: use a static API token instead of cookies/refresh.
    apiToken: process.env.QELOS_API_TOKEN,

    // Cookie names. Defaults shown.
    accessTokenCookie: 'q_access_token',
    refreshTokenCookie: 'q_refresh_token',

    // Reject anonymous requests with 401. Defaults to false.
    requireAuth: false,

    // Skip the plugin entirely for these path prefixes.
    skipPaths: ['/health', '/metrics'],

    // Anything you want passed through to the per-request SDK.
    sdkOptions: {},
  },

  // Override workspace selection. Defaults to `workspaces[0]`.
  resolveWorkspace: ({ request, user, workspaces }) => {
    const headerId = request.headers['x-qelos-workspace'];
    return workspaces.find((w) => w._id === headerId) || workspaces[0] || null;
  },
});
```

## TypeScript

Importing from `@qelos/integrator-fastify` augments `FastifyRequest` so
`request.qelos` is typed everywhere in your app. The shape is:

```ts
interface QelosRequestContext {
  user: IUser | null;
  workspace: IWorkspace | null;
  workspaces: IWorkspace[];
  sdk: QelosSDK;          // bound to the current request's tokens
  tokens: QelosTokenPair; // mutated in place when a refresh occurs
}
```

## Requirements

- Node.js >= 18 (uses the global `fetch`).
- Fastify 4 or 5.
