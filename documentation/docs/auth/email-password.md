---
title: Email & Password Auth
editLink: true
---

# Email & Password Signup & Signin

The default credential flow exchanges a username (or email) and password
for a session. Both signup and signin are dual-mode: the same endpoint
returns either a cookie session or an OAuth token pair, controlled by
`authType`.

## Signup

Register a new account.

```ts
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({ appUrl: 'https://app.example.com' });

const { payload } = await sdk.authentication.signup({
  username: 'alice@example.com',
  email: 'alice@example.com',
  password: 'a-strong-password',
  firstName: 'Alice',
  lastName: 'Cooper',
  birthDate: '1990-01-01',
});
```

`signup()` creates a cookie session. To receive an access/refresh token
pair instead — useful when there is no cookie jar — use `oAuthSignup()`:

```ts
const { payload } = await sdk.authentication.oAuthSignup({
  username: 'alice@example.com',
  password: 'a-strong-password',
  firstName: 'Alice',
  lastName: 'Cooper',
  birthDate: '1990-01-01',
});
// payload.token, payload.refreshToken
```

Required fields: `username`, `password`, `firstName`, `lastName`,
`birthDate`. Optional: `email`, `phone`, `fullName`. See the
[Sign Up endpoint](/api/authentication#sign-up) for full schema.

## Signin

Authenticate an existing user.

### Cookie session

```ts
await sdk.authentication.signin({
  username: 'alice@example.com',
  password: 'a-strong-password',
});
```

Behavior:

- The server validates credentials and issues a signed cookie token.
- The cookie is set with `HttpOnly` (and `Secure; SameSite=None` when a
  cross-domain `cookieBaseDomain` is configured).
- Subsequent SDK calls from the same origin send the cookie
  automatically. You do not see the token value.

### OAuth (token pair)

```ts
const { payload } = await sdk.authentication.oAuthSignin({
  username: 'alice@example.com',
  password: 'a-strong-password',
});
// payload.token         — short-lived access token (Authorization: Bearer)
// payload.refreshToken  — long-lived refresh token
```

The SDK stores both tokens internally. Subsequent calls send
`Authorization: Bearer <token>` automatically; on a `401` the SDK
exchanges the refresh token for a new pair and retries the original
request transparently. See [Token refresh](/sdk/token_refresh) for
details on concurrent-request coalescing and the
`onFailedRefreshToken` hook.

## Logout

```ts
await sdk.authentication.logout();
```

`POST /api/logout` invalidates the server-side token record. After this
call:

- Cookie sessions: the cookie is cleared; the SDK is unauthenticated.
- OAuth: the refresh token is revoked; any cached access token is no
  longer trusted by the server.

It is safe to call `logout()` even if the SDK believes it is not
authenticated — the server simply returns `200 OK`.

## Updating the current user

```ts
await sdk.authentication.updateLoggedInUser({
  firstName: 'Alicia',
  email: 'alicia@example.com',
  password: 'a-new-strong-password',
});
```

Sends a partial user object to `POST /api/me`. Only the fields you
include are changed. Password updates take effect immediately; existing
sessions remain valid until they expire.

## Errors

Both signup and signin reject with a thrown error on non-2xx responses.
The most common cases:

| Status | Meaning |
|---|---|
| 400 | Missing required field, invalid format, or weak password |
| 401 | Invalid credentials |
| 403 | Account disabled, or signup disabled in this tenant |
| 409 | Username/email already in use |

For tutorial-style end-to-end flows (login page, auth guard, profile
component), see [Building a Complete Authentication Flow](/sdk/tutorials/authentication_flow).
