# @qelos/plugin-netlify-api

Netlify build plugin for Qelos frontend apps: proxies `/api/*` to your Qelos API and injects config.

## Setup

In your site’s `netlify.toml`:

```toml
[[plugins]]
  package = "@qelos/plugin-netlify-api"
```

Optional: set the API URL (default `http://159.203.152.168`):

```toml
[[plugins]]
  package = "@qelos/plugin-netlify-api"

  [plugins.inputs]
    api_url = "http://159.203.152.168"
```

Or set the `QELOS_API_IP` environment variable in the Netlify UI (build or runtime).

## What it does

- **Environment:** Sets `QELOS_API_IP` for the build (and for the proxy function at runtime).
- **Redirect:** Adds a rewrite so `/api/*` is served by `/.netlify/functions/qelos-api-proxy` (status 200, force).
- **Function:** Injects a serverless function `qelos-api-proxy` that forwards requests to the host/port from `QELOS_API_IP` (supports a full URL like `http://159.203.152.168` or a hostname).

No need to add redirects or the function file to your repo; the plugin does it at build time.
