---
title: Plugin Proxy Workflow
editLink: true
---
# Plugin Proxy Workflow

When a plugin is registered in Qelos, every request to `/{qelos_url}/api/{apiPath}/*` is **proxied** to the plugin's backend at `{proxyUrl}/*`. Qelos sits in front of the plugin and is responsible for:

1. Authenticating the **user** that called Qelos (bearer token, cookie token, API key, or no token at all).
2. Authenticating **itself** to the plugin using a `PLUGIN_TOKEN` — the credential that secures the Qelos ↔ plugin channel.
3. Rewriting the outgoing request so the plugin receives a stable, trusted shape: a known authentication header and a serialized user payload.

This page describes the end-to-end flow so plugin developers (and AI agents writing plugin code) know exactly what to expect on each side.

## High-Level Flow

```
┌────────────┐   /api/my-plugin/aaa       ┌────────────┐   /aaa                ┌────────────┐
│   Client   │ ─────────────────────────▶ │   Qelos    │ ─────────────────────▶│   Plugin   │
│ (browser / │  Authorization: Bearer …   │  Gateway + │  Authorization:       │  proxyUrl  │
│   server)  │  Cookie: qlt_…             │  Plugins   │     Bearer PLUGIN_…   │            │
└────────────┘  (or no auth)              │  Service   │  user: {"_id", …}     └────────────┘
                                          └────────────┘
```

The client never sees the `PLUGIN_TOKEN`, and the plugin never sees the user's bearer token or cookies. The two sides only share what Qelos lets them share.

## Step 1 — Client calls Qelos

The client calls Qelos at the proxied path:

```
GET https://{qelos_url}/api/my-plugin/aaa
Authorization: Bearer <user-access-token>   # optional
Cookie: qlt_…                                # optional
x-api-key: <api-token>                       # optional
```

Any (or none) of those credentials are accepted. The matching `apiPath` (`my-plugin`) is the first segment after `/api/`.

## Step 2 — Qelos resolves the tenant and the user

The gateway runs two pieces of middleware before the proxy fires:

- **Tenant resolution** — it picks `tenant` from the `tenant` header, or from the request host (via the content service's `host-tenant` lookup). Without a tenant the request is rejected with `400`. The original `host` is preserved in `tenanthost`.
- **User resolution** — if the request carries `Authorization`, `x-api-key`, or a `qlt_` cookie, the gateway calls the auth service's `/api/me` endpoint with those credentials. The returned user object is **Base64-encoded as JSON** and placed in the `user` header on the request that continues into the plugins service. If no credentials are provided, `user` is set to `''`.

The user payload that flows downstream looks like:

```jsonc
{
  "_id": "…",
  "email": "…",
  "roles": ["user", …],
  "workspace": {            // present when the request is workspace-scoped
    "_id": "…",
    "name": "…",
    "roles": ["…"]
  }
  // …plus any other fields returned by /api/me
}
```

See `apps/gateway/server/services/proxy-middleware/index.ts` for the gateway pipeline and `packages/api-kit/src/user-middlewares.ts` for the `populateUser` middleware that decodes the header inside the plugins service.

## Step 3 — Plugins service proxies to the plugin

The plugins service (`apps/plugins/server/routes/play-plugins.ts`) looks up the plugin by `(tenant, apiPath)`, fetches a valid `PLUGIN_TOKEN` (see [Step 4](#step-4-how-qelos-obtains-the-plugin-token)), and uses `http-proxy-middleware` to forward the request to `plugin.proxyUrl`.

When the request leaves Qelos, the headers are rewritten as follows:

| Header          | Value                                                                 |
|-----------------|-----------------------------------------------------------------------|
| `Authorization` | `Bearer <PLUGIN_TOKEN>` — always replaces any incoming token          |
| `user`          | `JSON.stringify(req.user)` — only set when a user was resolved        |
| `cookie`        | **removed** — the plugin never receives the user's Qelos cookies      |
| `tenant`        | the tenant id, set earlier by the gateway                             |
| `tenanthost`    | the original host the client called                                   |

The path is rewritten so that `GET /api/my-plugin/aaa?x=1` becomes `GET /aaa?x=1` on the plugin side (the `/api/<apiPath>` prefix is stripped).

> **Auth invariant.** The `Authorization` header between Qelos and the plugin is **always** the plugin's own token. The `user` header is the only thing that identifies the end user, and it is either a JSON-serialized user object set by Qelos or an empty value. The plugin should never trust an `Authorization` header as proof of who the user is.

### Reading the user inside a plugin

If you build your plugin with `@qelos/plugin-play`, the framework's `verifyAccessToken` pre-handler parses the `user` header for you and exposes `req.user`:

```typescript
// inside a fastify route in your plugin
fastify.get('/aaa', { preHandler: verifyAccessToken }, async (req) => {
  const user = req.user;          // null when no user was authenticated
  const tenant = req.tenantPayload; // decoded from Authorization (the PLUGIN_TOKEN)
  return { hello: user?.email ?? 'anonymous' };
});
```

In a custom (non `@qelos/plugin-play`) backend, just parse `JSON.parse(req.headers.user)` — Qelos sends plain JSON on this hop. The `user` header may also arrive Base64-encoded in some downstream paths; the safe pattern is:

```typescript
const raw = req.headers.user as string | undefined;
let user = null;
if (raw) {
  try {
    user = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    user = JSON.parse(raw);
  }
}
```

### Re-authentication on 401 / 407

If the plugin replies with `x-q-auth: unauthorized` or HTTP `407`, the plugins service **invalidates the cached `PLUGIN_TOKEN`** for that `(tenant, apiPath)`. The next request triggers a refresh (or, if refresh fails, a fresh registration — see Step 4).

## Step 4 — How Qelos obtains the PLUGIN_TOKEN

There are two ways for Qelos to obtain a `PLUGIN_TOKEN` for a plugin.

### Option A — Manually set a static token

When creating the plugin in Qelos (admin UI or `sdk.plugins.create()`), set the `token` field directly. Qelos will send `Authorization: Bearer <token>` on every proxied request. No refresh, no registration — the plugin is responsible for validating that token however it wants.

Use this for trusted internal services where you already manage credentials out of band.

### Option B — OAuth-style dynamic acquire (`authAcquire`)

For plugins that should mint short-lived tokens, configure `authAcquire` in the plugin manifest:

```jsonc
{
  "apiPath": "my-plugin",
  "appUrl":   "https://my-plugin.example.com",
  "proxyUrl": "https://my-plugin.example.com/api",
  "registerUrl": "/auth/register",
  "callbackUrl": "/auth/callback",
  "authAcquire": {
    "refreshTokenUrl": "/auth/refresh",
    "refreshTokenKey": "refresh_token",
    "accessTokenKey":  "access_token"
  }
}
```

With this in place, Qelos and the plugin mutually authenticate with the following exchange:

1. **Register** — Qelos creates a Qelos user with the `plugin` role and the username `{pluginId}.{tenant}@{host}`, generates a random password, and `POST`s to `registerUrl`:

   ```http
   POST {registerUrl}
   x-tenant: <tenant>
   x-from: qelos
   Content-Type: application/json

   { "username": "<pluginId>.<tenant>@<host>", "password": "<random>", "appUrl": "<qelos_url>" }
   ```

   The plugin must call back to **Qelos** using those credentials (e.g. `sdk.authentication.oAuthSignin({ username, password })`) to prove it can act as that user, then mint its own refresh/access token pair and reply:

   ```jsonc
   {
     "refresh_token": "<plugin-issued refresh JWT>",
     "access_token":  "<plugin-issued access JWT>"
   }
   ```

   The key names must match `authAcquire.refreshTokenKey` / `authAcquire.accessTokenKey`. Qelos stores the refresh token in the secrets service (`refresh-token-<tenant>-<apiPath>`) and caches the access token in memory (TTL ≈ 60s). After this, Qelos has a user *inside the plugin* and the plugin has a user *inside Qelos* — both sides can authenticate to each other via OAuth 2.0.

2. **Refresh** — when the cached access token expires, Qelos sends:

   ```http
   POST {authAcquire.refreshTokenUrl}
   x-tenant: <tenant>
   x-from: qelos
   Authorization: Bearer <refresh_token>
   ```

   The plugin must validate the refresh token and respond with a new `{ refresh_token, access_token }` pair using the same key names. The new refresh token replaces the stored secret.

3. **Fallback** — if the refresh call fails (e.g. the refresh token is missing or invalid), Qelos re-runs the register flow.

`@qelos/plugin-play` provides ready-made handlers for `registerUrl`, `refreshTokenUrl`, and `callbackUrl` (see `packages/plugin-play/src/authentication.ts`). You typically only configure the URLs in your manifest and let the framework do the rest.

### Which token is used at request time?

For each proxied request, the plugins service resolves the token in this order:

1. The in-memory cached **access token** (set by the most recent register/refresh).
2. The static `plugin.token` field, if it was manually configured.
3. Otherwise, run **refresh** using the stored refresh token.
4. If refresh fails, run **register** again.

The resolved value is what ends up in `Authorization: Bearer …` on the request to the plugin.

## Summary

- Auth on the **client → Qelos** hop is the user's auth (bearer / cookie / api-key / none). Qelos verifies it and produces a `user` header.
- Auth on the **Qelos → plugin** hop is **always** `Authorization: Bearer <PLUGIN_TOKEN>`. The plugin trusts Qelos, not the original client.
- The user identity flows through the `user` header, never through `Authorization`. Empty header = anonymous request.
- `PLUGIN_TOKEN` is either a static value you set on the plugin record, or an OAuth-style access token Qelos obtains and refreshes via the `authAcquire` configuration.
