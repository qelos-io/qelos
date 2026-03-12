---
title: API Proxy
editLink: true
---
# API Proxy

When you host a Qelos frontend (e.g. admin or a plugin UI) on **Netlify**, the browser makes requests to your Netlify domain. If the frontend calls the Qelos API on another origin (e.g. `https://api.yourqelos.com`), you run into **CORS** and often **cookie/same-origin** constraints. A simple way to avoid that is to have the frontend call **the same origin** and let the server proxy those requests to the real Qelos API.

The **@qelos/plugin-netlify-api** Netlify build plugin does exactly that: at build time it configures your site so that `/api/*` is rewritten to a serverless function that forwards requests to your Qelos API. No CORS or cross-origin setup required; the browser only talks to your Netlify site.

## How it works

1. **Build time (Netlify build)**  
   The plugin runs in the `onPreBuild` phase and:
   - Sets the **environment variable** `QELOS_API_IP` (used by the proxy at runtime). You can override it via plugin inputs or Netlify env.
   - Adds a **redirect/rewrite**: `/api/*` → `/.netlify/functions/qelos-api-proxy` with status `200` and `force = true` (rewrite, not redirect).
   - Injects the **serverless function** `qelos-api-proxy` into your site’s functions (the plugin ships the function file; you don’t add it to your repo).

2. **Runtime**  
   When a user hits `https://your-site.netlify.app/api/...`:
   - Netlify matches the redirect and invokes `qelos-api-proxy`.
   - The function reads `QELOS_API_IP` (e.g. `http://159.203.152.168` or just the hostname), forwards the same path and query to that host/port, and returns the response. So your frontend can call `/api/...` on the same origin and the request is proxied to the Qelos API.

## Setup

### 1. Add the plugin in `netlify.toml`

In the repo of your frontend (e.g. Qelos admin or a plugin app) that you deploy to Netlify, add:

```toml
[[plugins]]
  package = "@qelos/plugin-netlify-api"
```

That’s enough for the default API URL (`http://159.203.152.168`).

### 2. (Optional) Configure the API URL

You can set the Qelos API URL in three ways (in order of precedence):

**A. Plugin input in `netlify.toml`**

```toml
[[plugins]]
  package = "@qelos/plugin-netlify-api"

  [plugins.inputs]
    api_url = "https://api.yourqelos.com"
```

**B. Environment variable in Netlify**  

In Netlify: **Site settings → Environment variables**, add `QELOS_API_IP` (e.g. `https://api.yourqelos.com`). You can use the same variable for build and for the function at runtime.

**C. Default**  

If neither is set, the plugin uses `http://159.203.152.168`.

The proxy accepts either a full URL (`http://...` or `https://...`) or a hostname; it will use the correct host and port when forwarding.

**D. (Optional) Bypass admin header**

To have the proxy send `x-bypass-admin: true` on every request (so admin users are scoped as regular users), set:

```toml
[plugins.inputs]
  bypass_admin = true
```

See [Bypass admin](#bypass-admin) below.

### 3. Point your frontend at `/api`

In your frontend code, configure the base URL for the Qelos API to the **same origin** and path `/api`, e.g.:

- `https://your-site.netlify.app/api` (production), or
- `http://localhost:8888/api` when using `netlify dev`.

Then all requests to `/api/*` go to the proxy, which forwards them to the Qelos API.

## What the plugin adds (equivalent config)

If you were to configure Netlify by hand, the plugin effectively does the following.

**Environment (build and function runtime):**

```toml
[build.environment]
  QELOS_API_IP = "http://159.203.152.168"
```

**Redirect:**

```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/qelos-api-proxy"
  status = 200
  force = true
```

**Function:**  
A serverless function at `/.netlify/functions/qelos-api-proxy` that forwards the request to the host/port derived from `QELOS_API_IP` and returns the response. You don’t add this file yourself; the plugin injects it at build time.

## Bypass admin

Backend APIs accept a **bypass-admin** flag so that privileged users (e.g. admin) are treated as regular users for scope filtering. You can pass it in any of these ways:

- **Query:** `?bypassAdmin=true`
- **Body:** `{ "bypassAdmin": true }` (for POST/PUT)
- **Header:** `x-bypass-admin: true` (or `x-bypass-admin: 1`)

When using the Netlify plugin, you can set `bypass_admin = true` in `[plugins.inputs]` so the proxy adds the header `x-bypass-admin: true` to every request. That way the frontend does not need to send query or body; the proxy applies it globally for that deployment.

## Summary

| What you do | What the plugin does |
|-------------|----------------------|
| Add `[[plugins]] package = "@qelos/plugin-netlify-api"` to `netlify.toml` | Sets `QELOS_API_IP`, adds `/api/*` → proxy redirect, injects `qelos-api-proxy` function |
| Optionally set `api_url` in `[plugins.inputs]` or `QELOS_API_IP` in Netlify env | Uses that value as the proxy target |
| Optionally set `bypass_admin = true` in `[plugins.inputs]` | Proxy adds `x-bypass-admin: true` to every request |
| Use base URL `/api` in your frontend | Browser calls same origin; proxy forwards to Qelos API |

No need to add redirects or function code to your repo; the plugin handles it so your Netlify-deployed Qelos frontend can talk to the Qelos API through `/api` on the same origin.
