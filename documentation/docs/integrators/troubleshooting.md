---
title: Integrator Troubleshooting
editLink: true
---

# Integrator Troubleshooting

Common errors when wiring `@qelos/integrator-*` packages into an external app.
This page is aimed at **Next.js** and **Nuxt** BFF setups, but the same
gateway rules apply to every integrator.

If you have not installed an integrator yet, start with
[Getting Started as an Integrator](../getting-started/integrators.md) and the
[per-framework guides](./index.md).

## `no website for host: <IP address>`

### Symptom

A call to `/api/me` (from middleware, a catch-all API proxy, or the SDK)
returns **400** with a body like:

```json
{ "message": "no website for host: 159.203.152.168" }
```

The host in the message is a **raw IP** (or another hostname Qelos does not
know), not your app's public URL.

### Why it happens

The Qelos gateway resolves your **tenant** from the request `Host` header
(see [Gateway endpoint reference](../api/gateway-endpoint-reference.md)).
Every hostname your app uses must be registered for that tenant — typically in
**Admin → App configuration → Hostnames** (`metadata.websiteUrls`).

Integrators call Qelos server-side via a **proxy target** URL. Resolution
order (highest priority first):

| Integrator | Framework-specific override | Shared fallbacks | Final fallback |
|---|---|---|---|
| Next.js | `NEXT_QELOS_PROXY_TARGET` | `QELOS_IP`, `QELOS_API_IP` | `QELOS_APP_URL` / `appUrl` |
| Nuxt | `NUXT_QELOS_PROXY_TARGET` | `QELOS_IP`, `QELOS_API_IP` | `qelos.appUrl` / `NUXT_QELOS_APP_URL` |
| Express, Fastify, NestJS | `QELOS_PROXY_TARGET` | `QELOS_IP`, `QELOS_API_IP` | `appUrl` |
| FastAPI | — | `QELOS_PROXY_TARGET`, `QELOS_IP`, `QELOS_API_IP` | `app_url` |

When `QELOS_IP` or `QELOS_API_IP` is set (common in local dev and Netlify
templates), the integrator forwards traffic to that IP. The upstream request
then carries `Host: 159.203.152.168` (or similar). Qelos has no website
registered for that address, so tenant lookup fails.

`QELOS_APP_URL` / `appUrl` is **not** a substitute for registering your app's
own domain — it is the managed Qelos tenant base URL. Both must be correct:

- **`appUrl`** — where server-side code reaches Qelos (tenant domain, e.g.
  `https://my-app.qelos.io`).
- **Your app's public origin** — what the browser and BFF use (e.g.
  `https://app.example.com`), listed in `websiteUrls`.

### Fix

**1. Set the tenant URL, not the IP, as `appUrl`**

```bash
# .env — use your Qelos tenant domain
QELOS_APP_URL=https://my-app.qelos.io
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@qelos/integrator-nuxt'],
  qelos: {
    appUrl: process.env.QELOS_APP_URL!, // https://my-app.qelos.io — not the raw IP
  },
});
```

**2. Treat `QELOS_IP` / `QELOS_API_IP` as connectivity overrides only**

Use them when the tenant domain is not reachable from your machine (e.g.
pointing at a shared dev gateway). They route **network** traffic; they do
**not** replace `appUrl` and they do **not** register a hostname with Qelos.

In production, prefer **`appUrl` alone** and remove IP overrides from env.

**3. Register every hostname your app serves**

In the Qelos admin panel, add each origin users hit to
`metadata.websiteUrls`, including:

- Production custom domain (`app.example.com`)
- Staging / preview hosts
- Local dev (`localhost:3000`, `127.0.0.1:3000`) when testing auth locally

See [Social authentication → websiteUrls](../auth/social-auth.md) for the same
allow-list used by OAuth callbacks.

**4. Prefer the tenant domain in development when possible**

Map the tenant hostname to the server IP in your OS hosts file and keep
`QELOS_APP_URL` as the domain — no `QELOS_IP` needed:

```text
# /etc/hosts  (Windows: C:\Windows\System32\drivers\etc\hosts)
203.0.113.10   my-app.qelos.io
```

Then:

```bash
QELOS_APP_URL=https://my-app.qelos.io
# unset QELOS_IP / QELOS_API_IP / *_PROXY_TARGET
```

**5. Custom-domain BFF (Next / Nuxt on Netlify or similar)**

When the browser talks to `https://app.example.com/api/...` and Nitro/Next
proxies to Qelos, the gateway must see **`app.example.com`** as the public
host — not the upstream IP. Follow the same-origin proxy setup in
[API Proxy](../plugins/api-proxy.md) (plugin ≥ 4.1.2, `postbuild` patch,
`websiteUrls`, OAuth callback URLs).

### Quick checklist

| Check | Expected |
|---|---|
| `QELOS_APP_URL` / `qelos.appUrl` | Tenant **domain** URL (`https://…`), not `http://159.…` |
| `QELOS_IP` / `QELOS_API_IP` | Unset in production; dev-only if domain unreachable |
| `metadata.websiteUrls` | Includes your app's public host(s) |
| Browser / SDK `appUrl` | Same origin as the page (`location.origin`) when using a BFF |

---

## `Qelos API proxy is not configured` (503)

### Symptom

Responses include:

```text
[@qelos/integrator-next] Qelos API proxy is not configured. Set appUrl (or NEXT_QELOS_PROXY_TARGET / QELOS_IP / QELOS_API_IP in development).
```

(or the Nuxt / Express / Nest / Fastify equivalent).

### Fix

Set at least one proxy target:

```bash
QELOS_APP_URL=https://my-app.qelos.io
```

For Next.js default exports, `QELOS_APP_URL` is **required** before the
middleware module loads. For Nuxt, set `qelos.appUrl` in `nuxt.config.ts` or
`NUXT_QELOS_APP_URL` at runtime.

---

## `@qelos/integrator-next: QELOS_APP_URL is required`

### Symptom

Build or first request throws because the default middleware cannot read
config.

### Fix

Add to `.env.local` (Next.js) or your deployment env:

```bash
QELOS_APP_URL=https://my-app.qelos.io
```

Or bypass the default export and pass config explicitly:

```ts
import { createQelosMiddleware } from '@qelos/integrator-next/middleware';

export default createQelosMiddleware({
  config: { appUrl: process.env.QELOS_APP_URL! },
});
```

---

## Anonymous user / empty `getQelosContext()` after login

### Symptom

Middleware runs but `user` is always `null`, or `/api/me` returns 401/400
while cookies look present.

### Common causes

1. **Host / tenant mismatch** — see [`no website for host`](#no-website-for-host-ip-address) above; failed tenant lookup prevents session resolution.
2. **Cookies scoped to the wrong domain** — Qelos sets cookies for its tenant
   domain; the integrator rewrites `Domain=` on `Set-Cookie` to your inbound
   `Host`. If you call the Qelos URL directly from the browser (cross-origin),
   cookies will not attach. Use the **same-origin BFF** (`/api/**` proxy) or
   [`@qelos/web-sdk`](../web-sdk/) with `credentials: 'include'` against your
   app origin.
3. **Middleware skipped the path** — Next.js auto-skips `/api/` when the
   catch-all proxy is enabled. Identity for API routes comes from the proxy
   and your route handlers, not edge `/api/me`.
4. **Missing catch-all proxy** — Without `createQelosApiProxyHandlers` (Next)
   or the Nuxt module's built-in proxy, browser SDK calls to `/api/...` never
   reach Qelos.

See [Cookie Token Lifecycle](../auth/cookie-tokens.md) for refresh behaviour.

---

## `401` from middleware with `requireAuth: true`

### Symptom

Every page or API route returns `401` before your handler runs.

### Fix

Integrators return **401**, not a login redirect. Either:

- Set `requireAuth: false` (default) and gate protected routes yourself, or
- Ensure a valid session exists (cookies on the request), or
- Use `apiToken` / `QELOS_API_TOKEN` for service-to-service mode (no end-user
  session).

Next.js: use `requireQelosUser()` + `redirect('/login')` in server
components. Nuxt: check `useQelos().isAuthenticated` or pass
`{ requireAuth: true }` only on routes that should fail closed.

---

## OAuth / social login failures on a custom domain

Symptoms include `redirect_uri does not match`, landing on `/` instead of your
callback, or `No website URL configured for tenant`.

These are usually **`websiteUrls`** or **`redirectUrl`** issues, not
integrator bugs. See:

- [Social authentication](../auth/social-auth.md)
- [Social auth common mistakes](../auth/social-auth.md#common-mistakes)
- [API Proxy → Social login](../plugins/api-proxy.md#social-login-oauth)

---

## Environment variable reference

### Required everywhere

| Variable | Purpose |
|---|---|
| `QELOS_APP_URL` | Managed Qelos tenant base URL (domain, not IP) |

### Optional — identity and routing

| Variable | Default | Purpose |
|---|---|---|
| `QELOS_API_TOKEN` | — | Service token; skips cookie-based `/api/me` |
| `QELOS_REQUIRE_AUTH` | `false` | Reject anonymous requests with 401 |
| `QELOS_SKIP_PATHS` | — | Comma-separated path prefixes to bypass middleware |
| `QELOS_DISABLE_PROXY` | `false` | Next.js: disable auto `/api/` skip when not using BFF proxy |

### Optional — dev connectivity overrides (use with care)

| Variable | Used by |
|---|---|
| `NEXT_QELOS_PROXY_TARGET` | Next.js |
| `NUXT_QELOS_PROXY_TARGET` | Nuxt |
| `QELOS_PROXY_TARGET` | Express, Fastify, NestJS, FastAPI |
| `QELOS_IP` | All integrators (shared) |
| `QELOS_API_IP` | All integrators (shared; Netlify plugin default target) |

Higher-priority entries in each integrator's resolution chain win over
`appUrl`. Leave IP overrides unset unless you understand the
[`no website for host`](#no-website-for-host-ip-address) implications.

---

## Still stuck?

1. Confirm the hostname in the error is listed in **Admin → App configuration → Hostnames**.
2. Compare your env against the [Next.js](./next.md) or [Nuxt](./nuxt.md) setup
   guide (sections **Environment variables** / **Configure the module**).
3. For gateway-level behaviour (tenant header, internal hosts), see
   [Gateway endpoint reference](../api/gateway-endpoint-reference.md).
4. Ask in [Discord](https://discord.gg/8D6TMdzZYJ) or open an issue on
   [GitHub](https://github.com/qelos-io/qelos).
