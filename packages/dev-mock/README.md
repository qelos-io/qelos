# @qelos/dev-mock

A mock Qelos HTTP API for local development with **no connected Qelos tenant**. Framework-agnostic, zero runtime dependencies, web-standard `Request`/`Response`.

```ts
import { createMockQelos } from '@qelos/dev-mock';

const mock = createMockQelos({ dataDir: './.qelos-mock', seed: { users: [{ email: 'dev@example.com' }] } });
const response = await mock.handle(new Request('http://localhost/api/me'));
// or use `mock.fetch` as a drop-in `fetch`
```

Unknown routes return `404 { code: 'QELOS_MOCK_NOT_IMPLEMENTED', message }`. Route modules (`routes: [(router, state) => ...]`) register handlers with `router.register(method, pattern, handler)`; patterns support `:param` and a trailing `*`.

## Options

| Option | Description |
|---|---|
| `enabled` | Enable the mock (default `true` for `createMockQelos`). |
| `dataDir` | Folder holding state JSON (`state/*.json`) and optional dump/pull artifacts. |
| `persist` | Persist state to `dataDir/state` (default `true` when `dataDir` is set). Writes are debounced and atomic. |
| `seed` | Inline `{ users, workspaces, personas, blueprints, entities, configurations, blocks }`. |
| `defaultPersona` | Id or email of the auto-logged-in user. |
| `tenant` | `{ name, appUrl, ... }`. |
| `allowInProduction` | Required to run with `NODE_ENV=production` (otherwise it throws). |

## Environment

`resolveMockConfig(env, explicit)` reads `QELOS_MOCK`: `1`/`true` enables the in-memory mock; any other value (except `0`/`false`) is treated as the `dataDir`. Explicit options win over env.

## State

`mock.state` exposes typed collections (`users`, `workspaces`, `memberships`, `sessions`, `personas`, `blueprints`, `configurations`, `blocks`) and `entities` (by blueprint), plus `reset()`, `snapshot()` and `flush()`. Ids are 24-hex Mongo-like strings.

## Built-in endpoints

`createMockQelos` registers the Qelos API surface used by `@qelos/sdk` (pass `builtinRoutes: false` to opt out). Paths you register through `routes` or `mock.on` take precedence.

### Blueprint entities - `sdk.entities('<blueprint>')`

`/api/blueprints/:blueprint/entities` mirrors the no-code service:

| Endpoint | Notes |
|---|---|
| `GET .../entities` | filters on properties (`kind=a`, `price[$gt]=3`, `$in`, `$ne`, `$regex`, `$exists`...), system fields (`user`, `workspace`, `identifier`, `created`), `$q`/`$qProps`, `$sort` (`-price,name`, default `created`), `$limit`, `$skip`, `$page` (`$skip` wins; paging without `$limit` uses 1000), `$populate` (user, workspace, relations), `$outerPopulate`, `$flat` |
| `GET .../entities/:id` | by `identifier` |
| `POST .../entities` | validates against the blueprint `properties` (type, `required`, `enum`, `min`/`max`, `multi`, relation targets) - `406 { message }` on failure |
| `PUT .../entities/:id` | merges the changes into the existing properties and re-validates |
| `DELETE .../entities/:id`, `DELETE .../entities/all` | |
| `GET /api/blueprints/:blueprint/charts/count` | `sdk.entities(...).count()` |

Entities carry `identifier`/`id`, `user`, `workspace`, `created`, `updated` and are returned flat (properties at the top level) unless `$flat=false`. Not mirrored: blueprint `limitations`, `updateMapping`, the other chart types and platform events.

**Permissions.** The caller is resolved with `authenticate(request, state)` (default: the `x-qelos-mock-persona` header - a persona/user id or email - then the `defaultPersona` option). With a persona the blueprint `permissions` / `permissionScope` are enforced like the real service (`admin` role bypasses them, `user`/`workspace` scopes restrict which entities can be read/changed). **With no persona at all permissions are not enforced** (everything is allowed): `authenticate` is the hook to change that.

### Other endpoints

| Area | Endpoints |
|---|---|
| Blueprints | `GET /api/blueprints[/:id]`; `POST`, `PUT /:id`, `DELETE /:id` for admins |
| Configurations | `GET`/`PUT /api/configurations/app-configuration` (PUT merges `metadata`); `/api/configurations[/:key]` CRUD (non-public ones readable by admins only) |
| Blocks / components | `/api/blocks[/:id]`, `/api/components[/:id]` - read for all, write for admins |
| AI | `/api/ai/agents` CRUD from seed `agents`; `POST /api/ai/agents/:id/chat`, `GET .../chat` (SSE) and `/api/ai/:id/chat-completion[/:threadId]` answer from seed `aiResponses` (`[{ agentId?, match?, content }]`, first match wins) or echo `Mock response: <message>` |
| Events | `GET /api/events` (filters `kind`, `eventName`, `source`, `user`, `workspace`, `search`, `from`/`to`, `page`/`limit`), `GET /api/events/:id`, `POST /api/events` (stored in memory) |
| Lambdas | `/api/webhooks/:integrationId` - any method; answers the seed `lambdas` entry `{ integrationId, method?, response, status? }` or `{}` |
| Payments | `GET /api/plans/public` and `/api/invoices` are empty; no plan or subscription exists |
| Secrets | never returned (`GET` is empty/404) and never stored |

Writes made by admins/personas land in `mock.state`, so they persist when `dataDir` is set. The seed accepts `components`, `events`, `agents`, `aiResponses` and `lambdas` in addition to the collections above.

## State management API

Mounted under `/__qelos_mock__/` only when the mock is `enabled` (dev only, never in production - see `allowInProduction`):

| Endpoint | |
|---|---|
| `GET /__qelos_mock__/state` | snapshot of all collections and entities |
| `POST /__qelos_mock__/reset` | drop everything and reseed from the configured seed |
| `POST /__qelos_mock__/seed` | body is a seed; documents are merged (upsert by `_id`) |
| `PUT /__qelos_mock__/collections/:name` | replace a collection with the JSON array body; `:name` is a collection (`blocks`, `users`...) or `entities.<blueprint>` |
| `GET /__qelos_mock__/routes` | registered `{ method, path }` list |

The same state is available programmatically as `mock.state` (`mock.state.entities.insert('todo', {...})`, `mock.state.seed(seed)`, `mock.state.reset()`, `await mock.state.flush()`).

## Extension hooks and fallback

```ts
const mock = createMockQelos({
  // answer anything the built-ins don't; return nothing to fall through to the 404
  onMissing: (req) => (new URL(req.url).pathname === '/api/foo' ? Response.json({ foo: 1 }) : undefined),
  // custom identity, return null for "no identity" (permissions not enforced)
  authenticate: (req, state) => state.resolvePersona(req.headers.get('x-user') ?? '') ?? null,
});
mock.on('GET', '/api/foo/:id', ({ params }) => ({ id: params.id })); // takes precedence over built-ins
```

Handlers may return a `Response` or any JSON value, and can `throw new MockHttpError(status, message)`. Routes nobody handles answer `404 { code: 'QELOS_MOCK_NOT_IMPLEMENTED', method, path, message }`.
