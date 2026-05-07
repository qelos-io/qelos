---
title: Gateway endpoint reference
editLink: true
---

# Gateway endpoint reference

All public HTTP APIs are served through the **gateway** (`apps/gateway`). Incoming paths are forwarded to internal services (auth, no-code, AI, plugins, etc.) according to proxy configuration. Use your deployed application origin as the base URL (for example `https://your-tenant.qelos.io`).

This page collects the main **REST** routes grouped by domain, with **`curl`** examples and **`@qelos/sdk`** equivalents. Deeper field-level detail lives in the linked topic pages.

## How routing works

| Path prefix | Proxied to | Typical responsibility |
|-------------|------------|-------------------------|
| `/api/signin`, `/api/signup`, `/api/token`, `/api/me`, `/api/users`, `/api/logout`, `/api/invites`, `/api/workspaces`, `/api/auth`, `/api/roles` | Auth service | Accounts, sessions, workspaces (auth surface), roles |
| `/api/blueprints`, `/api/components`, `/api/static` | No-code service | Blueprints and blueprint entities |
| `/api/ai` | AI service | Threads, chat completions, source integrations |
| `/api/events`, `/api/plugins`, `/api/lambdas`, `/api/webhooks`, … | Plugins service | Events, plugins, lambdas (broader `/api` fallback on plugins when no earlier proxy matches) |
| `/api/blocks`, `/api/configurations`, … | Content service | CMS-style configuration |
| `/api/plans`, `/api/payments`, … | Payments service | Billing |

The gateway resolves **tenant** from the request hostname (or falls back to configuration). When you call the gateway by raw IP or non-production host, you may need an explicit `tenant` header matching your tenant id.

## Headers used everywhere

| Header | When |
|--------|------|
| `Host` | Your app hostname; gateway uses it to resolve tenant in normal deployments. |
| `tenant` | Optional override when hostname does not map to a tenant (development / internal calls). |
| `Content-Type: application/json` | Required for requests with a JSON body. |
| `Authorization: Bearer <access_token>` | OAuth-style access token from `POST /api/signin` with `authType: "oauth"`. |
| `Cookie` | Session cookie from cookie-based sign-in (`qlt_*`). |
| `x-api-key: <token>` | Long-lived API token / plugin token. |
| `x-impersonate-user`, `x-impersonate-workspace` | Admin impersonation (privileged callers); see administrator SDK. |

Anonymous endpoints (sign-in, sign-up, OAuth redirects) omit `Authorization` / `x-api-key`.

Replace `BASE` in examples with your gateway origin (no trailing slash).

---

## 1. Entities (blueprint data)

Base path: `/api/blueprints/:blueprintKey/entities` (no-code service). Responses default to the **flat** entity shape; see [Blueprint Entities API](/api/blueprint-entities).

### `GET /api/blueprints/:key/entities`

**Headers:** `Authorization` or session cookie or `x-api-key`; optional `Accept-Version: v1` to pin flat responses.

**Query:** `$limit`, `$skip`, `$sort`, `$flat`, `$populate`, `$q`, filters — see [Blueprint Entities API](/api/blueprint-entities).

**Response:** `200` — JSON array of entities.

**curl**

```bash
curl -sS "$BASE/api/blueprints/product/entities?\$limit=10" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**SDK**

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({ baseUrl: BASE, getAccessToken: () => ACCESS_TOKEN });
await sdk.entities('product').getList({ $limit: 10 });
```

### `GET /api/blueprints/:key/entities/:identifier`

**Response:** `200` — single entity.

**curl**

```bash
curl -sS "$BASE/api/blueprints/product/entities/ENTITY_ID" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**SDK**

```typescript
await sdk.entities('product').getEntity('ENTITY_ID');
```

### `POST /api/blueprints/:key/entities`

**Body:** JSON object — fields must match the blueprint schema (plus optional `identifier`, `workspace`, etc., as supported by the blueprint).

**Response:** `200` / `201` — created entity.

**curl**

```bash
curl -sS -X POST "$BASE/api/blueprints/product/entities" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo","price":10}'
```

**SDK**

```typescript
await sdk.entities('product').create({ name: 'Demo', price: 10 });
```

### `PUT /api/blueprints/:key/entities/:identifier`

**Body:** Partial entity fields.

**Response:** `200` — updated entity.

**curl**

```bash
curl -sS -X PUT "$BASE/api/blueprints/product/entities/ENTITY_ID" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price":12}'
```

**SDK**

```typescript
await sdk.entities('product').update('ENTITY_ID', { price: 12 });
```

### `DELETE /api/blueprints/:key/entities/:identifier`

**Response:** `200` on success.

**curl**

```bash
curl -sS -X DELETE "$BASE/api/blueprints/product/entities/ENTITY_ID" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**SDK**

```typescript
await sdk.entities('product').remove('ENTITY_ID');
```

### `DELETE /api/blueprints/:key/entities/all`

**Response:** `200` — bulk delete for the blueprint (subject to server rules).

**SDK:** use the underlying HTTP API or administrator tooling; the high-level `QlBlueprintEntities` class focuses on single-entity and list operations — see [Blueprint Entities API](/api/blueprint-entities).

---

## 2. Auth

Detailed flows: [Authentication API](/api/authentication). Controllers live under `apps/auth/server/routes/`.

### `POST /api/signin`

**Body (session):** `{ "username": string, "password": string }`

**Body (OAuth tokens):** `{ "username": string, "password": string, "authType": "oauth" }`

**Response:** User payload; session variant sets `Set-Cookie`.

**curl (OAuth tokens)**

```bash
curl -sS -X POST "$BASE/api/signin" \
  -H "Content-Type: application/json" \
  -d '{"username":"you@example.com","password":"secret","authType":"oauth"}'
```

**SDK**

```typescript
await sdk.authentication.oAuthSignin({ username: 'you@example.com', password: 'secret' });
```

### `POST /api/signup`

**Body:** Registration fields (username, password, name fields, etc.) — see [Authentication API](/api/authentication).

**SDK**

```typescript
await sdk.authentication.signup({
  username: 'new@example.com',
  password: 'secret',
  firstName: 'Ada',
  lastName: 'Lovelace',
  birthDate: '1990-01-01'
});
```

### `POST /api/logout`

**Headers:** Authenticated session or bearer token.

**SDK**

```typescript
await sdk.authentication.logout();
```

### `GET /api/me`

**Headers:** `Authorization` or cookie or `x-api-key`.

**Response (`200`):**

```json
{
  "_id": "user-id",
  "username": "you@example.com",
  "email": "you@example.com",
  "name": "Full Name",
  "firstName": "Full",
  "lastName": "Name",
  "fullName": "Full Name",
  "profileImage": null,
  "roles": ["user"],
  "metadata": {},
  "workspace": null
}
```

`workspace` reflects the active workspace context when applicable.

**curl**

```bash
curl -sS "$BASE/api/me" -H "Authorization: Bearer ACCESS_TOKEN"
```

**SDK**

```typescript
await sdk.authentication.getLoggedInUser();
```

### `POST /api/me`

**Body:** Partial profile updates (`fullName`, `firstName`, `lastName`, `metadata`, …).

**SDK**

```typescript
await sdk.authentication.updateLoggedInUser({ fullName: 'New Name' });
```

### Token maintenance

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/token/refresh` | Refresh OAuth access token |
| `POST` | `/api/cookie/refresh` | Refresh cookie session |

**SDK**

```typescript
await sdk.authentication.refreshToken();
```

### Social OAuth (browser-oriented)

| Method | Path |
|--------|------|
| `GET` | `/api/auth/google` → `/api/auth/google/callback` |
| `GET` | `/api/auth/github` → `/api/auth/github/callback` |
| `GET` | `/api/auth/linkedin` → `/api/auth/linkedin/callback` |
| `GET` / handler | `/api/auth/facebook` → `/api/auth/facebook/callback` |
| `POST` | `/api/auth/callback` — exchange redirect token for session |

Use hosted login URLs in the browser; **`curl`** is not practical for the full OAuth redirect chain. **SDK:** [`sdk.authentication`](/sdk/authentication) social helpers where exposed.

---

## 3. Workspaces

Full reference: [Workspaces API](/api/workspaces). Routes from `apps/auth/server/routes/workspace.ts`.

### `GET /api/workspaces`

**Response:** Array of workspace summaries.

**curl**

```bash
curl -sS "$BASE/api/workspaces" -H "Authorization: Bearer ACCESS_TOKEN"
```

**SDK**

```typescript
await sdk.workspaces.getList();
```

### `POST /api/workspaces`

**Body:** `{ "name": string, ... }`

**SDK**

```typescript
await sdk.workspaces.create({ name: 'My workspace' });
```

### `GET /api/workspaces/:workspaceId`

**SDK**

```typescript
await sdk.workspaces.getWorkspace('WORKSPACE_ID');
```

### `PUT /api/workspaces/:workspaceId`

**SDK**

```typescript
await sdk.workspaces.update('WORKSPACE_ID', { name: 'Renamed' });
```

### `DELETE /api/workspaces/:workspaceId`

**SDK**

```typescript
await sdk.workspaces.remove('WORKSPACE_ID');
```

### `GET /api/workspaces/:workspaceId/members`

**SDK**

```typescript
await sdk.workspaces.getMembers('WORKSPACE_ID');
```

### `POST /api/workspaces/:workspaceId/members`

**Body:** Invite/add member payload (see [Workspaces API](/api/workspaces)).

### `PUT /api/workspaces/:workspaceId/members/:userId`

### `DELETE /api/workspaces/:workspaceId/members/:userId`

### `POST /api/workspaces/:workspaceId/activate`

**SDK**

```typescript
await sdk.workspaces.activate('WORKSPACE_ID');
```

### Privileged listing

`GET /api/workspaces/all` — lists every workspace (privileged operators).

---

## 4. AI

Gateway forwards `/api/ai` to the AI service (`apps/ai/server/routes`). Thread and integration chat docs: [AI Threads](/api/ai-threads), [AI Chat](/api/ai-chat), [AI RAG](/api/ai-rag).

### Threads

| Method | Path |
|--------|------|
| `POST` | `/api/ai/threads` |
| `GET` | `/api/ai/threads` |
| `GET` | `/api/ai/threads/:threadId` |
| `DELETE` | `/api/ai/threads/:threadId` |

**Create thread — body**

```json
{
  "integration": "integration-id",
  "title": "Optional title"
}
```

**curl**

```bash
curl -sS -X POST "$BASE/api/ai/threads" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"integration":"INTEGRATION_ID","title":"Support"}'
```

**SDK**

```typescript
await sdk.ai.threads.create({ integration: 'INTEGRATION_ID', title: 'Support' });
await sdk.ai.threads.list();
await sdk.ai.threads.getOne('THREAD_ID');
await sdk.ai.threads.delete('THREAD_ID');
```

### Integration chat completion

| Method | Path |
|--------|------|
| `POST` | `/api/ai/:integrationId/chat-completion` |
| `POST` | `/api/ai/:integrationId/chat-completion/:threadId` |

**Body:** Chat completion options (`messages`, optional `model`, `temperature`, `stream`, …) — see [AI Chat API](/api/ai-chat).

**curl**

```bash
curl -sS -X POST "$BASE/api/ai/INTEGRATION_ID/chat-completion" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

**SDK**

```typescript
await sdk.ai.chat.chat('INTEGRATION_ID', {
  messages: [{ role: 'user', content: 'Hello' }]
});
```

### Source-based completions (integration sources)

| Method | Path |
|--------|------|
| `POST` | `/api/ai/sources/:sourceId/chat-completion` |
| `POST` | `/api/ai/sources/:sourceId/chat-completion/plain` |
| `POST` | `/api/ai/sources/:sourceId/chat-completion/pages` |
| `POST` | `/api/ai/sources/:sourceId/chat-completion/integrations` |
| `POST` | `/api/ai/sources/:sourceId/blueprints` |
| `POST` | `/api/ai/sources/:sourceId/storage` |
| `POST` | `/api/ai/sources/:sourceId/storage/upload` |
| `POST` | `/api/ai/sources/:sourceId/storage/clear` |

These endpoints power specialized AI flows (pages agent, integrations agent, RAG storage). See [AI RAG](/api/ai-rag) and [AI Chat](/api/ai-chat).

### Agent helpers in the SDK

The `@qelos/sdk` **`sdk.ai.agents`** module calls REST paths under `/api/ai/agents` for **`list`** / **`get`** and uses chat completion endpoints for **`chat`**, **`streamChat`**, **`chatInThread`**, and **`streamChatInThread`** (`packages/sdk/src/ai/agents.ts`). Ensure your deployed AI service exposes any routes your SDK version expects.

```typescript
await sdk.ai.agents.list({ active: true });
await sdk.ai.agents.get('AGENT_ID');
await sdk.ai.agents.chat('AGENT_ID', 'Hello');
```

---

## 5. Permissions and roles

There is **no** standalone `GET /api/permissions` route. Effective access is enforced using:

- **Tenant roles** on the user (`GET /api/me` → `roles`).
- **Workspace roles** on membership (`GET /api/workspaces/:id/members`).
- Blueprint-level permission rules evaluated on entity routes (see blueprint definitions).

### `GET /api/roles`

Returns the catalog of role names (privileged).

**Headers:** `Authorization` or `x-api-key`; caller must satisfy privileged checks.

**Response (`200`):** JSON array of strings, for example `["admin","user","plugin"]`.

**curl**

```bash
curl -sS "$BASE/api/roles" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**SDK** (`@qelos/sdk/administrator`)

```typescript
import QelosAdministratorSDK from '@qelos/sdk/administrator';

const admin = new QelosAdministratorSDK({ baseUrl: BASE, getAccessToken: () => ACCESS_TOKEN });
const roles = await admin.roles.getExistingRoles();
```

Conceptual **`sdk.permissions`** APIs from product docs map onto **roles**, **workspace membership**, and **blueprint permission** configuration rather than a single REST resource.

---

## 6. Events

Routes from `apps/plugins/server/routes/events.ts`. Listing and mutation require authenticated users with edit privileges (or plugin allowance for create).

### `GET /api/events`

**Query:** `page`, `kind`, `eventName`, `source`, `user`, `workspace`, `period`, …

**Response:** Array of event documents.

**curl**

```bash
curl -sS "$BASE/api/events?kind=analytics&page=1" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### `GET /api/events/filter-options`

### `GET /api/events/count`

### `GET /api/events/sum`

### `GET /api/events/:eventId`

### `POST /api/events`

**Body:** Partial event (`source`, `kind`, `eventName`, `description`, `metadata`, …).

**curl**

```bash
curl -sS -X POST "$BASE/api/events" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"app","kind":"audit","eventName":"settings.changed","description":"Theme updated"}'
```

**SDK** (`@qelos/sdk/administrator`)

```typescript
import QelosAdministratorSDK from '@qelos/sdk/administrator';

const admin = new QelosAdministratorSDK({ baseUrl: BASE, getAccessToken: () => ACCESS_TOKEN });
await admin.events.getList({ kind: 'analytics', page: 1 });
await admin.events.dispatch({ source: 'app', kind: 'audit', eventName: 'signup', description: 'New user' });
```

---

## Further reading

- [API Reference overview](/api/api) — links to all detailed API topics and SDK mapping table
- [Authentication API](/api/authentication)
- [Blueprint Entities API](/api/blueprint-entities)
- [Workspaces API](/api/workspaces)
- [AI Threads](/api/ai-threads) · [AI Chat](/api/ai-chat) · [AI RAG](/api/ai-rag)
- [SDK introduction](/sdk/sdk)
