---
title: Authentication
---

# {{ $frontmatter.title }}

Authentication is a crucial component of using the Qelos SDK. This section provides a detailed overview of the main authentication methods: `signin` and `oAuthSignin`.

## Authentication with `signin` Method

To authenticate a regular user, you can use the `signin` method. This method creates a session cookie in the browser to manage the user's session.

```bash
await sdk.authentication.signin({ username: "test@test.com", password: "admin" });
```

### Description of `signin` Method

**Usage**: Ideal for scenarios where traditional session management via `cookies` is sufficient.

### Behavior:

- **Session Management:** Creates a secure, HTTP-only cookie in the browser to manage the user's session.
- **Session Maintenance:** The cookie is sent with every request to the server to maintain the authenticated session.
- **Ideal For:** Browser-based applications where managing the session through cookies is sufficient. This method is suitable for simpler use cases where advanced token management is not necessary.
- **Example Use Case**
  In a typical web application, using signin will ensure that the user remains logged in as they navigate between pages, thanks to the session cookie.

### Additional Details method `signin`:

- Sets a secure, HTTP-only cookie which helps to protect the session from client-side scripts.
- Is straightforward for applications where cookie-based session management is appropriate and no additional token handling is required.

## Authentication with `oAuthSignin` Method

For applications that require OAuth-based authentication, use the oAuthSignin method. This method retrieves both an `access token` and a `refresh token`, which are managed internally by the SDK.

```bash
await sdk.authentication.oAuthSignin({ username: "test@test.com", password: "admin" });
```

### Description of `oAuthSignin` Method

**Usage**: Best for scenarios where OAuth authentication is required or preferred, and token-based authentication is needed.

### Behavior:

- **Token Management:** Retrieves an access token and a refresh token.
- **Access Token:** Used for making authenticated API requests.
- **Refresh Token:** Used to obtain a new access token when the current one expires.
- **Ideal For:** Applications needing token-based authentication, such as those integrating with OAuth providers or requiring advanced token management and expiration handling.
- **Example Use Case**
  Useful for Single Sign-On (SSO) scenarios or applications that need to manage tokens and handle token expiration and refresh seamlessly.

### Additional Details method `oAuthSignin` :

- Provides both access and refresh tokens, which the SDK manages internally.
- Uses the access token to authenticate API requests and the refresh token to obtain new access tokens when the current one expires.
- Handles token expiration and refresh automatically behind the scenes, so developers do not need to manually manage these tokens.
