# @qelos/integrator-express

Express integrator for [Qelos](https://qelos.io). It plugs into an Express app
to make the Node host act as a same-origin BFF for a managed Qelos app:
requests under `/api/**` are proxied to Qelos, and every other request resolves
the current user up front so your route handlers can use `req.qelos.user` /
`req.qelos.workspace` / `req.qelos.workspaces` / `req.qelos.sdk` directly.

## Install

```sh
npm install @qelos/integrator-express @qelos/sdk
# express is a peer dependency
npm install express
```

> Requires Node 18+ — the middleware uses
> [`Response.headers.getSetCookie()`](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie)
> to pipe individual upstream `Set-Cookie` headers back to the client.

## Quick start

```ts
import express from 'express';
import { createQelosIntegrator } from '@qelos/integrator-express';

const app = express();

const qelos = createQelosIntegrator({
  config: {
    appUrl: process.env.QELOS_APP_URL!, // e.g. https://yourdomain.com
  },
});

// User-resolution middleware. Runs on every non-`/api/` request.
app.use(qelos.middleware);

// User-defined routes still take precedence — mount them BEFORE the proxy.
app.get('/me', (req, res) => {
  res.json({ user: req.qelos.user, workspace: req.qelos.workspace });
});

// Catch-all reverse proxy for `/api/**`. Mount it AFTER your own routes.
if (qelos.proxy) {
  app.use('/api', qelos.proxy);
}

app.listen(3000);
```

If you'd rather wire the middleware and proxy manually, the lower-level
`createQelosMiddleware` and `createQelosProxy` factories are exported too.

## API proxy

When the integrator is built with `disableProxy !== true`, `createQelosProxy`
returns an Express `RequestHandler` that transparently proxies any `/api/**`
request the consuming app does not handle itself to the configured Qelos
managed-app origin. This lets the Express app act as a same-origin BFF:
`@qelos/sdk` calls from the browser, server, or the Qelos web SDK can all hit
`/api/...` on the Express host and reach Qelos without CORS or cross-site
cookie pain.

User-defined routes still take precedence — mount the proxy after the rest of
your `/api/*` routes so it only catches requests no other handler matched.

### Cookie domain rewrite

The proxy forwards the incoming `Cookie` header as-is (the Qelos session
cookie name is treated as opaque) and forwards upstream `Set-Cookie` headers
back to the client, rewriting the `Domain=` attribute on every upstream
cookie to the inbound request's own host. That way the session cookie set by
Qelos is valid on the Express app's domain regardless of which host Qelos
issues cookies from.

### Resolving the proxy target

The managed Qelos app URL (`config.appUrl`) is the proxy target. Env vars are
only dev-time overrides for when the configured `appUrl` isn't reachable from
the local host:

1. `QELOS_PROXY_TARGET` env var.
2. `QELOS_IP` env var (dev fallback).
3. `QELOS_API_IP` env var (dev fallback).
4. `config.appUrl`.

If none of these are set, the proxy handler responds with `503` so
misconfiguration fails loudly.

### Opting out

Set `disableProxy: true` on the config to skip registration of the proxy
handler — useful when the Express app implements every `/api/*` route itself
or terminates the proxy elsewhere (CDN, reverse proxy, etc.). When the proxy
is disabled, `qelos.proxy` is `null` and `/api/` is **not** auto-added to
`skipPaths`, so you remain in control of every request.

WebSocket upgrades are not proxied; route them explicitly if needed.

## Middleware

On every non-`/api/` request, the server middleware identifies the current
user by calling the managed Qelos app directly:

1. Resolve the upstream origin the same way the `/api/**` proxy does
   (`QELOS_PROXY_TARGET` → `QELOS_IP` → `QELOS_API_IP` → `config.appUrl`).
2. Issue `fetch('${upstream}/api/me')` with the incoming request's `Cookie`
   header forwarded verbatim — the Qelos session cookie name is opaque to
   the integrator, so the whole header is piped through unchanged. Any
   incoming `Authorization` header is forwarded too.
3. For every `Set-Cookie` header on the upstream response, rewrite the
   `Domain=` attribute to the inbound request's `Host` (port stripped) and
   append it to the outgoing response. This is how session rotations from
   Qelos reach the browser when the managed app and the Express host live on
   different origins.
4. On `2xx`, parse the JSON body and expose it as `req.qelos.user`. On any
   other status (or a network error), leave `user = null` — and respond with
   `401` if `requireAuth` is set.

The middleware is independent from the `/api/**` proxy: the proxy handles
forwarding of API calls themselves, while the middleware identifies the user
on every page/non-API request before your route handlers run. To avoid
double-hitting Qelos for `/api/me` (once for proxying, once for user
resolution), `createQelosIntegrator` adds `/api/` to `skipPaths` automatically
when the proxy is enabled.

> The middleware does not attempt to strip the `Secure` attribute from
> rotated cookies. In local dev over plain HTTP, browsers will drop `Secure`
> cookies — configure the managed Qelos app to issue non-`Secure` cookies in
> that environment, or run the Express host over HTTPS.

## Use in route handlers

`req.qelos` is augmented onto the Express `Request` type and gives you a typed
`QelosRequestContext`:

| field        | description                                                       |
|--------------|-------------------------------------------------------------------|
| `user`       | The `IUser` body returned by `/api/me`, or `null` when anonymous. |
| `workspace`  | The active `IWorkspace` for the request, or `null`.               |
| `workspaces` | All workspaces the user has access to.                            |
| `sdk`        | A request-scoped `QelosSDK` instance bound to the live cookies.   |

```ts
app.get('/products', requireUser(async (req, res) => {
  const products = await req.qelos.sdk.entities('products').getList();
  res.json(products);
}));
```

The `sdk` reads cookies from the current request on every call, so any
session rotation piped through by the middleware is picked up automatically
by subsequent SDK requests in the same handler.

Use `requireUser` to short-circuit unauthenticated requests with `401`:

```ts
import { requireUser } from '@qelos/integrator-express';

app.get('/private', requireUser((req, res) => res.json(req.qelos.user)));
```

## Workspace resolution

`req.qelos.workspace` defaults to whatever the managed Qelos app reports on
`user.workspace` from `/api/me`. That field is non-null only when the user
has already activated a workspace on the Qelos side; when it is `null`, the
frontend is expected to prompt the user to either activate an existing
workspace or create a new one. The middleware deliberately does **not**
auto-pick `workspaces[0]` — that would silently put the user into the wrong
workspace.

To override the default (e.g. force a particular workspace per request),
pass a `resolveWorkspace` callback:

```ts
import { createQelosIntegrator } from '@qelos/integrator-express';

const qelos = createQelosIntegrator({
  config: { appUrl: process.env.QELOS_APP_URL! },
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

## API token mode

For service-to-service deployments where every request shares one Qelos API
token, set `apiToken` and the middleware will skip the cookie flow entirely
and build an SDK that authenticates with the static token:

```ts
createQelosIntegrator({
  config: {
    appUrl: process.env.QELOS_APP_URL!,
    apiToken: process.env.QELOS_API_TOKEN,
  },
});
```

## Requirements

- Node.js >= 18 (uses global `fetch` and `Headers.getSetCookie`).
- Express 4 or 5.
