---
title: Authentication API
editLink: true
---
# Authentication API

Endpoints for user authentication, session management, token handling, and user profile operations.

> **SDK equivalent:** [`sdk.authentication`](/sdk/authentication)

## Sign In (Session)

Create a session using cookie-based authentication.

```
POST /api/signin
```

### Request Body

```json
{
  "username": "user@example.com",
  "password": "password"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `username` | `string` | Yes | User email or username |
| `password` | `string` | Yes | User password |

### Response

Returns user payload. Sets a secure HTTP-only session cookie.

```json
{
  "payload": {
    "user": {
      "_id": "user-id",
      "username": "user@example.com",
      "fullName": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["user"]
    }
  }
}
```

The response includes a `set-cookie` header with the session cookie.

> **SDK:** [`sdk.authentication.signin(credentials)`](/sdk/authentication#authentication-with-signin-method)

---

## Sign In (OAuth)

Authenticate and receive access and refresh tokens for token-based authentication.

```
POST /api/signin
```

### Request Body

```json
{
  "username": "user@example.com",
  "password": "password",
  "authType": "oauth"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `username` | `string` | Yes | User email or username |
| `password` | `string` | Yes | User password |
| `authType` | `string` | Yes | Must be `"oauth"` for token-based auth |

### Response

```json
{
  "payload": {
    "user": {
      "_id": "user-id",
      "username": "user@example.com",
      "fullName": "John Doe"
    },
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

The `token` should be sent as `Authorization: Bearer <token>` on subsequent requests. When it expires, use the [Refresh Token](#refresh-token) endpoint to obtain a new one.

> **SDK:** [`sdk.authentication.oAuthSignin(credentials)`](/sdk/authentication#authentication-with-oauthsignin-method)

---

## Sign Up

Register a new user account.

```
POST /api/signup
```

### Request Body

```json
{
  "username": "newuser@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "newuser@example.com",
  "phone": "+1234567890",
  "birthDate": "1990-01-01"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `username` | `string` | Yes | Unique username or email |
| `password` | `string` | Yes | Account password |
| `firstName` | `string` | Yes | User's first name |
| `lastName` | `string` | Yes | User's last name |
| `email` | `string` | No | Email address |
| `phone` | `string` | No | Phone number |
| `fullName` | `string` | No | Full display name |
| `birthDate` | `string` | Yes | Date of birth |

### Response

```json
{
  "payload": {
    "user": {
      "_id": "user-id",
      "username": "newuser@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

> **SDK:** [`sdk.authentication.signup(information)`](/sdk/authentication)

---

## Sign Up (OAuth)

Register a new user and receive tokens in one step.

```
POST /api/signup
```

### Request Body

Same fields as [Sign Up](#sign-up), with the addition of `authType`:

```json
{
  "username": "newuser@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "birthDate": "1990-01-01",
  "authType": "oauth"
}
```

### Response

```json
{
  "payload": {
    "user": {
      "_id": "user-id",
      "username": "newuser@example.com"
    },
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

> **SDK:** [`sdk.authentication.oAuthSignup(information)`](/sdk/authentication)

---

## Refresh Token

Obtain a new access token using a refresh token.

```
POST /api/token/refresh
```

### Request Body

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `refreshToken` | `string` | Yes | A valid refresh token |

### Response

```json
{
  "payload": {
    "user": {
      "_id": "user-id",
      "username": "user@example.com"
    },
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

> **SDK:** [`sdk.authentication.refreshToken(refreshToken)`](/sdk/token_refresh)

---

## Get Logged-In User

Retrieve the currently authenticated user's profile. Also used internally for API token authentication.

```
GET /api/me
```

### Response

```json
{
  "_id": "user-id",
  "username": "user@example.com",
  "email": "user@example.com",
  "fullName": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "birthDate": "1990-01-01",
  "roles": ["user"],
  "metadata": {}
}
```

> **SDK:** [`sdk.authentication.getLoggedInUser()`](/sdk/authentication)

---

## Update Logged-In User

Update the currently authenticated user's profile.

```
POST /api/me
```

### Request Body

Accepts a partial user object — only the fields being changed need to be included.

```json
{
  "firstName": "Jane",
  "email": "newemail@example.com",
  "password": "newPassword123"
}
```

| Field | Type | Description |
|---|---|---|
| `firstName` | `string` | Updated first name |
| `lastName` | `string` | Updated last name |
| `fullName` | `string` | Updated display name |
| `email` | `string` | Updated email |
| `phone` | `string` | Updated phone number |
| `password` | `string` | New password |
| `metadata` | `object` | Custom metadata |

### Response

Returns the updated user object.

> **SDK:** [`sdk.authentication.updateLoggedInUser(changes)`](/sdk/authentication)

---

## Logout

End the current session.

```
POST /api/logout
```

### Response

Returns `200 OK` on success.

> **SDK:** [`sdk.authentication.logout()`](/sdk/authentication)

---

## List API Tokens

List all API tokens for the current user.

```
GET /api/me/api-tokens
```

::: warning
This endpoint is blocked for API token-authenticated requests. Use cookie or OAuth authentication.
:::

### Response

```json
[
  {
    "_id": "token-id",
    "nickname": "CI Pipeline",
    "tokenPrefix": "ql_abc...",
    "workspace": "workspace-id",
    "expiresAt": "2026-12-31T00:00:00.000Z",
    "lastUsedAt": "2026-01-15T10:30:00.000Z",
    "created": "2025-06-01T00:00:00.000Z"
  }
]
```

> **SDK:** [`sdk.authentication.listApiTokens()`](/sdk/authentication#managing-api-tokens-via-sdk)

---

## Create API Token

Create a new API token for programmatic access.

```
POST /api/me/api-tokens
```

### Request Body

```json
{
  "nickname": "CI Pipeline",
  "expiresAt": "2026-12-31T00:00:00.000Z",
  "workspace": "optional-workspace-id"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `nickname` | `string` | Yes | Human-readable name for the token |
| `expiresAt` | `string` | Yes | ISO 8601 expiration date |
| `workspace` | `string` | No | Scope the token to a specific workspace |

### Response

```json
{
  "token": "ql_raw_token_shown_only_once",
  "apiToken": {
    "_id": "token-id",
    "nickname": "CI Pipeline",
    "expiresAt": "2026-12-31T00:00:00.000Z"
  }
}
```

::: tip
The raw `token` value is returned **only once**. Store it securely.
:::

> **SDK:** [`sdk.authentication.createApiToken(data)`](/sdk/authentication#managing-api-tokens-via-sdk)

---

## Delete API Token

Revoke an existing API token.

```
DELETE /api/me/api-tokens/{tokenId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `tokenId` | `string` | The ID of the token to revoke |

### Response

Returns `200 OK` on success.

> **SDK:** [`sdk.authentication.deleteApiToken(tokenId)`](/sdk/authentication#managing-api-tokens-via-sdk)
