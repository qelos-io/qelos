# @qelos/plugin-netlify-api

Netlify build plugin for Qelos frontend apps: proxies `/api/*` to your Qelos API and injects config.

## Setup

In your site’s `netlify.toml`, add the plugin next to your existing `[build]` / `[build.environment]`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  QELOS_API_IP = "http://159.203.152.168"

[[plugins]]
  package = "@qelos/plugin-netlify-api"
```

**Nuxt / static frameworks (required):** Netlify evaluates `dist/_redirects` **before** `netlify.toml`. Nitro’s `netlify-static` preset emits a catch‑all `/*` rule, so the API rule must be **first** in `_redirects`. Add an npm **`postbuild`** script (runs after `nuxt build` when Netlify runs `npm run build`):

```json
{
  "scripts": {
    "build": "nuxt build",
    "postbuild": "qelos-netlify-patch-redirects"
  }
}
```

If your publish directory is not `dist`, set `QELOS_NETLIFY_PUBLISH` to that folder name (relative to the app root).

## How it proxies (default)

**Default:** the bundled serverless function **`qelos-api-proxy`** — `/api/*` is rewritten to `/.netlify/functions/qelos-api-proxy`. That runs your Node proxy (correct `Host` / `x-forwarded-host`, optional `x-bypass-admin`, etc.).

**Optional — CDN direct to API:** set **`use_cdn_proxy = true`** to rewrite `/api/*` → `${QELOS_API_IP}/api/:splat` at the edge **without** invoking the function (faster, but no per-request logic in `qelos-api-proxy.ts`).

```toml
[[plugins]]
  package = "@qelos/plugin-netlify-api"

  [plugins.inputs]
    api_url = "http://159.203.152.168"
    bypass_admin = true
    use_cdn_proxy = false
```

- **api_url** — Qelos API base URL (same as `QELOS_API_IP` / `API_HOST`).
- **bypass_admin** — If `true`, adds header `x-bypass-admin: true` (function mode: in the proxy; CDN mode: on the redirect when supported).
- **use_cdn_proxy** — If `true`, edge proxy only (no `qelos-api-proxy` function). Default **false**.
- **use_function_proxy** — Deprecated; set **`false`** to get the same as `use_cdn_proxy = true`.

## What it does

- **Environment:** Sets `QELOS_API_IP`, `QELOS_NETLIFY_PROXY_MODE` (`function` unless CDN).
- **Redirects:** Injects `/api/*` into `netlify.toml` and **`postbuild`** updates `publish/_redirects` so Nuxt’s catch‑all does not win.
- **Unless `use_cdn_proxy`:** copies `qelos-api-proxy.ts` into your Netlify functions directory.

No need to commit redirects yourself; the plugin and `postbuild` maintain them each build.

## Integrator API (`@qelos/plugin-netlify-api/integrators`)

This package implements the same **middleware contract** as other Qelos integrators (e.g. `@qelos/integrator-express`): each wrapped handler receives `event.qelos` shaped as **`QelosRequestContext`** — `QelosContext<QelosSDK, IUser, IWorkspace>` from `@qelos/global-types`, with:

| Field | Meaning |
| --- | --- |
| `user` | Authenticated user, or `null` |
| `workspace` | Active workspace, or `null` |
| `workspaces` | All workspaces for the user (from `sdk.workspaces.getList()`) |
| `sdk` | `@qelos/sdk` instance bound to this request’s tokens |
| `tokens` | `QelosTokenPair`; updated in place if a refresh runs |

Configuration follows **`QelosConfig`** / **`QelosNetlifyConfig`** (same base as Express): use **`appUrl`** as the Qelos backend base URL. For backward compatibility, **`apiHost`** is still accepted and normalized the same way as `QELOS_API_IP`.

Token refresh matches **`@qelos/integrator-express`**: the SDK may refresh access/refresh tokens; by default, refreshed cookies are collected as `Set-Cookie` header values and **merged into your function’s response** so the browser stays in sync. Override with **`onTokenRefresh`** (see `TokenRefreshContext` in the published types).

Peer dependency: **`@netlify/functions`** (declare handler types and install in the project that contains Netlify functions).

```bash
npm install @netlify/functions @qelos/sdk
```

```ts
// netlify/functions/whoami.ts
import {
  withQelos,
  requireUser,
  type QelosRequestContext,
} from '@qelos/plugin-netlify-api/integrators';

export const handler = withQelos(
  async (event) => {
    const q: QelosRequestContext = event.qelos!;
    const { user, workspace, workspaces, sdk, tokens } = q;
    return {
      statusCode: 200,
      body: JSON.stringify({ user, workspace, workspaces, tokenPair: tokens }),
    };
  },
  {
    appUrl: process.env.QELOS_API_IP!,
  },
);

export const handlerProtected = requireUser(
  async (event) => {
    return { statusCode: 200, body: JSON.stringify(event.qelos!.user) };
  },
  { appUrl: process.env.QELOS_API_IP! },
);
```

**`skipPaths`:** when the function path matches a prefix in `skipPaths`, the wrapper does **not** attach `event.qelos` (same idea as Express skipping middleware for `/health`, etc.).

Lower-level helpers:

```ts
import {
  identifyUser,
  createRequestSdk,
  readTokensFromEvent,
  normalizeIntegratorConfig,
} from '@qelos/plugin-netlify-api/integrators';

const identity = await identifyUser(event, { appUrl: 'https://api.example.com' });
// identity includes user, workspace, workspaces, sdk, tokens, refreshedCookies

const config = normalizeIntegratorConfig({ appUrl: 'https://api.example.com' });
const tokens = readTokensFromEvent(event, config);
```

### Package layout

The Netlify plugin stays under **`packages/plugin-netlify-api`** (historical location before the `integrators/*` convention). Types and behavior are aligned with **`@qelos/integrator-express`**; only the transport differs (Netlify `HandlerEvent` / response object vs Express `req` / `res`).
