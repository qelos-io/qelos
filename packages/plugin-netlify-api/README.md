# @qelos/plugin-netlify-api

Netlify build plugin for Qelos frontend apps: proxies `/api/*` to your Qelos API and injects config.

## Setup

In your site’s `netlify.toml`:

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

- **api_url** — Target for the `/api/*` proxy. You can also set the `QELOS_API_IP` environment variable in the Netlify UI (build or runtime).
- **bypass_admin** — If `true`, the proxy adds the header `x-bypass-admin: true` to every request so that admin users are scoped as regular users. See root docs: `documentation/docs/plugins/api-proxy.md` and `documentation/docs/sdk/token_refresh.md`.

## What it does

- **Environment:** Sets `QELOS_API_IP` for the build (and for the proxy function at runtime).
- **Redirect:** Adds a rewrite so `/api/*` is served by `/.netlify/functions/qelos-api-proxy` (status 200, force).
- **Function:** Injects a serverless function `qelos-api-proxy` that forwards requests to the host/port from `QELOS_API_IP` (supports a full URL like `http://159.203.152.168` or a hostname).

No need to add redirects or the function file to your repo; the plugin does it at build time.
