---
title: Develop locally without a Qelos tenant
editLink: true
---

# Develop locally without a Qelos tenant

Qelos integrators normally proxy `/api/**` to a real Qelos tenant. In **mock mode** they answer from
[`@qelos/testing`](https://github.com/qelos-io/qelos/tree/main/packages/testing) instead: a local
mimic of the Qelos HTTP API (sign up / sign in, sessions, personas, workspaces, blueprint entities, ...)
whose state lives in plain JSON files. No network, no account, no tenant.

## Concept

```
browser ──► your app (Express + @qelos/integrator-express)
                 ├─ non-/api routes: req.qelos.user / workspace / sdk   ─┐
                 └─ /api/**  ──────────────────────────────────────────► @qelos/testing ──► <folder>/state/*.json
```

Everything is driven by **one folder** (default `./qelos-mock`):

| Path | What it is |
|---|---|
| `personas.json` | Users you can act as, with roles and workspace labels/roles. |
| `workspaces.json` | Workspaces (`qelos dump workspaces` format). |
| `blueprints/`, `configs/`, `components/`, `blocks/`, `plugins/`, ... | Output of `qelos pull`. |
| `users.json`, `entities/<blueprint>/page-N.json` | Output of `qelos dump`. |
| `state/*.json` | The mock's own persisted state. Created and updated by the mock. |

## Quick start

```bash
npm i -D @qelos/testing
qelos mock init            # scaffolds ./qelos-mock
QELOS_MOCK=./qelos-mock npm run dev
```

`qelos mock init [dir]` writes `personas.json` (admin, member and guest examples), `workspaces.json`, an
empty `state/` and a README. With a tenant available you can fill the folder in the same step:

```bash
qelos mock init ./qelos-mock --pull   # also runs `qelos pull all ./qelos-mock`
qelos mock init ./qelos-mock --dump   # also dumps users, workspaces and all blueprint entities
```

Existing files are never overwritten unless you pass `--force`. `qelos mock serve [dir] [--port] [--host]`
runs the mock as a standalone HTTP server (it prints `QELOS_MOCK_READY http://127.0.0.1:<port>`), useful for
non-Node apps or for pointing any integrator's `appUrl` at it. `qelos init` also prints the
`QELOS_MOCK=./qelos-mock` hint for the detected framework.

## Persona file format

`personas.json` is a JSON array. A persona is a regular user that can also sign in with its password.

```json
[
  {
    "email": "admin@example.com",
    "password": "choose-a-throwaway-password",
    "name": "Ada Admin",
    "roles": ["admin"],
    "metadata": {},
    "workspaces": [{ "name": "Acme", "labels": ["company"], "roles": ["admin", "user"] }]
  }
]
```

| Field | Notes |
|---|---|
| `email` | Required. Used to sign in and as the persona id (`x-qelos-mock-persona: admin@example.com`). |
| `password` | Optional. If omitted, any non-empty password signs in. Stored hashed. |
| `roles` | Global roles (`admin`, `user`, `member`, or your own from `seed.roles`). |
| `workspaces` | `{ name, labels, roles }` memberships. Workspaces are shared between personas by name. |

Switch persona per request with the `x-qelos-mock-persona` header, or with the `qelos_mock_persona` cookie
set by `POST /api/mock/persona` (`GET /api/mock/personas` lists them). Set `defaultPersona` to be logged in
automatically.

## Seed config

Instead of (or in addition to) files you can pass a seed in code. Explicit `seed.personas` win over
`personas.json` by email.

```ts
createQelosIntegrator({
  config: {
    appUrl: '',
    mock: {
      dataDir: './qelos-mock',
      defaultPersona: 'admin@example.com',
      seed: {
        roles: { editor: ['posts:*'] },
        blueprints: [{ identifier: 'todo', name: 'Todo', properties: { title: { type: 'string' } } }],
        entities: { todo: [{ title: 'First' }] },
      },
    },
  },
});
```

## Importing `pull` / `dump` artifacts

On first start the mock imports whatever `qelos pull` and `qelos dump` produced in the folder:

```bash
qelos pull all ./qelos-mock                     # blueprints, configs, components, blocks, plugins, ...
qelos dump users --path ./qelos-mock
qelos dump workspaces --path ./qelos-mock
qelos dump blueprints all --path ./qelos-mock   # entities
```

Blueprints are imported before entities, and user/workspace names inside dumped entities are mapped back to
ids. Secret-bearing user fields are dropped and connection secrets are never pulled. The full layout and
match keys are documented in the [`@qelos/testing` README](https://github.com/qelos-io/qelos/tree/main/packages/testing#importing-qelos-cli-artifacts).
Use `artifactsDir` to import from a different folder than `dataDir`.

## JSON state files and reset

With a `dataDir`, state is written (debounced, atomically) to `<dir>/state/<collection>.json` and
`entities.json`. **Once `state/` exists it wins over the other files**, so users you register and entities
you create survive restarts, and edits to `personas.json` or the artifacts are only picked up after a reset.

To reset:

- delete `qelos-mock/state/*.json` and restart, or
- `POST /__qelos_mock__/reset` (drops everything and reseeds), or
- pass `reimport: true` to import the artifacts again on top of the persisted state.

Writes land about 50 ms after the last change and on a clean shutdown (`await mock.state.flush()`); a hard kill
can lose the last few writes. `qelos mock init` adds a `.gitignore` for `state/` because it contains session data.

## State-management endpoints

Mounted under `/__qelos_mock__/` only while the mock is enabled:

| Endpoint | |
|---|---|
| `GET /__qelos_mock__/state` | Snapshot of all collections and entities. |
| `POST /__qelos_mock__/reset` | Drop everything and reseed. |
| `POST /__qelos_mock__/seed` | Body is a seed; documents are upserted by `_id`. |
| `PUT /__qelos_mock__/collections/:name` | Replace a collection (or `entities.<blueprint>`) with the JSON array body. |
| `POST /__qelos_mock__/payments/:subscriptionId/pay` | Report a payment (`/fail`, `/cancel` too), like [`mock.payments`](/testing/unit-testing#payments). |
| `GET /__qelos_mock__/routes` | Registered `{ method, path }` list. |
| `GET /__qelos_mock__/health` | `{ "ok": true }` (standalone `serve` only). |

When you run `qelos mock serve` they are on the server's own origin. With the in-process Express integrator,
call `(await qelos.mock.get()).state` directly (for example `state.reset()`).

## Enabling per framework

The environment variable `QELOS_MOCK` works wherever mock mode is supported: `1`/`true` for an in-memory
mock, or a folder path (`0`/`false` disables). An explicit config option wins over the env.

**Express** (`@qelos/integrator-express`)

```ts
const qelos = createQelosIntegrator({
  config: { appUrl: process.env.QELOS_APP_URL ?? '', mock: './qelos-mock' },
});
app.use(qelos.middleware);
app.use('/api', qelos.proxy!);
```

**FastAPI** (`qelos-integrator-fastapi`) runs the mock as a Node sidecar:

```python
cfg = QelosConfig(app_url="", mock="./qelos-mock")
app = FastAPI(lifespan=qelos_mock_lifespan(cfg))
```

```bash
QELOS_MOCK=./qelos-mock uvicorn main:app --reload
# or use a mock you started yourself: QELOS_MOCK_URL=http://127.0.0.1:4555
```

**Fastify, NestJS, Next.js, Nuxt** do not have built-in mock support yet. Run
`qelos mock serve ./qelos-mock --port 4555` in a second terminal and set the integrator's `appUrl`
(`QELOS_APP_URL`) to `http://127.0.0.1:4555`; the standalone server speaks the same API.

Runnable example: [`examples/express-mock`](https://github.com/qelos-io/qelos/tree/main/examples/express-mock).

## Production guard

Mock mode must never run in production. With `NODE_ENV=production` the Express integrator ignores mock mode
(and logs a warning) and `@qelos/testing` itself throws unless `allowInProduction: true` is passed. A loud
banner is logged whenever the mock is active, the `/__qelos_mock__/*` endpoints are not mounted when it is
disabled, and `qelos mock serve` warns when bound to a non-loopback host. Install `@qelos/testing` as a
dev dependency so production bundles do not ship it.

## Limitations (what is stubbed)

- Tokens are unsigned, opaque JWT-shaped strings; passwords are hashed but this is **not** a security model.
- Social login (`/api/auth/:provider`) signs in the selected persona without any provider round trip.
- Blueprint `updateMapping` needs the optional [`node-jq`](/testing/unit-testing#calculated-properties) package.
- A custom `schema` of an `object` property is checked only for its `type`.
- The rate limit on guest writes is not mirrored. Events are stored, but no subscriber or integration runs on them.
- AI agents answer from seeded `aiResponses` (or echo `Mock response: <message>`); no model is called.
- Webhooks answer from the seed only. Functions, plugins and connections are records: nothing is deployed, fetched or
  called. Scripts and components are not compiled.
- There are no secrets endpoints: that service is internal and apps cannot call it.
- Payments have no provider: nothing is charged, and provider webhooks are replaced by [`mock.payments`](/testing/unit-testing#payments).
- Routes nobody handles return `404 { code: "QELOS_MOCK_NOT_IMPLEMENTED" }`. Extend with `mock.on(...)`, `routes` or `onMissing`.
- Blueprint permissions apply to personas and signed-in users. With no credentials at all (or ones the mock never
  issued) they are not enforced unless `strictPermissions` is on (`--strict` for `qelos-testing serve`); the real
  service treats that caller as a guest.
