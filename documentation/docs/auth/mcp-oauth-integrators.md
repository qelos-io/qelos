---
title: MCP OAuth for Integrator Apps
editLink: true
---

# MCP OAuth for Integrator Apps

When your tenant serves MCP clients (Cursor, Claude, Codex, etc.) and you run a
**custom frontend** behind an integrator (`@qelos/integrator-express`,
`@qelos/integrator-next`, …), you own the browser pages that Qelos redirects
to during MCP OAuth. The SDK and integrators expose helpers for every step —
URL construction, login resume, consent display, callback parsing, and token
exchange — so you do not reimplement auth-service logic in your app.

> **Not building a custom frontend?** The Qelos admin panel already ships
> `/login` and `/mcp/authorize`. Enable MCP in admin and add permitted callback
> URLs — no integrator work required. See [MCP client setup](/mcp/clients).

## When you need this

Use this guide when **all** of the following are true:

1. Your app is hosted on a custom domain that proxies `/api/**` to Qelos (BFF /
   integrator pattern).
2. That same domain is the MCP OAuth **issuer** (what clients discover at
   `/.well-known/oauth-authorization-server`).
3. You want your own login and consent UI instead of the built-in admin pages.

The MCP client (Cursor, Claude, …) still receives the authorization `code` on
**its** callback URL (`cursor://…`, `https://claude.ai/…`). Your app only
hosts the human-facing login and consent steps.

## End-to-end flow

```
┌─────────────┐     ┌──────────────────────────────┐     ┌──────────────┐
│ MCP client  │     │ Your app (integrator + UI)   │     │ Qelos auth   │
│ Cursor, …   │     │ https://app.example.com      │     │ (proxied)    │
└──────┬──────┘     └──────────────┬───────────────┘     └──────┬───────┘
       │                           │                            │
       │ 1. Open authorize URL     │                            │
       │ ─────────────────────────►│ GET /api/auth/mcp/authorize│
       │                           │ ───────────────────────────► │
       │                           │                            │
       │                           │ 2. 302 → /login?redirect=… │
       │                           │ ◄─────────────────────────── │
       │                           │                            │
       │                           │ 3. User signs in (your UI) │
       │                           │ ───────────────────────────► │
       │                           │    POST /api/signin (proxy)│
       │                           │                            │
       │                           │ 4. Resume authorize        │
       │                           │ ───────────────────────────► │
       │                           │ 302 → /mcp/authorize?      │
       │                           │       mcp_state=…          │
       │                           │ ◄─────────────────────────── │
       │                           │                            │
       │                           │ 5. Consent (your UI)       │
       │                           │ POST /api/auth/mcp/consent │
       │                           │ ───────────────────────────► │
       │                           │                            │
       │ 6. 302 → client redirect  │                            │
       │    ?code=…&state=…        │ ◄─────────────────────────── │
       │ ◄─────────────────────────│                            │
       │                           │                            │
       │ 7. PKCE token exchange    │                            │
       │ ───────────────────────────────────────────────────────►│
       │    POST /api/auth/mcp/token                             │
       │ ◄───────────────────────────────────────────────────────│
```

Steps 1–5 run in the browser on your domain. Step 6 redirects back to the MCP
client's registered callback URL. Step 7 is performed by the MCP client itself
(Cursor, Claude, etc.) — not your integrator app.

## Prerequisites

### Admin configuration

In **Admin → MCP Configuration**:

- Enable MCP OAuth for the tenant.
- Add every MCP client callback URL you support under **Permitted callback
  URLs** (e.g. `cursor://anysphere.cursor-mcp/oauth/callback`,
  `https://claude.ai/api/mcp/auth_callback`). See
  [MCP configuration](/mcp/configuration).

Optional: enable **Admin only** if only workspace admins may connect MCP clients.

### Integrator proxy

Your integrator must proxy `/api/**` to Qelos so these endpoints work on your
domain:

| Path | Purpose |
|---|---|
| `/.well-known/oauth-authorization-server` | OAuth discovery for MCP clients |
| `/api/auth/mcp/authorize` | Starts the flow; redirects to your login or consent page |
| `/api/auth/mcp/consent` | Accept/deny consent (requires authenticated cookie session) |
| `/api/auth/mcp/token` | PKCE code exchange (called by the MCP client) |
| `/api/signin` (or social auth) | Your login page uses the proxied sign-in API |

Express and Next.js integrators enable this via the catch-all `/api/**` proxy.
See [Express integrator](/integrators/express) or
[Next.js integrator](/integrators/next).

### Routes you must add

Qelos auth hardcodes two frontend paths on the **tenant host**:

| Path | Required | Purpose |
|---|---|---|
| `/login` | yes | Shown when the user is not signed in during MCP OAuth |
| `/mcp/authorize` | yes | Consent screen after sign-in |

If your app uses different paths, pass custom paths to the SDK helpers (see
below) **and** configure your reverse proxy or auth overrides accordingly. The
default Qelos auth service emits `/login` and `/mcp/authorize`.

## SDK helpers

Import from `@qelos/sdk` (or re-exported from `@qelos/integrator-express` /
`@qelos/integrator-next`):

| Helper | Use |
|---|---|
| `buildMcpAuthorizePath(options)` | Relative `/api/auth/mcp/authorize?…` path |
| `sdk.authentication.getMcpAuthorizeUrl(options)` | Absolute authorize URL |
| `buildMcpLoginRedirectUrl(authorizePath)` | `/login?redirect=…` (what auth returns when anonymous) |
| `buildMcpConsentPageUrl(mcpState)` | `/mcp/authorize?mcp_state=…` (post-login redirect target) |
| `resolveMcpLoginRedirect(query)` | Normalize login-page query into the post-login destination |
| `buildMcpAuthorizePathFromQuery(query)` | Build authorize path from raw OAuth query params |
| `decodeMcpOAuthStatePayload(mcpState)` | Decode consent JWT for UI labels (not verified) |
| `appendMcpAccessDeniedRedirect(redirectUri, state?)` | Client callback URL when user denies consent |
| `parseMcpCallbackParams(input)` | Parse `?code=…` / `?error=…` on a callback URL |
| `sdk.authentication.exchangeMcpAuthorizationCode({…})` | PKCE token exchange (when **your** app owns the callback) |

Integrator-only:

| Helper | Use |
|---|---|
| `completeMcpAuthorizationCallback(sdk, input, { redirectUri, codeVerifier })` | Parse callback + exchange in one call |

## Implementing `/login`

When MCP OAuth starts and the user has no session, Qelos redirects to:

```
/login?redirect=%2Fapi%2Fauth%2Fmcp%2Fauthorize%3Fredirect_uri%3D…
```

After a successful sign-in, send the browser to the decoded `redirect` query
parameter. Use `resolveMcpLoginRedirect()` to normalize edge cases (direct
OAuth query params or `mcp_state` on the login URL):

```ts
import { resolveMcpLoginRedirect } from '@qelos/sdk';

// Express — after sdk.authentication.signin()
app.post('/login', express.json(), async (req, res) => {
  await req.qelos!.sdk.authentication.signin(req.body);
  const next = resolveMcpLoginRedirect(req.query as Record<string, string | string[] | undefined>);
  res.redirect(next || '/');
});

// Next.js App Router — login form action
import { resolveMcpLoginRedirect } from '@qelos/sdk';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData, searchParams: Record<string, string>) {
  // … sign in via proxied /api/signin …
  const next = resolveMcpLoginRedirect(searchParams);
  redirect(next || '/');
}
```

On first load, if the login page receives MCP OAuth query params without a
`redirect` param, persist them by redirecting once:

```ts
import { resolveMcpLoginRedirect } from '@qelos/sdk';

const resume = resolveMcpLoginRedirect(searchParams);
if (resume && !searchParams.redirect) {
  redirect(`/login?redirect=${encodeURIComponent(resume)}`);
}
```

## Implementing `/mcp/authorize`

After sign-in, `GET /api/auth/mcp/authorize` redirects to:

```
/mcp/authorize?mcp_state=<signed-jwt>
```

Your consent page should:

1. Require an authenticated user (integrator middleware sets `req.qelos.user` /
   `getQelosContext().user`). If missing, redirect to `/login?redirect=…`.
2. Decode `mcp_state` for display with `decodeMcpOAuthStatePayload()` — show
   `redirectUri`, optional `clientId`, and scopes if you collect them.
3. On **Accept**, `POST` to `/api/auth/mcp/consent` with form fields
   `mcp_state` and `action=accept`. The browser follows the redirect back to
   the MCP client with `?code=…`.
4. On **Deny**, either submit `action=deny` to the same endpoint or redirect
   with `appendMcpAccessDeniedRedirect(redirectUri, oauthState)`.

Minimal consent form (works with the proxied auth API):

```html
<form method="POST" action="/api/auth/mcp/consent">
  <input type="hidden" name="mcp_state" value="{{ mcpState }}" />
  <button type="submit" name="action" value="accept">Allow</button>
  <button type="submit" name="action" value="deny">Deny</button>
</form>
```

Express example with SDK helpers:

```ts
import {
  appendMcpAccessDeniedRedirect,
  buildMcpAuthorizePathFromQuery,
  decodeMcpOAuthStatePayload,
} from '@qelos/integrator-express';

app.get('/mcp/authorize', (req, res) => {
  if (!req.qelos?.user) {
    const resume =
      typeof req.query.mcp_state === 'string'
        ? `/mcp/authorize?mcp_state=${encodeURIComponent(req.query.mcp_state)}`
        : buildMcpAuthorizePathFromQuery(req.query as Record<string, string | string[] | undefined>);
    if (resume) {
      return res.redirect(`/login?redirect=${encodeURIComponent(resume)}`);
    }
    return res.status(400).send('Missing MCP OAuth state');
  }

  const mcpState = String(req.query.mcp_state || '');
  const payload = decodeMcpOAuthStatePayload(mcpState);
  if (!payload?.redirectUri) {
    return res.status(400).send('Invalid MCP OAuth state');
  }

  res.render('mcp-consent', { mcpState, payload });
});

app.post('/mcp/authorize/deny', (req, res) => {
  const payload = decodeMcpOAuthStatePayload(String(req.body.mcp_state || ''));
  if (!payload?.redirectUri) {
    return res.status(400).send('Invalid state');
  }
  res.redirect(appendMcpAccessDeniedRedirect(payload.redirectUri, payload.state));
});
```

Prefer posting directly to `/api/auth/mcp/consent` for **accept** so Qelos
issues the authorization code server-side.

## When your app owns the MCP callback URL

Most MCP clients (Cursor, Claude remote) handle step 7 themselves. If you build
a **local MCP client** or loopback server whose callback hits your app (e.g.
`http://127.0.0.1:3334/mcp/oauth/callback`), store the PKCE verifier, then:

```ts
import { completeMcpAuthorizationCallback } from '@qelos/integrator-express';

const result = await completeMcpAuthorizationCallback(req.qelos.sdk, req.url, {
  redirectUri: 'http://127.0.0.1:3334/mcp/oauth/callback',
  codeVerifier, // same value used to build code_challenge at authorize time
});
// result.accessToken, result.refreshToken, result.user
```

## Checklist — what to update

| Area | Action |
|---|---|
| **Admin → MCP** | Enable MCP; add permitted callback URLs for each client |
| **Integrator** | Proxy `/api/**`; set `QELOS_APP_URL` / `appUrl` |
| **Your app** | Add `/login` with `resolveMcpLoginRedirect` resume |
| **Your app** | Add `/mcp/authorize` consent UI + POST to `/api/auth/mcp/consent` |
| **Optional** | Custom paths via `buildMcpLoginRedirectUrl(path, { loginPath })` and `buildMcpConsentPageUrl(state, { consentPath })` if you cannot use `/login` and `/mcp/authorize` |
| **Local MCP client** | Register loopback callback URL in admin; use `completeMcpAuthorizationCallback` |

## Related docs

- [MCP overview](/mcp/) — tenant MCP server and tool exposure
- [MCP client setup](/mcp/clients) — connecting Cursor, Claude, Codex, …
- [MCP configuration](/mcp/configuration) — permitted callbacks and admin-only mode
- [Social authentication](./social-auth) — same BFF pattern for login pages
- [Cookie token lifecycle](./cookie-tokens) — how integrator sessions work
- [Authentication API](/api/authentication) — raw HTTP reference for MCP OAuth endpoints
