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
