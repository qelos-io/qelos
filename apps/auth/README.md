# Qelos Authentication service

An HTTP server (back end only) with DB support & auth features 

## Usage
### As a Docker container
```
$ docker run -p 3001:3001 qelos/auth
```

## Development and Independent Usage
In case you would like to run this project manually, for any reason, there are several commands you need to acknowledge:

### Install
```sh
$ pnpm install
```

### Launch
```sh
$ pnpm start
```

## Main Features
- es6
- express
- mongoose
- passport
- validator
- signin / signup
- token and refresh-tokens
- optional roles by environment variables
- email verification
- social login (Google, GitHub, LinkedIn, Facebook)

## Social authentication endpoints

These endpoints back the SDK methods in `packages/sdk/src/authentication.ts`
(`getSocialLoginUrl`, `startSocialLogin`, `exchangeAuthCallback`). Supported
providers: `linkedin`, `facebook`, `google`, `github`. All endpoints are
mounted on the auth service and exposed by the gateway under `/api/auth/...`.

### `GET /api/auth/:provider`
Starts the OAuth round-trip. Builds the provider's authorization URL using the
tenant's configured `socialLoginsSources` and redirects the browser to it.

| Query param | Required | Purpose |
|---|---|---|
| `state`     | optional | Caller-supplied opaque value, echoed back to the callback. |
| `returnUrl` | optional | Where to deliver the issued refresh token after a successful login. Required for the SDK / server-to-server flow. Restricted to relative paths or the same hostname as the tenant. |

When `returnUrl` is supplied it is packed together with the user `state` into a
short-lived (10 min) signed JWT that is sent as the OAuth `state` parameter, so
that both values survive the provider round-trip without trusting the client.

### `GET /api/auth/:provider/callback`
The OAuth provider's redirect target. Exchanges the authorization code for an
access token, finds-or-creates the user, then either:

- **Browser flow** (no `returnUrl` was supplied at the start): sets the auth
  cookie on the tenant host and redirects to `/`.
- **SDK flow** (a valid `returnUrl` was supplied): issues a single-use refresh
  token, persists it on the user, and redirects to
  `<returnUrl>?rt=<refreshToken>[&state=<state>]`. The caller's app then forwards
  `rt` to `POST /api/auth/callback` to obtain a session.

If auto-registration is disabled and the user does not exist, the callback
redirects to `/login?error=needs-registration&email=...` instead.

### `POST /api/auth/callback?rt=<refreshToken>`
Exchanges a refresh token issued by `:provider/callback` for an authenticated
session. This is the server-to-server endpoint used by the SDK
(`exchangeAuthCallback`).

- Verifies the refresh token signature and tenant.
- Confirms the token's `tokenIdentifier` is still active on the user.
- Removes that token entry (single-use), issues a new cookie token, sets the
  auth cookie scoped to the tenant host, and returns the user payload:

```json
{ "payload": { "user": { ... }, "workspace": { ... } } }
```

The caller can then call any authenticated endpoint with the cookie or refresh
the cookie token via `POST /api/cookie/refresh`.

### Integration flow (SDK)
1. App calls `sdk.authentication.getSocialLoginUrl('google', { returnUrl })` and
   redirects the user to the URL.
2. User completes OAuth at the provider.
3. The provider redirects to `/api/auth/google/callback`, which redirects to
   `<returnUrl>?rt=<refreshToken>`.
4. App reads `rt` and calls `sdk.authentication.exchangeAuthCallback(rt)` to
   obtain the session cookie.

## Dependencies
- Node.js
- pnpm
- MongoDB


## Future development
- email verification (next phase, support of multiple email services APIs)
- reset password
