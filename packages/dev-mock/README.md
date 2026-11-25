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
