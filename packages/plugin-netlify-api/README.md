# @qelos/plugin-netlify-api

Netlify build plugin for Qelos frontend apps: proxies `/api/*` to your Qelos API and injects config.

## Setup

In your site’s `netlify.toml`, add the plugin next to your existing `[build]` / `[build.environment]` (same idea as a manual `[functions]` + `[[redirects]]` + `api-proxy.ts`, but without checking in the function or redirect yourself):

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  # Used by the injected proxy at runtime (and by your build if you read it in app config)
  QELOS_API_IP = "http://159.203.152.168"

[[plugins]]
  package = "@qelos/plugin-netlify-api"
```

Minimal variant (defaults API URL inside the plugin if you omit env):

```toml
[[plugins]]
  package = "@qelos/plugin-netlify-api"
```

Optional: set the API URL (default `http://159.203.152.168`) and/or enable bypass-admin header:

```toml
[[plugins]]
  package = "@qelos/plugin-netlify-api"

  [plugins.inputs]
    api_url = "http://159.203.152.168"
    bypass_admin = true
```

- **api_url** — Target for the `/api/*` proxy. You can also set **`QELOS_API_IP`** or **`API_HOST`** in `[build.environment]` or in the Netlify UI (same role as `API_HOST` in a hand-written `netlify/functions/api-proxy.ts`).
- **bypass_admin** — If `true`, the proxy adds the header `x-bypass-admin: true` to every request so that admin users are scoped as regular users. See root docs: `documentation/docs/plugins/api-proxy.md` and `documentation/docs/sdk/token_refresh.md`.

## What it does

- **Environment:** Sets `QELOS_API_IP` for the build (and for the proxy function at runtime).
- **Redirect:** Adds a rewrite so `/api/*` is served by `/.netlify/functions/qelos-api-proxy` (status 200, force).
- **Function:** Copies `qelos-api-proxy.ts` from the package into your Netlify **functions directory** (default `netlify/functions`, or `[functions] directory` in `netlify.toml`) during `onPreBuild`, so the bundler sees a normal function file. Forwards requests using `QELOS_API_IP` / `API_HOST` (full URL or hostname).

No need to add redirects or commit the proxy yourself; the plugin writes it each build. Optional: add `netlify/functions/qelos-api-proxy.ts` to `.gitignore` if you run local Netlify builds and do not want the copy tracked.

**Parity with a manual Netlify function** (e.g. `[[redirects]]` → `/.netlify/functions/api-proxy` and a function using `process.env.API_HOST`): use this plugin instead of those entries; set `QELOS_API_IP` or `API_HOST` to the same value you used for `API_HOST`, and set `bypass_admin = true` under `[plugins.inputs]` if your old proxy always sent `x-bypass-admin: true`.
