# @qelos/integrator-express

Express middleware that calls the Qelos SDK to identify the current user and
their active workspace before your route handler runs, exposing them on
`req.qelos.user` / `req.qelos.workspace`.

This is the Express implementation of the Qelos integrator contract — the same
shape exposed by `@qelos/integrator-nuxt`, `@qelos/plugin-netlify-api`, etc.

## Install

```sh
npm install @qelos/integrator-express @qelos/sdk
# express is a peer dependency
npm install express
```

## Quick start

```ts
import express from 'express';
import { createQelosMiddleware, requireUser } from '@qelos/integrator-express';

const app = express();

app.use(
  createQelosMiddleware({
    config: {
      appUrl: process.env.QELOS_APP_URL!, // e.g. https://yourdomain.com
    },
  }),
);

app.get('/me', (req, res) => {
  // user/workspace are null when the request is anonymous
  res.json({
    user: req.qelos!.user,
    workspace: req.qelos!.workspace,
  });
});

// Short-circuit with 401 when there is no authenticated user:
app.get(
  '/private',
  requireUser((req, res) => {
    res.json(req.qelos!.user);
  }),
);
```

## What the middleware does

1. Reads the access token from `Authorization: Bearer ...` or the
   `q_access_token` cookie, and the refresh token from `q_refresh_token`.
2. Builds a per-request Qelos SDK instance bound to those tokens.
3. Calls `sdk.authentication.getLoggedInUser()` and
   `sdk.workspaces.getList()`.
4. Picks the active workspace (first by default — override with
   `resolveWorkspace`).
5. Attaches everything to `req.qelos` and calls `next()`.

The middleware never throws for anonymous requests by default — it just leaves
`req.qelos.user` and `req.qelos.workspace` as `null`. Pass `requireAuth: true`
to short-circuit anonymous requests with `401`.

## Token refresh

When the access token is rejected, the SDK tries to recover, in order:

1. The **refresh token** (`q_refresh_token`) via
   `sdk.authentication.refreshToken()` — issues a new access + refresh pair.
2. The **cookie token** (the access token cookie itself) via
   `sdk.authentication.refreshCookieToken()` — used for cookie-only sessions
   that do not carry a separate refresh token (e.g. social-auth flows).

After a successful refresh the middleware fires the `onTokenRefresh` hook.
The default implementation writes the new tokens back to the response cookies
(`HttpOnly`, `SameSite=Lax`, `Secure` whenever `appUrl` is `https://...`).

You can supply your own — for example, to mint your own session cookie or push
the new tokens into a session store:

```ts
app.use(
  createQelosMiddleware({
    config: { appUrl: process.env.QELOS_APP_URL! },
    onTokenRefresh: async ({ req, res, newTokens, oldTokens }) => {
      await sessionStore.rotate(req.sessionID, newTokens);
    },
  }),
);
```

The hook receives `{ req, res, oldTokens, newTokens, sdk }`. Throwing aborts
the in-flight request.

### Manual cookie refresh

Long-lived integrator-hosted sessions can also call the SDK directly to
proactively refresh the cookie token (e.g. before a navigation that hands the
session over to a downstream service):

```ts
const result = await req.qelos!.sdk.authentication.refreshCookieToken();
// result.headers['set-cookie'] — fresh cookie value to forward
// result.payload.user        — refreshed user
```

## Configuration

```ts
createQelosMiddleware({
  config: {
    appUrl: 'https://yourdomain.com', // required

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
});
```

## TypeScript

Importing from `@qelos/integrator-express` augments the Express `Request` type
(via `declare module 'express'` and `declare module 'express-serve-static-core'`)
so `req.qelos` is typed everywhere in your app. The shape is:

```ts
interface QelosRequestContext {
  user: IUser | null;
  workspace: IWorkspace | null;
  workspaces: IWorkspace[];
  sdk: QelosSDK;          // bound to the current request's tokens
  tokens: QelosTokenPair; // mutated in place when a refresh occurs
}
```

`req.qelos` is typed as non-optional. If you use `skipPaths`, the property is
unset for skipped requests — guard with `if (req.qelos) { ... }` in those routes.

## Requirements

- Node.js >= 18 (uses the global `fetch`).
- Express 4 or 5.
