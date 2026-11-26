# @qelos/testing

A mock Qelos HTTP API for local development with **no connected Qelos tenant**. Framework-agnostic, zero runtime dependencies, web-standard `Request`/`Response`.

```ts
import { createMockQelos } from '@qelos/testing';

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
| `seed` | Inline `{ users, workspaces, personas, roles, blueprints, entities, configurations, blocks, pricingPlans, coupons, subscriptions, invoices, ... }`. |
| `strictPermissions` | Treat calls without credentials (or with ones the mock never issued) as guests on data, content, agent and webhook routes. Default `false`. |
| `defaultPersona` | Id or email of the auto-logged-in user (see [Authentication](#authentication-users-workspaces-and-permissions)). |
| `auth` | `{ accessTokenTtlMs, refreshTokenTtlMs, cookieTokenTtlMs, personalWorkspace, defaultRole }` — token lifetimes (5h / 30d / 30d), create a personal workspace on sign-up (default `false`), role of new users (default `user`). |
| `tenant` | `{ name, appUrl, ... }`. |
| `allowInProduction` | Required to run with `NODE_ENV=production` (otherwise it throws). |

## Environment

`resolveMockConfig(env, explicit)` reads `QELOS_MOCK`: `1`/`true` enables the in-memory mock; any other value (except `0`/`false`) is treated as the `dataDir`. Explicit options win over env.

## State

`mock.state` exposes typed collections (`users`, `workspaces`, `memberships`, `sessions`, `apiTokens`, `personas`, `blueprints`, `configurations`, `blocks`) and `entities` (by blueprint), plus `reset()`, `snapshot()` and `flush()`. Ids are 24-hex Mongo-like strings.

## Authentication, users, workspaces and permissions

Built-in routes return the shapes the real `/apps/auth` service returns, so `@qelos/sdk` works unmodified against `mock.fetch` (or `mock.handle` behind your own server). Custom `routes` modules are registered first and can override any of them.

| Area | Endpoints |
|---|---|
| Sign in / up | `POST /api/signin`, `POST /api/signup` — default `cookie` flow (sets the `qlt_<tenant>` cookie, `HttpOnly; Path=/api`) or `authType: 'oauth'` (returns `token` + `refreshToken`) |
| Sessions | `POST /api/token/refresh` (rotating, single-use refresh token), `POST /api/cookie/refresh`, `POST /api/logout`, `POST /api/auth/callback?rt=` |
| Social stub | `GET /api/auth/:provider` and `/callback` (`linkedin`, `facebook`, `google`, `github`) sign in the selected persona (or the default one) and redirect to `returnUrl?rt=<refreshToken>` — no provider round trip. `returnUrl` is a path, or a URL on the same machine as the mock; a same-origin one is returned as a path, so it also works behind a dev proxy |
| Profile | `GET`/`POST /api/me` (name, birth date, image, metadata, password) |
| API tokens | `GET`/`POST /api/me/api-tokens`, `DELETE /api/me/api-tokens/:id` (ten per user); authenticate with `x-api-key` (+ optional `x-workspace`) |
| Workspaces | `/api/workspaces` (list, create), `/api/workspaces/all`, `/:id` (get, update, delete), `/:id/members` (list, add), `/:id/members/:userId` (roles, remove), `/:id/activate`, `/:id/encrypted` (admins) |
| Invites | invite by updating `invites` on the workspace (`sdk.workspaces.inviteUser`); `GET`/`POST /api/invites` to list and accept/decline |
| Roles | `GET /api/roles` (admins; the roles users have) |
| Impersonation | an admin sending `x-impersonate-user` (and `x-impersonate-workspace`) is seen as that user by every service, and keeps access to the user and workspace administration routes |
| Personas | `GET /api/mock/personas`, `POST`/`DELETE /api/mock/persona` (selector cookie) |

Tokens are opaque, unsigned-JWT-shaped (`alg: none`) strings backed by a stored session (`state.sessions`), so they expire, rotate and can be revoked; they survive a restart when `dataDir` is set. Validation mirrors the real service: bad credentials → `401 { errors: { general: { message } } }`, empty password → `401 { errors: { password: { code: 'EMPTY_PASSWORD' } } }`, sign-up form errors and `DUPLICATED_EMAIL` → `200 { errors }`. Passwords are stored hashed.

### Personas

```ts
createMockQelos({
  dataDir: './.qelos-mock',
  defaultPersona: 'admin@example.com', // id or email
  seed: {
    personas: [
      {
        email: 'admin@example.com',
        password: 'admin-pass', // optional: omitted -> any non-empty password signs in
        name: 'Ada Admin',
        roles: ['admin'],
        metadata: {},
        workspaces: [{ name: 'Acme', labels: ['company'], roles: ['admin', 'user'] }], // or { _id }
      },
    ],
  },
});
```

Personas are regular users (they can also sign in with their password). Workspaces are created on first use and shared by name/id between personas; memberships are seeded once and then owned by the persisted state.

A persona can also carry the settings of a local setup, in code or in `<dataDir>/personas.json`:

```json
[
  { "email": "admin@example.com", "roles": ["admin"], "apiTokens": ["ql_local_dev_only"] },
  { "email": "member@example.com", "roles": ["user"], "default": true }
]
```

- `default: true` (one persona) is `defaultPersona` written next to the persona; the option wins over it.
- `apiTokens` are made-up tokens that act as the persona, for server code that calls Qelos with one. They do not expire and are never written to `state/`.

Both are read on every start, also over a saved state. A persona whose `email` is the login of a user in an imported `users.json` **is** that user: same `_id` and records, with the persona's own fields winning.

With `defaultPersona`, every request **without credentials** behaves as that logged-in user, so `sdk.authentication.getLoggedInUser()` works with no sign-in (note: in Node, give the SDK an `extraHeaders: async () => ({})` so it does not try to refresh a missing token first). Per request, `x-qelos-mock-persona: <id|email>` (or the `qelos_mock_persona` cookie, set by `POST /api/mock/persona`) overrides it, and wins over any other credentials. The auth, workspace, user and thread routes reject *invalid or expired* credentials and do not downgrade them to the default persona (for data and content routes see [Permissions on data and content](#permissions-on-data-and-content)); an unknown persona gives `401`.

### Tenant settings

Seed the tenant's own configuration documents to test its rules. Without them the mock allows these actions.

| `configurations` key | Effect |
|---|---|
| `auth-configuration` | `allowUserTokenAuthentication` and `tokenAuthenticationPermissions` (`roles`, `wsRoles`) decide who may manage API tokens: **once the document exists, a tenant has to allow it** |
| `workspace-configuration` | `isActive: false` signs users in without a workspace; `creationPrivilegedRoles`, `allowNonLabeledWorkspaces` and `labels` (with `allowedRolesForCreation`) limit who creates workspaces, and with which labels |

### Permission helpers

The auth service has no endpoints for checking permissions. For your own mock routes, `checkPermission` and `getUserPermissions` evaluate the user's roles against the role → permission map `seed.roles`, merged over the defaults (`admin`/`plugin`: `['*']`, `user`: `me:*, workspaces:*, invites:*, entities:*`, `member`: `me:*, workspaces:read, entities:read`). Patterns support `*` and `prefix:*`.

```ts
createMockQelos({ seed: { roles: { admin: ['*'], editor: ['posts:*'], viewer: ['posts:read'] } } });
```

### `authenticate` for other route modules

```ts
import { authenticate, checkBlueprintPermission, scopeMatches, unauthorized, type RouteModule } from '@qelos/testing';

const entitiesRoutes: RouteModule = (router, state) => {
  router.register('GET', '/api/blueprints/:bp/entities', ({ request, params }) => {
    const auth = authenticate(request, state); // { user, workspace, session, isApiToken } | null
    const blueprint = state.blueprints.findOne((b) => b.identifier === params.bp);
    if (!blueprint) return new Response(null, { status: 404 });
    const scope = checkBlueprintPermission(auth, state, blueprint, 'read'); // 'user' | 'workspace' | 'tenant' | null
    if (!scope) return auth ? new Response(null, { status: 403 }) : unauthorized();
    return state.entities.list(params.bp).filter((e) => scopeMatches(auth, scope, e));
  });
};
```

`authenticate` resolves persona override → `x-api-key` → cookie token → bearer access token → `defaultPersona`, then applies an administrator's impersonation headers. `checkBlueprintPermission` evaluates the blueprint's `permissions` descriptors (`guest`, `roleBased`, `workspaceRoleBased`, `workspaceLabelsBased`) and returns the effective `permissionScope`; `scopeMatches` checks the entity's `user` / `workspace` owner against it.

Workspaces keep `members` (`{ user, roles }`) and `invites` embedded, like the real service; the `memberships` collection is reserved and unused by the auth routes.

## Importing Qelos CLI artifacts

`importQelosArtifacts(dir, state, opts)` loads a folder produced by `qelos pull` and/or `qelos dump` (`/tools/cli`) into the mock state. It auto-detects the layout, so `dir` can be a `pull` output, a `dump` output, a mix of both, or a single-type folder (e.g. only the `blueprints/` folder).

```ts
import { importQelosArtifacts, MockState } from '@qelos/testing';

const report = importQelosArtifacts('./qelos-export', new MockState(), { onConflict: 'replace', warn: console.warn });
// report.kind: 'pull' | 'dump' | 'mixed' | 'empty'; report.counts: per collection { created, replaced, skipped }
```

- **At startup**: `createMockQelos({ dataDir })` (or `artifactsDir`, which wins over `dataDir`) imports once, when no persisted `dataDir/state/*.json` exists yet. After that the persisted state wins, so edits to the mock survive restarts. Pass `reimport: true` to import again on top of persisted state.
- **`onConflict`**: `'replace'` (default) overwrites a matching document; `'skip'` keeps the existing one. Documents match by `_id`, or by their natural key (see table). Re-importing never duplicates.
- **Ids**: `_id`s from the files are preserved. Files that have none (blueprints, configs, plugins, ...) get a deterministic 24-hex id derived from their key, so re-imports stay stable.
- **Logging**: only file names and counts are logged, never file contents. Unknown files are reported through the `debug` callback; problems (unparsable files, entities of unknown blueprints) through `warn`.

### On-disk layout produced by the CLI

`qelos pull all <dir>` writes one folder per type; `qelos pull <type> <dir>` writes the same files directly into `<dir>`. `qelos dump users|workspaces|blueprints` writes into `./dump` by default.

| Path | Written by | Format | State collection | Match key |
|---|---|---|---|---|
| `blueprints/<identifier>.blueprint.json` | `pull blueprints` | `{ identifier, name, description, properties, relations, dispatchers, permissions, permissionScope, entityIdentifierMechanism, limitations }` (no `_id`) | `blueprints` | `identifier` |
| `configs/<key>.config.json` | `pull configs` | the configuration without `_id`/`tenant`; `$ref` fields (`ssr-scripts`: `head`/`body`, `users-header`: `html`) point to `configs/html/*.html` and are inlined | `configurations` | `key` |
| `components/components.json` + `components/<identifier>.vue\|.ts` | `pull components` | metadata map `{ _id, componentName?, identifier, description }`; source in the sibling file (`.vue` = component, `.ts` = script, may be nested) | `components` (`content`, `type: 'component'\|'script'`) | `identifier` |
| `blocks/blocks.json` + `blocks/<kebab-name>.html` | `pull blocks` | map `{ _id, name, description, contentType }`; `content` from the html file | `blocks` | `name` |
| `plugins/<apiPath>.plugin.json` (+ `plugins/micro-frontends/*.html`) | `pull plugins` | plugin without `_id`; each micro-frontend `structure: { $ref }` is inlined | `plugins` | `apiPath` |
| `connections/<name>.connection.json` | `pull connections` | `{ _id, name, kind, labels, metadata, authentication: { $var: 'ENV_NAME' } }` (the secret itself is never pulled) | `connections` | `name` |
| `integrations/<name>.integration.json` (+ `integrations/prompts/*.md`) | `pull integrations` | `{ _id, kind, trigger, target, dataManipulation, active }`; `source: { $refId: '../connections/x.connection.json' }` is resolved to the connection `_id`, prompt `$ref`s are inlined | `integrations` (lambdas and AI agents are integrations) | `_id` |
| `pricing-plans/<name>.pricing-plan.json` | `pull pricing-plans` | plan without `tenant`/`created` | `pricingPlans` | `name` |
| `users.json` | `dump users` | array of users without `tenant`/`__v` | `users` | `_id`, `email`, `username` |
| `workspaces.json` | `dump workspaces` | array of workspaces without `tenant`/`__v` | `workspaces` | `name` |
| `entities/<blueprint>/page-<n>.json` (or `<group>.page-<n>.json` with `--group`) | `dump blueprints` | array of entities without `tenant`/`__v`/`indexes`/`id` | entities of `<blueprint>` | `_id`, `identifier` |

Notes:

- Entities are attached to their blueprint by identifier. If the blueprint is not in the state (neither imported from `blueprints/` nor already present) the folder is skipped with a warning, so import blueprints first or use a mixed folder.
- When `users.json`/`workspaces.json` existed at dump time, `dump` replaces entity `user`/`workspace` ids with the username / workspace name. The importer maps them back to ids using the imported users and workspaces.
- Secret-bearing user fields (`password`, `salt`, `token`, `tokens`, `refreshToken`, `resetToken`, `resetPasswordToken`) are dropped on import. Connection `authentication` placeholders are kept as-is.

### Ignored

`state/` (the mock's own persisted state), `qelos.config.*`/CLI config files, remote (`http(s)`) `$ref`s (never fetched), `$ref`s that resolve outside the artifacts folder, `.vue`/`.ts` files not listed in `components.json`, `.html` files not listed in `blocks.json`, entity files that are not JSON arrays, and any other unrecognised file or folder (reported through the `debug` callback).

## Built-in endpoints

`createMockQelos` registers the Qelos API surface used by `@qelos/sdk` (pass `builtinRoutes: false` to opt out). Paths you register through `routes` or `mock.on` take precedence.

### Blueprint entities - `sdk.entities('<blueprint>')`

`/api/blueprints/:blueprint/entities` mirrors the no-code service:

| Endpoint | Notes |
|---|---|
| `GET .../entities` | filters on properties (`kind=a`, `price[$gt]=3`, `$in`, `$ne`, `$regex`, `$exists`...), system fields (`user`, `workspace`, `identifier`, `created`), `$q`/`$qProps`, `$sort` (`-price,name`, default `created`), `$limit`, `$skip`, `$page` (`$skip` wins; paging without `$limit` uses 1000), `$populate` (user, workspace, relations), `$outerPopulate`, `$flat` |
| `GET .../entities/:id` | by `identifier` |
| `POST .../entities` | validates against the blueprint `properties` (type, `required`, `enum`, `min`/`max`, `multi`, relation targets) - `406 { message }` on failure. Values are judged as by the service: `null` is a value (refused for text, stored as `0` or `false` for numbers and booleans), a missing required property is refused by its type, and objects hold text values unless the property has a `schema`. A `schema` is checked with the optional [`ajv`](https://www.npmjs.com/package/ajv) package, version 8 (`npm install --save-dev ajv@8`); without it the mock warns once and checks only the schema's `type` |
| `PUT .../entities/:id` | merges the changes into the existing properties and re-validates |
| `DELETE .../entities/:id`, `DELETE .../entities/all` | |
| `GET /api/blueprints/:blueprint/charts/count`, `pie`, `sum`, `:chartType` | `sdk.entities(...).count()` and `sdk.blueprints.getChart` / `getPieChart` / `getSum`. Properties filter by name, as when listing |

Entities carry `identifier`/`id`, `user`, `workspace`, `created`, `updated` and are returned flat (properties at the top level) unless `$flat=false`. A blueprint's `limitations` refuse creating one entity too many (`403 reached limit of allowed entities`). A blueprint with `dispatchers` adds a platform event on create, update or delete (`source: 'blueprints'`), without running subscribers or integrations. A blueprint's `updateMapping` is calculated on create and update when the optional [`node-jq`](https://www.npmjs.com/package/node-jq) package is installed (`npm install --save-dev node-jq`); without it the mock warns once and leaves those properties as sent. Not mirrored: the rate limit on guest writes.

#### Permissions on data and content

Entity, content, agent and webhook routes resolve the caller in this order:

1. the `x-qelos-mock-persona` header or `qelos_mock_persona` cookie (a persona/user id or email)
2. the signed-in user: a bearer access token, session cookie or API token issued by the mock
3. a guest, for a mock token that expired or was signed out
4. the `defaultPersona` option

The blueprint `permissions` / `permissionScope` are then enforced like the real service: the `admin` role bypasses them, `user`/`workspace` scopes restrict which entities can be read or changed, and a blueprint without permissions is open to admins only. Content and agent writes need an admin.

**Without any of the four, permissions are not enforced** (everything is allowed): no credentials at all, or ones the mock never issued, such as a made-up API token. The real service treats that caller as a guest; `strictPermissions: true` does the same. The `authenticate` option replaces this whole resolution.

An admin who sends `bypassAdmin` (body, `?bypassAdmin=true` or the `x-bypass-admin` header) is treated as a regular user on entity routes. The administrator SDK sends it by default.

### Other endpoints

| Area | Endpoints |
|---|---|
| Blueprints | `GET /api/blueprints[/:identifier]` for signed-in users, without permissions and other settings unless admin or `plugin` (`null` when unknown); `POST`, `PUT`, `PATCH`, `DELETE` for admins and plugins, checked and stored as by the service: `identifier` and `name` are required, properties without a `title` and `type` and unknown fields are dropped, at most 5 properties are `indexed`. One with entities cannot be removed; removing an unknown one answers `null` |
| Configurations | `GET /api/configurations/:key` for anyone when public (the default), else admins (`404` for others); the list (no metadata), `POST`, `PUT /:key` (description and metadata, merged) and `DELETE /:key` for admins |
| Blocks | `GET /api/blocks/:id` for anyone (`_id` and `content` only, unless editor); the list and writes for the `editor`, `plugin` and `admin` roles |
| Scripts and components | `/api/scripts[/:id]`, `/api/scripts/bulk` and the older `/api/components[/:id]`, `/api/components/bulk` for admins and plugins. Nothing is compiled: an invalid source is accepted, `requiredProps` stays empty and there is no `compiledContent` |
| Drafts | `GET`/`PUT`/`DELETE /api/drafts` (one per `contextType` and `contextId`) and `GET /api/drafts/all`: every signed-in user's own. As in the service, `GET /api/drafts` without a context is `404` |
| AI | `/api/ai/agents` CRUD for admins and plugins (a regular user's list fails with `500`, as in the service); `POST`/`GET /api/ai/agents/:id/chat` for signed-in users and `/api/ai/:id/chat-completion[/:threadId]`, both limited to the agent's `roles`, `workspaceRoles` and `workspaceLabels` (a guest needs the `guest` role). Answers come from `mock.ai`, then seed `aiResponses` (`[{ agentId?, match?, content }]`, first match wins), or echo `Mock response: <message>`; tool calls and `clientTools` are answered like the service |
| AI storage (RAG) | `POST /api/ai/sources/:id/storage[/upload|/clear]` for admins; no provider is called, stores and files are in the `vectorStores` collection |
| AI threads | `GET`/`POST /api/ai/threads`, `GET`/`DELETE /api/ai/threads/:id` - own threads, all for admins; chats are recorded in them (agents with `recordThread`, and every `agents/:id/chat`) |
| Users (admin) | `GET /api/users[/stats\|/:id]`, `POST`, `PUT /:id`, `DELETE /:id`, `GET`/`POST /:id/encrypted` - admins only (`401` otherwise) |
| Events | `GET /api/events` (`{ events, total, page, limit, totalPages }`; filters `kind`, `eventName`, `source`, `user`, `workspace`, `search`, `period` (default `last-week`), `from`/`to`; `page` from 0, `limit` up to 100) and `GET /api/events/:id` (`null` when unknown) for admins; `POST /api/events` for admins and the `plugin` role, answering with no body. Refused callers get `401` |
| MCP sign-in | `GET /api/auth/mcp/authorize` sends a signed-in user (or `?persona=`) straight back to the app, with a code when PKCE is used, and `POST /api/auth/mcp/token` exchanges it. A seeded `mcp-configuration` limits it (`enabled`, `permittedCallbackUrls`); without one any address is accepted. The approval page and client registration are not mirrored |
| Webhooks | `/api/webhooks/:integrationId` - any method, signed-in users; answers the seed `lambdas` entry `{ integrationId, method?, response, status?, roles?, workspaceLabels? }` (`403` without them) or `{}` |
| Integrations | `/api/integrations[/:id]` for admins and plugins: ends are checked against the kind of their connection, unknown details are dropped, list filters as in the service, `$populate` on one. Agents are integrations triggered by `chatCompletion`, so both APIs show them |
| Connections | `/api/integration-sources[/:id]` for admins and plugins: `metadata` is validated per kind and secrets are neither answered nor kept (only which one was given). `POST .../status` answers `connected` when the settings and credentials it needs are there; no provider is called |
| Functions | `/api/lambdas/:sourceId[/:name]` for admins, on `aws` and `cloudflare` connections, kept in `functions` (`[{ sourceId, name, ... }]`). Nothing is deployed, and `.../execute` is not mirrored |
| Plugins | `GET /api/plugins` for anyone (all settings but the token for admins, a few for others), `GET /api/plugins/:id` for admins and plugins, writes for admins. Manifests and callbacks are not fetched |
| Payments | plans, coupons, subscriptions, invoices, checkout and `/api/payments/configuration`, following the payments service; no provider is called - report results with `mock.payments.pay/fail/cancel` |
| Secrets | none: the secrets service is internal and apps cannot call it |

Writes made by admins/personas land in `mock.state`, so they persist when `dataDir` is set. The seed accepts `components`, `scripts`, `drafts`, `events`, `agents`, `aiResponses`, `lambdas`, `integrations`, `connections`, `plugins`, `functions`, `threads`, `pricingPlans`, `coupons`, `subscriptions` and `invoices` in addition to the collections above.

## State management API

Mounted under `/__qelos_mock__/` only when the mock is `enabled` (dev only, never in production - see `allowInProduction`):

| Endpoint | |
|---|---|
| `GET /__qelos_mock__/state` | snapshot of all collections and entities |
| `POST /__qelos_mock__/reset` | drop everything and reseed from the configured seed |
| `POST /__qelos_mock__/seed` | body is a seed; documents are merged (upsert by `_id`) |
| `PUT /__qelos_mock__/collections/:name` | replace a collection with the JSON array body; `:name` is a collection (`blocks`, `users`...) or `entities.<blueprint>` |
| `POST /__qelos_mock__/payments/:subscriptionId/pay` | report a payment (`/fail`, `/cancel` too), like `mock.payments` |
| `GET /__qelos_mock__/routes` | registered `{ method, path }` list |

The same state is available programmatically as `mock.state` (`mock.state.entities.insert('todo', {...})`, `mock.state.seed(seed)`, `mock.state.reset()`, `await mock.state.flush()`).

## Extension hooks and fallback

```ts
const mock = createMockQelos({
  // answer anything the built-ins don't; return nothing to fall through to the 404
  onMissing: (req) => (new URL(req.url).pathname === '/api/foo' ? Response.json({ foo: 1 }) : undefined),
  // custom identity for data and content routes; return null for "no identity" (permissions not enforced)
  authenticate: (req, state) => {
    const persona = state.resolvePersona(req.headers.get('x-user') ?? '');
    return persona ? { ...persona, roles: persona.roles ?? [] } : null;
  },
});
mock.on('GET', '/api/foo/:id', ({ params }) => ({ id: params.id })); // takes precedence over built-ins
```

Handlers may return a `Response` or any JSON value, and can `throw new MockHttpError(status, message)`. Routes nobody handles answer `404 { code: 'QELOS_MOCK_NOT_IMPLEMENTED', method, path, message }`.

## Standalone server (`serve`)

For non-Node hosts (e.g. the Python FastAPI integrator) the package ships a
minimal CLI that exposes the mock over HTTP:

```sh
npx @qelos/testing serve --dir ./qelos-mock --port 4555   # --port 0 picks a free port; --host defaults to 127.0.0.1; --strict turns on strictPermissions
```

It prints `QELOS_MOCK_READY http://<host>:<port>` once listening and answers
`GET /__qelos_mock__/health` with `{"ok":true}`. Stop it with SIGINT/SIGTERM.
