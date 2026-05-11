# @qelos/integrator-fastify

Fastify integrator for [Qelos](https://qelos.io). It plugs into a Fastify app
to make the Node host act as a same-origin BFF for a managed Qelos app:
requests under `/api/**` are proxied to Qelos, and every other request resolves
the current user up front so your route handlers can use `request.qelos.user` /
`request.qelos.workspace` / `request.qelos.workspaces` / `request.qelos.sdk`
directly.

## Install

```sh
npm install @qelos/integrator-fastify @qelos/sdk
# fastify is a peer dependency
npm install fastify
```

> Requires Node 18+ — the plugin uses
> [`Response.headers.getSetCookie()`](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie)
> to pipe individual upstream `Set-Cookie` headers back to the client.

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

// User-defined routes still take precedence — register them BEFORE listening,
// they win over the wildcard `/api/*` proxy in Fastify's radix-tree router.
app.get('/me', async (request) => ({
  user: request.qelos.user,
  workspace: request.qelos.workspace,
}));

// Short-circuit anonymous requests with 401:
app.get(
  '/private',
  { preHandler: requireUser },
  async (request) => request.qelos.user,
);

await app.listen({ port: 3000 });
```

## API proxy

When the plugin is registered with `disableProxy !== true`, it installs a
catch-all `/api/*` route that transparently proxies any `/api/**` request the
consuming app does not handle itself to the configured Qelos managed-app
origin. This lets the Fastify app act as a same-origin BFF: `@qelos/sdk` calls
from the browser, server, or the Qelos web SDK can all hit `/api/...` on the
Fastify host and reach Qelos without CORS or cross-site cookie pain.

User-defined routes still take precedence — Fastify's radix-tree router
matches more specific routes (`/api/users`) before the wildcard (`/api/*`), so
the proxy only catches requests no other handler matched.

### Cookie domain rewrite

The proxy forwards the incoming `Cookie` header as-is (the Qelos session
cookie name is treated as opaque) and forwards upstream `Set-Cookie` headers
back to the client, rewriting the `Domain=` attribute on every upstream
cookie to the inbound request's own host. That way the session cookie set by
Qelos is valid on the Fastify app's domain regardless of which host Qelos
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
route — useful when the Fastify app implements every `/api/*` route itself or
terminates the proxy elsewhere (CDN, reverse proxy, etc.). When the proxy is
disabled, `/api/` is **not** auto-added to `skipPaths`, so the user-resolution
preHandler runs on `/api/*` routes you handle yourself.

WebSocket upgrades are not proxied; route them explicitly if needed.

## Plugin behavior

On every non-`/api/` request, the plugin's `preHandler` hook identifies the
current user by calling the managed Qelos app directly:

1. Resolve the upstream origin the same way the `/api/**` proxy does
   (`QELOS_PROXY_TARGET` → `QELOS_IP` → `QELOS_API_IP` → `config.appUrl`).
2. Issue `fetch('${upstream}/api/me')` with the incoming request's `Cookie`
   header forwarded verbatim — the Qelos session cookie name is opaque to
   the integrator, so the whole header is piped through unchanged. Any
   incoming `Authorization` header is forwarded too.
3. For every `Set-Cookie` header on the upstream response, rewrite the
   `Domain=` attribute to the inbound request's `Host` (port stripped) and
   append it to the outgoing response. This is how session rotations from
   Qelos reach the browser when the managed app and the Fastify host live on
   different origins.
4. On `2xx`, parse the JSON body and expose it as `request.qelos.user`. On any
   other status (or a network error), leave `user = null` — and respond with
   `401` if `requireAuth` is set.

The preHandler is independent from the `/api/**` proxy: the proxy handles
forwarding of API calls themselves, while the preHandler identifies the user
on every page/non-API request before your route handlers run. To avoid
double-hitting Qelos for `/api/me` (once for proxying, once for user
resolution), the plugin adds `/api/` to `skipPaths` automatically when the
proxy is enabled.

> The plugin does not attempt to strip the `Secure` attribute from rotated
> cookies. In local dev over plain HTTP, browsers will drop `Secure` cookies
> — configure the managed Qelos app to issue non-`Secure` cookies in that
> environment, or run the Fastify host over HTTPS.

## Use in route handlers

`request.qelos` is augmented onto the Fastify `FastifyRequest` type and gives
you a typed `QelosRequestContext`:

| field        | description                                                       |
|--------------|-------------------------------------------------------------------|
| `user`       | The `IUser` body returned by `/api/me`, or `null` when anonymous. |
| `workspace`  | The active `IWorkspace` for the request, or `null`.               |
| `workspaces` | All workspaces the user has access to.                            |
| `sdk`        | A request-scoped `QelosSDK` instance bound to the live cookies.   |

```ts
app.get(
  '/products',
  { preHandler: requireUser },
  async (request) => request.qelos.sdk.entities('products').getList(),
);
```

The `sdk` reads cookies from the current request on every call, so any
session rotation piped through by the plugin is picked up automatically by
subsequent SDK requests in the same handler.

## Workspace resolution

`request.qelos.workspace` defaults to whatever the managed Qelos app reports
on `user.workspace` from `/api/me`. That field is non-null only when the user
has already activated a workspace on the Qelos side; when it is `null`, the
frontend is expected to prompt the user to either activate an existing
workspace or create a new one. The plugin deliberately does **not** auto-pick
`workspaces[0]` — that would silently put the user into the wrong workspace.

To override the default (e.g. force a particular workspace per request),
pass a `resolveWorkspace` callback:

```ts
await app.register(qelosFastify, {
  config: { appUrl: process.env.QELOS_APP_URL! },
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

## Configuration

```ts
await app.register(qelosFastify, {
  config: {
    appUrl: 'https://yourdomain.com', // required

    // Service-to-service: use a static API token instead of cookies.
    apiToken: process.env.QELOS_API_TOKEN,

    // Reject anonymous requests with 401. Defaults to false.
    requireAuth: false,

    // Skip the user-resolution preHandler for these path prefixes.
    skipPaths: ['/health', '/metrics'],

    // Skip registration of the catch-all `/api/*` reverse proxy route.
    // When true, `/api/` is also NOT auto-added to skipPaths.
    disableProxy: false,

    // Anything you want passed through to the per-request SDK.
    sdkOptions: {},
  },
});
```

`appUrl` may also be omitted from `config` and passed at the top level — both
of these shapes are accepted:

```ts
await app.register(qelosFastify, {
  appUrl: 'https://yourdomain.com',
  apiToken: process.env.QELOS_API_TOKEN,
});
```

## API token mode

For service-to-service deployments where every request shares one Qelos API
token, set `apiToken` and the plugin will skip the cookie flow entirely and
build an SDK that authenticates with the static token:

```ts
await app.register(qelosFastify, {
  config: {
    appUrl: process.env.QELOS_APP_URL!,
    apiToken: process.env.QELOS_API_TOKEN,
  },
});
```

## Requirements

- Node.js >= 18 (uses global `fetch` and `Headers.getSetCookie`).
- Fastify 4 or 5.
