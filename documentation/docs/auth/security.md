---
title: Security Best Practices
editLink: true
---

# Security Best Practices

This page collects the security guidance for integrators using Qelos
auth: how to store tokens, how cookies should be configured, and how to
defend against the usual suspects (CSRF, XSS, leaked refresh tokens).

## Token storage

| Token | Where | Why |
|---|---|---|
| Cookie session token | `HttpOnly` cookie set by the server | Inaccessible to JS — XSS cannot exfiltrate it. |
| OAuth access token | In-memory only (SDK holds it) | Short-lived; never persist to `localStorage`. |
| OAuth refresh token | Secure storage (server session, OS keychain on native) | Long-lived; never persist to `localStorage` in a browser. |
| API token | Secret manager / env var | Never commit; never embed in client bundles. |

### Don't put any token in `localStorage`

`localStorage` is readable by any script on the origin. A single XSS
payload can drain every token you put there. Stick to:

- **Browser apps** → cookie sessions (default for the integrators).
- **Native apps** → platform keychain APIs.
- **CLI / scripts** → env vars or OS-level secret stores.

### Don't put refresh tokens in URLs

The social-auth callback uses an `?rt=…` parameter exactly once and the
client immediately exchanges it. After exchange:

```ts
history.replaceState({}, '', location.pathname);
```

Strip the parameter so it does not appear in browser history,
analytics events, or the `Referer` header on subsequent navigations.

## Cookie settings

The Qelos auth service issues cookies with:

- `HttpOnly` — always.
- `Secure` — when the auth service is reached over HTTPS or when a
  `cookieBaseDomain` is configured.
- `SameSite=Lax` — same-domain deployments (cookie + app on the same
  registrable domain).
- `SameSite=None; Secure` — cross-subdomain deployments (e.g. cookies
  set on `.example.com` and used by `app.example.com` and
  `admin.example.com`).
- `Path=/api` (auth service) and `Path=/` (integrator-rewritten cookies).

### When to use `SameSite=Lax` vs `None`

- Single-domain SaaS where browser, app, and API all live under the
  same registrable domain → `Lax` is enough. The browser will not send
  the cookie on cross-origin POSTs, blocking the simplest CSRF
  patterns.
- Cross-subdomain or split frontend/backend domains → `None` + `Secure`
  is required. You must add explicit CSRF protection (see below).

## CSRF

CSRF risk depends on the auth mode:

| Mode | CSRF risk | Mitigation |
|---|---|---|
| Cookie + `SameSite=Lax` | Low for state-changing GETs/POSTs from third-party origins | The `SameSite` attribute itself is the primary defense; pair it with safe HTTP methods (don't mutate on `GET`). |
| Cookie + `SameSite=None` | Yes — any origin can attempt cross-site submission | Add a CSRF token (double-submit cookie or synchronizer token) on every state-changing route. |
| OAuth (bearer header) | None — browsers do not auto-attach `Authorization` headers | n/a |
| API token (`x-api-key`) | None — same reason | n/a |

For the OAuth social flow, the `state` parameter is your CSRF guard:
generate a random value before redirecting, persist it client-side,
and reject the callback if it does not echo back. See
[Social authentication](./social-auth#step-1--build-the-login-url).

## XSS and Content Security Policy

Cookie-based sessions tolerate XSS poorly even though the cookie is
`HttpOnly` — an attacker can still ride the session by issuing
fetch/XHR calls from the victim's page. Defenses:

- Ship a strict Content Security Policy (`script-src 'self'`, no
  inline scripts where possible).
- Sanitize user-rendered HTML — never `v-html` / `dangerouslySetInnerHTML`
  with untrusted input.
- Avoid `eval`, `new Function(...)`, and string-based timer callbacks.
- Pin third-party scripts via Subresource Integrity (SRI).

## API tokens

Specific to long-lived API tokens:

1. **Never commit tokens.** Store in env vars, GitHub Actions
   secrets, or a secret manager (Vault, AWS Secrets Manager, GCP
   Secret Manager).
2. **Set a real expiration.** 90 days is a reasonable upper bound for
   most CI tokens. Avoid multi-year tokens.
3. **Scope to a workspace** when the consumer only needs one workspace.
   A workspace-scoped token cannot be tricked into touching another
   workspace.
4. **One token per consumer.** Use a distinctive `nickname`
   ("`GitHub Actions — staging`", "`Plugin XYZ — prod`") so you can
   identify and revoke a single consumer without affecting others.
5. **Rotate on suspicion.** Create the new token, deploy it, then
   revoke the old one. There is no "rotate in place" — see
   [Rotating tokens](./api-tokens#rotating-tokens).
6. **Monitor `lastUsedAt`.** The List endpoint exposes last-used
   timestamps. Tokens that are unused for 30+ days are usually safe to
   revoke.
7. **Self-management is blocked.** API tokens cannot create, list, or
   delete tokens. This caps the blast radius of a leaked token to the
   data the token was scoped to.

## Logging and incident response

- **Do not log tokens.** Most loggers will helpfully serialize request
  headers — strip `Authorization`, `Cookie`, and `x-api-key` before
  logging.
- **Audit token use.** The auth service writes events for token
  creation, deletion, and authentication failures. Wire these to your
  SIEM / events log.
- **On a leak**: revoke the affected token (`deleteApiToken`), then
  rotate any tokens that may have been created or used during the
  exposure window. Cookie sessions can be invalidated by changing the
  user's password or via the auth service's session-revocation tools.

## Quick checklist

Before going live with an integrator:

- [ ] Cookies served over HTTPS in production
- [ ] `cookieBaseDomain` set correctly for cross-subdomain deployments,
      with `SameSite=None; Secure`
- [ ] CSRF token middleware mounted on state-changing routes when
      using `SameSite=None`
- [ ] OAuth `state` parameter validated on social-auth callback
- [ ] No tokens in `localStorage` / `sessionStorage`
- [ ] No `rt=` parameter left in browser URL after social callback
- [ ] API tokens stored in secret manager, not committed
- [ ] API token expirations set to ≤ 90 days where practical
- [ ] Logging redacts auth headers
- [ ] Strict CSP and HTML sanitization on user-rendered content
