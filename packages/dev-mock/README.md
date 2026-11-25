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

## Importing Qelos CLI artifacts

`importQelosArtifacts(dir, state, opts)` loads a folder produced by `qelos pull` and/or `qelos dump` (`/tools/cli`) into the mock state. It auto-detects the layout, so `dir` can be a `pull` output, a `dump` output, a mix of both, or a single-type folder (e.g. only the `blueprints/` folder).

```ts
import { importQelosArtifacts, MockState } from '@qelos/dev-mock';

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
