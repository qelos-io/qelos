---
title: API Token Management
editLink: true
---

# API Token Management

API tokens give long-lived, programmatic access to a Qelos instance.
They are intended for non-interactive contexts: CI/CD, server-side
integrations, plugins, the CLI, and scripts. This page covers managing
tokens through the SDK; see the [API Tokens reference](/sdk/api_tokens)
for the full feature description.

## When to use

| Context | Use |
|---|---|
| Browser app with a real user | Cookie session |
| Native / SPA storing tokens itself | OAuth pair |
| GitHub Actions, scheduled job, CLI | **API token** |
| Plugin running in Plugin Play | **API token** |

API tokens have **no refresh cycle** — they are valid until they expire
or are revoked. They authenticate via the `x-api-key` header, not the
`Authorization` header.

## Token shape

```ts
interface IApiToken {
  _id: string;
  nickname: string;
  tokenPrefix: string;        // first 8 chars of the raw token, e.g. 'ql_a1b2c'
  expiresAt: string;          // ISO 8601
  lastUsedAt?: string;
  workspace?: string;         // workspace id this token is scoped to
  created: string;
}
```

Only `tokenPrefix` and metadata are stored server-side. The raw
`ql_…` token is hashed before storage and shown to the creator exactly
once.

## Listing tokens

```ts
const tokens: IApiToken[] = await sdk.authentication.listApiTokens();

for (const t of tokens) {
  console.log(t.nickname, t.tokenPrefix, t.expiresAt, t.lastUsedAt ?? 'never used');
}
```

`GET /api/me/api-tokens`. Returns every token belonging to the
currently authenticated user.

## Creating a token

```ts
const { token, apiToken } = await sdk.authentication.createApiToken({
  nickname: 'GitHub Actions — staging',
  expiresAt: '2027-01-01T00:00:00.000Z',
  workspace: '664f1a2b3c4d5e6f7a8b9c0e',   // optional scope
});

console.log('Save this exactly once:', token);  // 'ql_a1b2c3d4...'
console.log('Token id (for revoke):', apiToken._id);
```

`POST /api/me/api-tokens`.

| Field | Required | Notes |
|---|---|---|
| `nickname` | Yes | Human-readable. Use it to identify which environment / pipeline owns the token. |
| `expiresAt` | Yes | ISO 8601 in the future. Prefer the shortest practical lifetime. |
| `workspace` | No | If set, the token is locked to this workspace and **cannot** switch. |

The raw `token` value is returned only on creation. There is no
endpoint to retrieve it again — if you lose it, revoke and recreate.

The auth service rate-limits this endpoint by user (max 10 active
tokens per user) and rejects past `expiresAt` values.

## Revoking a token

```ts
await sdk.authentication.deleteApiToken(apiToken._id);
```

`DELETE /api/me/api-tokens/:tokenId`. Effects:

- The token is removed from the database.
- The auth-result cache for that token is invalidated immediately, so
  any in-flight requests fail on their next authentication check.
- Expired tokens are cleaned up automatically by a TTL index — you do
  not need to revoke them.

## Using the token

```ts
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: 'https://app.example.com',
  apiToken: process.env.QELOS_API_TOKEN!,
});

const me = await sdk.authentication.getLoggedInUser();
```

Every request is sent with `x-api-key: ql_…`. No refresh logic runs;
`forceRefresh` is ignored when an API token is present.

You can also switch an existing SDK to API-token mode at runtime:

```ts
const me = await sdk.authentication.apiTokenSignin('ql_…');
```

## Permission boundaries

Two restrictions are enforced server-side and are worth knowing about:

1. **API token-authenticated requests cannot manage tokens.** The
   create/list/delete endpoints all reject API-token auth with `403`.
   Use cookie or OAuth auth to manage tokens. This prevents a stolen
   token from being used to mint replacements or revoke other tokens.
2. **Workspace-scoped tokens are locked.** When a token is created
   with a `workspace` value, every request authenticated by that token
   is treated as scoped to that workspace. Calls that try to switch
   workspace fail.

## Practical recipes

### CI: deploy a blueprint on push

```yaml
# .github/workflows/deploy.yml
- name: Push blueprints
  env:
    QELOS_URL: ${{ vars.QELOS_URL }}
    QELOS_API_TOKEN: ${{ secrets.QELOS_API_TOKEN }}
  run: npx @qelos/cli push
```

The CLI reads `QELOS_API_TOKEN` and authenticates via `x-api-key`.

### Express service-to-service call

```ts
const adminSdk = new QelosSDK({
  appUrl: process.env.QELOS_APP_URL!,
  apiToken: process.env.QELOS_SERVICE_TOKEN!,
});

app.post('/internal/run-batch', async (_req, res) => {
  const items = await adminSdk.entities('order').find({ status: 'pending' });
  // ...
  res.json({ processed: items.length });
});
```

### Rotating tokens

There is no "rotate" endpoint by design — rotation is just
create-then-delete:

```ts
const { token: newToken, apiToken: newRecord } = await sdk.authentication.createApiToken({
  nickname: 'CI — staging',
  expiresAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
});
// roll the new value into your secret store
await sdk.authentication.deleteApiToken(oldRecordId);
```

See [Security best practices](./security#api-tokens) for storage and
rotation guidance.
