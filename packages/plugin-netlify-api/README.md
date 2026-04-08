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

By default the plugin uses **Netlify’s CDN rewrite** to your Qelos API (same pattern as [Netlify’s proxy docs](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/#proxy-to-another-service)):

- `/api/*` → `${QELOS_API_IP origin}/api/:splat` with status `200` and `force`

So `/api/me` is proxied to `http://your-api-host/api/me` **at the edge**, without a serverless function. That avoids fragile `/.netlify/functions/...` rewrites and matches Nuxt’s `_redirects` behavior.

Optional: **`use_function_proxy = true`** — uses the bundled `qelos-api-proxy` serverless function instead (for cases where you must run Node logic on each request).

Optional plugin inputs:

```toml
[[plugins]]
  package = "@qelos/plugin-netlify-api"

  [plugins.inputs]
    api_url = "http://159.203.152.168"
    bypass_admin = true
    use_function_proxy = false
```

- **api_url** — Qelos API base URL (same as `QELOS_API_IP` / `API_HOST`).
- **bypass_admin** — If `true`, adds header `x-bypass-admin: true` on proxied requests (CDN and function modes).
- **use_function_proxy** — If `true`, deploy the bundled `qelos-api-proxy` function and rewrite to it instead of the CDN proxy.

## What it does

- **Environment:** Sets `QELOS_API_IP`, `QELOS_NETLIFY_PROXY_MODE` (`cdn` or `function`).
- **Redirects:** Injects the `/api/*` rewrite into `netlify.toml` (and **`postbuild`** rewrites `publish/_redirects` so Nuxt’s catch‑all does not win).
- **Function mode only:** Copies `qelos-api-proxy.ts` into your Netlify functions directory.

No need to commit redirects yourself; the plugin and `postbuild` maintain them each build.
