---
title: SDK Reference
editLink: true
---
# SDK Reference

> **Scope:** This page is a single-stop reference for every public module on `QelosSDK`. Each section lists the method signature, parameters, return type, a working example, and the patterns we see most often in the codebase. For deeper guides on a single area, follow the per-module links — they include topics (sub-SDKs, charts, query builder operators) that this page only summarises.

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: 'https://your-app.qelos.app',
  fetch: globalThis.fetch,
  forceRefresh: true,
});
```

## Module Map

| Module | Public surface | What it does |
|---|---|---|
| Entities (Blueprints) | `sdk.blueprints`, `sdk.blueprints.entitiesOf(key)` | CRUD + query builder for blueprint-backed data |
| AI | `sdk.ai.threads`, `sdk.ai.chat`, `sdk.ai.rag` | Threads, chat completions, streaming, RAG |
| Authentication | `sdk.authentication` | Sign in / up, social, cookie + token refresh, API tokens |
| Workspaces | `sdk.workspaces` | Multi-tenant workspace CRUD, members, activation |
| Permissions | *Admin SDK + role-aware endpoints* | See [Permissions](#permissions) — there is no `sdk.permissions` namespace yet |
| Events | `sdkAdmin.events` (administrator SDK) | List and dispatch tenant events |

> **AI agents:** "Agents" in Qelos are surfaced as **integrations**. Use `sdk.ai.chat.chat(integrationId, ...)` against the agent's integration ID; there is no `sdk.ai.agents` sub-SDK.

---

## Entities

> **See also:** [Blueprints Operations](./blueprints_operations.md) — full coverage of `$outerPopulate`, charts, and admin-only blueprint management.

Blueprint entities are the row-level records that conform to a blueprint (data model). They are reached through a per-key handle returned by `sdk.blueprints.entitiesOf(key)`. Internally the handle is cached, so calling `entitiesOf('products')` twice returns the same instance.

```typescript
const products = sdk.blueprints.entitiesOf<Product>('products');
```

### `entitiesOf(blueprintKey)`

| | |
|---|---|
| **Signature** | `sdk.blueprints.entitiesOf<T>(blueprintKey: string): QlBlueprintEntities<T>` |
| **Returns** | A handle exposing `getList`, `getEntity`, `create`, `update`, `remove`. |

The optional `<T>` type parameter applies to every operation on the returned handle.

### `getList(query?, extra?)`

| | |
|---|---|
| **Signature** | `products.getList(query?: ICommonQueryFilters & Record<string, any>, extra?: RequestExtra): Promise<(IBaseBlueprintEntity & T)[]>` |
| **Returns** | Array of entities. With the default `$flat` shape, every metadata field is hoisted to the top level (and is also still available under `entity.metadata`). |

```typescript
// Page 2, 20 per page, newest first
const recent = await products.getList({
  $limit: 20,
  $skip: 20,
  $sort: '-created',
});

// Filter + range query (the query builder accepts MongoDB-style operators
// expressed as bracketed keys)
const cheap = await products.getList({
  category: 'electronics',
  'price[$lt]': 500,
  'price[$gte]': 50,
});

// Full-text search across selected metadata properties
const matches = await products.getList({
  $q: 'wireless',
  $qProps: 'name,description',
});

// Populate related entities from another blueprint in the same query
const withReviews = await products.getList({
  $outerPopulate: {
    reviews: { target: 'reviews', scope: 'tenant', limit: 5, sort: '-created' },
  },
});
```

### `getEntity(identifier, extra?)`

| | |
|---|---|
| **Signature** | `products.getEntity(identifier: string, extra?: RequestExtra): Promise<IBaseBlueprintEntity & T>` |
| **Returns** | Single entity in flat shape by default. |

```typescript
const product = await products.getEntity('sku-123');
console.log(product.name, product.metadata.name); // both work
```

### `create(entity, extra?)`

| | |
|---|---|
| **Signature** | `products.create(entity: T & IBaseBlueprintEntity, extra?: RequestExtra): Promise<IBaseBlueprintEntity & T>` |
| **Returns** | The created entity, including the server-assigned `identifier`, `created`, `updated`. |

```typescript
const created = await products.create({
  name: 'Acme Widget',
  price: 29.99,
  category: 'gadgets',
  inStock: true,
});
```

### `update(identifier, changes, extra?)`

| | |
|---|---|
| **Signature** | `products.update(identifier: string, changes: Partial<T & IBaseBlueprintEntity>, extra?: RequestExtra): Promise<IBaseBlueprintEntity & T>` |
| **Returns** | The updated entity. Only the keys in `changes` are written. |

```typescript
const updated = await products.update('sku-123', {
  price: 24.99,
  inStock: false,
});
```

### `remove(identifier, extra?)`

| | |
|---|---|
| **Signature** | `products.remove(identifier: string, extra?: RequestExtra): Promise<any>` |
| **Returns** | Resolves when the server confirms deletion. |

```typescript
await products.remove('sku-123');
```

### Flat vs Wrapped Responses

Every entity helper defaults to **flat** responses by sending `$flat=true`. Pass `$flat: false` (or `0`) to opt back into the older wrapped shape, where metadata fields live only under `entity.metadata`:

```typescript
// Flat (default): top-level fields hoisted, also mirrored under metadata
const flat = await products.getList();
flat[0].price;           // ✅
flat[0].metadata.price;  // ✅ still available

// Wrapped: only the metadata sub-object holds custom fields
const wrapped = await products.getList({ $flat: false });
wrapped[0].price;            // ❌ undefined
wrapped[0].metadata.price;   // ✅
```

### Query Builder Cheat Sheet

| Pattern | Meaning |
|---|---|
| `{ field: 'value' }` | Equality |
| `{ 'field[$lt]': 10 }` | Less than |
| `{ 'field[$gte]': 5, 'field[$lte]': 10 }` | Range |
| `{ 'field[$in]': ['a', 'b'] }` | In set |
| `{ $q: 'term', $qProps: 'name,desc' }` | Search across listed props |
| `{ $sort: '-created' }` | Sort (`-` prefix = descending) |
| `{ $limit: 20, $skip: 20 }` | Pagination |
| `{ $populate: true }` | Resolve referenced relations |
| `{ $outerPopulate: 'key:blueprint:scope' }` | Populate child entities from another blueprint |
| `{ $flat: false }` | Use wrapped response shape |

---

## AI

> **See also:** [AI Operations](./ai_operations.md) and [AI SDK Structure](./ai_sdk_structure.md).

The AI SDK is split into three sub-SDKs: `sdk.ai.threads`, `sdk.ai.chat`, and `sdk.ai.rag`. Every chat call is scoped to an **integration ID** — that integration represents the configured AI agent (provider, model, system prompt, tools).

### `sdk.ai.threads.create(data)`

| | |
|---|---|
| **Signature** | `sdk.ai.threads.create(data: ICreateThreadRequest): Promise<IThread>` |
| **Parameters** | `{ integration: string; title?: string }` |
| **Returns** | The created thread, including `_id`, empty `messages`, and timestamps. |

```typescript
const thread = await sdk.ai.threads.create({
  integration: 'support-bot',
  title: 'Order #4521 — refund inquiry',
});
```

Pair with `sdk.ai.threads.getOne(id)`, `.list(filters)`, and `.delete(id)` for a complete CRUD lifecycle.

### `sdk.ai.chat.stream(integrationId, options)`

| | |
|---|---|
| **Signature** | `sdk.ai.chat.stream(integrationId: string, options: IChatCompletionOptions): Promise<ReadableStream<Uint8Array>>` |
| **Returns** | A raw SSE `ReadableStream`. Pair with `parseSSEStream` to consume it. |

```typescript
const stream = await sdk.ai.chat.stream('support-bot', {
  messages: [{ role: 'user', content: 'Tell me a long story' }],
  temperature: 0.7,
});
```

For streaming inside a thread, use `sdk.ai.chat.streamInThread(integrationId, threadId, options)` — same options, just adds the thread context.

### `sdk.ai.chat.parseSSEStream(stream)`

| | |
|---|---|
| **Signature** | `sdk.ai.chat.parseSSEStream(stream: ReadableStream<Uint8Array>): ISSEStreamProcessor` |
| **Returns** | An async-iterable processor. Iterate with `for await`, or call `.processManually(onData)`. |

```typescript
const processor = sdk.ai.chat.parseSSEStream(stream);

for await (const chunk of processor) {
  const delta = chunk.choices?.[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}
```

`processManually` is the imperative variant — return `false` from the callback to stop reading early without leaking the underlying reader lock.

### `sdk.ai.chat.chat(integrationId, options)` — non-streaming

| | |
|---|---|
| **Signature** | `sdk.ai.chat.chat(integrationId: string, options: IChatCompletionOptions): Promise<IChatCompletionResponse>` |

```typescript
const response = await sdk.ai.chat.chat('support-bot', {
  messages: [
    { role: 'system', content: 'You are a concise assistant.' },
    { role: 'user', content: 'What can I do?' },
  ],
  temperature: 0.3,
  max_tokens: 200,
});

console.log(response.choices[0].message.content);
```

### Talking to a Specific Agent

There is no `sdk.ai.agents.chat()` method today — agents are exposed as integrations:

```typescript
// Equivalent to "chat with agent X"
const response = await sdk.ai.chat.chat('agent-integration-id', {
  messages: [{ role: 'user', content: 'Hi' }],
});
```

A dedicated `sdk.ai.agents` namespace is on the [roadmap](https://github.com/qelos/qelos/blob/main/ROADMAP.md); until it lands, treat the integration ID as the agent identifier.

---

## Authentication

> **See also:** [Authentication](./authentication.md) for cookie vs OAuth vs API token guidance and security best practices.

The authentication module manages user sessions across three modes: cookie sessions (`signin`), OAuth-style access + refresh tokens (`oAuthSignin`), and long-lived API tokens (`apiTokenSignin`).

### `sdk.authentication.signin(credentials)`

| | |
|---|---|
| **Signature** | `sdk.authentication.signin(credentials: ICredentials): Promise<{ payload: { user: IUser }; headers: { 'set-cookie': string \| null } }>` |
| **Parameters** | `{ username: string; password: string; roles?: string[] }` |
| **Behaviour** | Server sets an HTTP-only session cookie. Throws `'failed to login'` on non-2xx responses. |

```typescript
const { payload } = await sdk.authentication.signin({
  username: 'jane@example.com',
  password: 's3cret',
});
console.log('Logged in as', payload.user.fullName);
```

Use this in browser flows where the cookie carries the session; use `oAuthSignin` for SSR / mobile / service-to-service where you want explicit access + refresh tokens.

### `sdk.authentication.signup(information)`

| | |
|---|---|
| **Signature** | `sdk.authentication.signup(information: ISignupInformation): Promise<{ payload: { user: IUser } }>` |
| **Parameters** | `username`, `password`, `firstName`, `lastName`, `birthDate` (required); `email`, `phone`, `fullName` (optional). |

```typescript
const { payload } = await sdk.authentication.signup({
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'StrongP@ss!',
  firstName: 'New',
  lastName: 'User',
  birthDate: '1990-01-01',
});
```

There is also `oAuthSignup` for the token-based variant; it returns the same shape as `oAuthSignin` and stores the tokens on the SDK instance.

### `sdk.authentication.getLoggedInUser()`

| | |
|---|---|
| **Signature** | `sdk.authentication.getLoggedInUser(): Promise<IUser>` |
| **Returns** | The current user (`/api/me`). Throws if no auth context is present. |

```typescript
const me = await sdk.authentication.getLoggedInUser();
```

Pair with `updateLoggedInUser(changes)` to PATCH the same user (also accepts an optional `password` field).

### `sdk.authentication.refreshCookieToken(cookieToken?)`

| | |
|---|---|
| **Signature** | `sdk.authentication.refreshCookieToken(cookieToken?: string): Promise<{ payload: { user: IUser; cookieToken: string; workspace?: { _id: string } \| null }; headers: { 'set-cookie': string \| null } }>` |
| **Use case** | Server-side rendering — exchange a cookie token presented by the browser for a fresh one, then forward the `set-cookie` header on the response. |

```typescript
// Inside an SSR handler
const result = await sdk.authentication.refreshCookieToken(req.cookies.qelosToken);
res.setHeader('set-cookie', result.headers['set-cookie']!);
const user = result.payload.user;
```

### Social Authentication Flow

Social sign-in is a redirect dance. The SDK provides helpers for every step:

```typescript
// 1. Browser: kick off the redirect
sdk.authentication.startSocialLogin('google', {
  returnUrl: 'https://app.example.com/auth/finish',
  redirectUrl: 'https://app.example.com', // optional — OAuth callback origin
  state: crypto.randomUUID(),
});

// (or build the URL yourself)
const url = sdk.authentication.getSocialLoginUrl('github', {
  state: 'xyz',
  returnUrl: '/app/dashboard',
});
```

#### `getSocialLoginUrl(provider, options?)`

| | |
|---|---|
| **Signature** | `getSocialLoginUrl(provider: SocialProvider, options?: SocialLoginOptions): string` |
| **Returns** | Absolute URL to `GET /api/auth/<provider>` on the configured `appUrl`. Does not perform a redirect. |

`SocialLoginOptions`:

| Field | Type | Description |
|---|---|---|
| `state` | `string` | Optional CSRF token. Echoed in the signed OAuth `state` and on `returnUrl` after login. |
| `returnUrl` | `string` | Where Qelos redirects with `?rt=<refreshToken>` after OAuth. Absolute URLs must use a host in app-configuration `metadata.websiteUrls`; paths starting with `/` are allowed. Omit for browser cookie flow (`/`). |
| `redirectUrl` | `string` | Optional absolute URL whose host is in `metadata.websiteUrls`. Sets the OAuth provider callback to `<origin>/api/auth/<provider>/callback`. Defaults to the tenant request host. |

`startSocialLogin(provider, options?)` navigates the browser to the same URL (browser only).

#### After OAuth — `exchangeAuthCallback` / `socialCallback`

```typescript
// 2. Your app receives ?rt= on returnUrl; exchange for session + user:
const result = await sdk.authentication.exchangeAuthCallback(req.query.rt as string);
res.setHeader('set-cookie', result.headers['set-cookie']!);
const user = result.payload.user;

// Or parse rt from a URL / query object:
const result2 = await sdk.authentication.socialCallback(req.query);
```

Supported providers: `'linkedin' | 'facebook' | 'google' | 'github'`.

See also: [Social authentication (API)](/auth/social-auth) for callback URI resolution and `websiteUrls` allow-listing.

### API Tokens

For scripts and CI: `sdk.authentication.apiTokenSignin(token)` swaps the SDK into API-token mode (token sent as `x-api-key`, no refresh cycle). Manage tokens with `listApiTokens()`, `createApiToken({ nickname, expiresAt, workspace? })`, and `deleteApiToken(id)` — these endpoints require cookie or OAuth auth, **not** API-token auth.

---

## Workspaces

> **See also:** [Managing Workspaces](./managing_workspaces.md) for admin-side filters and encrypted-data helpers.

A workspace is a multi-tenant scope: users, blueprints, threads, and most other resources belong to one. The active workspace is sticky on the session.

### `sdk.workspaces.create(workspace)`

| | |
|---|---|
| **Signature** | `sdk.workspaces.create(workspace: Partial<IWorkspace> & { name: string }): Promise<IWorkspace>` |
| **Parameters** | `name` is required; `logo`, `labels`, and any custom metadata are optional. |

```typescript
const ws = await sdk.workspaces.create({
  name: 'Acme Marketing',
  labels: ['team:marketing', 'tier:pro'],
});
```

### `sdk.workspaces.getList()`

| | |
|---|---|
| **Signature** | `sdk.workspaces.getList(): Promise<IWorkspace[]>` |
| **Returns** | All workspaces the caller is a member of. |

```typescript
const workspaces = await sdk.workspaces.getList();
```

### `sdk.workspaces.getMembers(workspaceId)`

| | |
|---|---|
| **Signature** | `sdk.workspaces.getMembers(workspaceId: string): Promise<IWorkspaceMember[]>` |
| **Returns** | Members with their `user` ID, `roles`, and `created` timestamp. |

```typescript
const members = await sdk.workspaces.getMembers(ws._id);
const owners = members.filter(m => m.roles.includes('owner'));
```

> **Inviting users:** there is no `sdk.workspaces.inviteUser` method — invitations live in `sdk.invites`. See [Managing Invites](./managing_invites.md).

### `sdk.workspaces.activate(workspaceId)`

| | |
|---|---|
| **Signature** | `sdk.workspaces.activate(workspaceId: string): Promise<IWorkspace>` |
| **Behaviour** | Sets the workspace as the caller's active context. Subsequent requests are scoped to it (workspace-scoped blueprints, threads, etc.). |

```typescript
await sdk.workspaces.activate(ws._id);
```

A common pattern is to list workspaces on app load, activate the user's last choice, then re-fetch scoped resources:

```typescript
const all = await sdk.workspaces.getList();
const preferred = all.find(w => w._id === localStorage.getItem('lastWs')) ?? all[0];
if (preferred) {
  await sdk.workspaces.activate(preferred._id);
}
```

`update(id, changes)` and `remove(id)` round out the CRUD surface.

---

## Permissions

There is **no `sdk.permissions` namespace today**. Roles and permissions are surfaced through other module paths:

| Need | How to do it now |
|---|---|
| Read the current user's roles | `(await sdk.authentication.getLoggedInUser()).roles` |
| Read a workspace member's roles | `sdk.workspaces.getMembers(workspaceId)` — each member has a `roles: string[]` |
| Update a member's roles | `sdkAdmin.adminWorkspaces.update(workspaceId, { members: [...] })` (admin SDK) |
| List defined roles | `sdkAdmin.roles.getExistingRoles()` (admin SDK) |
| Gate access in a backend route | Check `req.user.roles` against the route's required roles inside your service |

A first-class `sdk.permissions.check()` / `sdk.permissions.getUserPermissions()` API is on the [roadmap](https://github.com/qelos/qelos/blob/main/ROADMAP.md). Until then, derive permissions from the user's roles plus your application's role-to-capability mapping.

```typescript
// Pattern: capability gate built on top of roles
const me = await sdk.authentication.getLoggedInUser();
const canManageBilling = me.roles.includes('admin') || me.roles.includes('billing');
```

---

## Events

The events log is exposed through the **administrator SDK** (`sdkAdmin.events`). Use it to read the tenant's event stream and to emit custom events from server-side workflows.

```typescript
import QelosAdminSDK from '@qelos/sdk/administrator';

const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://your-app.qelos.app',
  fetch: globalThis.fetch,
});
await sdkAdmin.authentication.oAuthSignin({ username, password });
```

### `sdkAdmin.events.getList(params?)`

| | |
|---|---|
| **Signature** | `sdkAdmin.events.getList(params?: { page?: number; kind?: string; eventName?: string; source?: string; user?: string; workspace?: string; period?: string }): Promise<IQelosEvent[]>` |
| **Returns** | Events ordered by `created`. Combine `kind` (e.g. `'system'`, `'user'`) with `eventName` to scope. |

```typescript
const recentSignins = await sdkAdmin.events.getList({
  eventName: 'user.signin',
  period: '24h',
});
```

### `sdkAdmin.events.dispatch(payload)`

| | |
|---|---|
| **Signature** | `sdkAdmin.events.dispatch(payload: Partial<IQelosEvent>): Promise<void>` |
| **Required fields in `payload`** | At minimum `kind`, `eventName`, `source`. `user`, `workspace`, `metadata`, and `description` are optional. |

```typescript
await sdkAdmin.events.dispatch({
  kind: 'app',
  source: 'billing-worker',
  eventName: 'invoice.paid',
  description: 'Customer paid invoice INV-204',
  metadata: { invoiceId: 'INV-204', amount: 4900 },
  workspace: ws._id,
  user: me._id,
});
```

> A public-SDK `sdk.events` namespace (with `.list`, `.emit`, `.subscribe`) is on the roadmap. The admin SDK above is the supported surface today.

---

## Putting It Together

A short end-to-end snippet that touches every module:

```typescript
import QelosSDK from '@qelos/sdk';
import QelosAdminSDK from '@qelos/sdk/administrator';

const sdk = new QelosSDK({ appUrl, fetch: globalThis.fetch, forceRefresh: true });

// 1. Auth
await sdk.authentication.oAuthSignin({ username, password });
const me = await sdk.authentication.getLoggedInUser();

// 2. Pick a workspace
const [ws] = await sdk.workspaces.getList();
await sdk.workspaces.activate(ws._id);

// 3. Query entities with the query builder
const products = sdk.blueprints.entitiesOf<{ name: string; price: number }>('products');
const cheap = await products.getList({
  'price[$lt]': 50,
  $sort: '-created',
  $limit: 10,
});

// 4. Stream a chat against an agent (integration)
const stream = await sdk.ai.chat.stream('support-bot', {
  messages: [{ role: 'user', content: `Summarise these products: ${cheap.map(p => p.name).join(', ')}` }],
});
for await (const chunk of sdk.ai.chat.parseSSEStream(stream)) {
  const delta = chunk.choices?.[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}

// 5. Log an event from a back-office worker (admin SDK)
const sdkAdmin = new QelosAdminSDK({ appUrl, fetch: globalThis.fetch });
await sdkAdmin.authentication.oAuthSignin({ username: adminUser, password: adminPass });
await sdkAdmin.events.dispatch({
  kind: 'app',
  source: 'product-summariser',
  eventName: 'products.summarised',
  user: me._id,
  workspace: ws._id,
  metadata: { count: cheap.length },
});
```
