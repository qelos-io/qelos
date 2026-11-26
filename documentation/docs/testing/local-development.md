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
| `workspaces` | `{ name, labels, roles }` memberships. A workspace with that name is reused, otherwise created. |
| `default` | `true` on one persona: requests without credentials act as it. See [Skip the sign-in](#skip-the-sign-in). |
| `apiTokens` | API tokens that act as this persona. See [API tokens for server code](#api-tokens-for-server-code). |

Switch persona per request with the `x-qelos-mock-persona` header, or with the `qelos_mock_persona` cookie
set by `POST /api/mock/persona` (`GET /api/mock/personas` lists them).

## Skip the sign-in

Mark one persona as the default and your app starts signed in, in the browser and in server rendering:

```json
[
  { "email": "admin@example.com", "roles": ["admin"] },
  { "email": "member@example.com", "roles": ["user"], "default": true }
]
```

Every request **without credentials** behaves as that user. Choosing another persona (header or cookie) or signing
in overrides it. `default` is read on every start, so moving it to another persona needs only a restart. The
`defaultPersona` option does the same from code and wins over the file.

Two things follow from it:

- Signing out cannot sign the default persona out. Remove `default` to work on your sign-in screens.
- A session cookie that expired, for example one from before you deleted `state/`, means "signed out" and not
  "default persona". Clear the site's cookies.

## API tokens for server code

Server code that calls Qelos with an API token needs a token the mock accepts. Give a made-up value to a persona
and configure your app with the same one:

```json
[{ "email": "admin@example.com", "roles": ["admin"], "apiTokens": ["ql_local_dev_only"] }]
```

A request with `x-api-key: ql_local_dev_only` then acts as that persona. These tokens do not expire, are read on every
start and are not written to `state/`. Never put a real token here: the file is meant to be committed.

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
ids. Secret-bearing user fields are dropped and connection secrets are never pulled.

### Working on real data

A dump holds your users' records. Keep it, and the `state/` made from it, out of git.

- To be one of the dumped users, give a persona their username as `email`. It is the same account, with their
  records, and what the persona sets (such as `roles`) wins over the dumped fields:
  `{ "email": "jane@your-company.com", "default": true }`.
- Dumped workspaces have no members. Name a workspace in a persona's `workspaces` to join it.
- Entities dumped while `users.json` and `workspaces.json` are in the dump folder refer to users and workspaces by
  name. If two workspaces share a name, dump the entities first, so that they keep ids. The full layout and
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

Every integrator has a mock mode. The environment variable `QELOS_MOCK` turns it on: `1`/`true` for an in-memory
mock, or a folder path (`0`/`false` disables). An explicit config option wins over the env. Node integrators run the
mock in your app's process, so install `@qelos/testing` next to them.

| Integrator | Config option |
|---|---|
| `@qelos/integrator-express` | `createQelosIntegrator({ config: { appUrl: '', mock: './qelos-mock' } })` |
| `@qelos/integrator-fastify` | `app.register(qelosFastify, { config: { appUrl: '', mock: './qelos-mock' } })` |
| `@qelos/integrator-nest` | `QelosModule.forRoot({ appUrl: '', mock: './qelos-mock' })` |
| `@qelos/integrator-next` | `createQelosApiProxyHandlers({ appUrl: '', mock: './qelos-mock' })` |
| `@qelos/integrator-nuxt` | `qelos: { mock: './qelos-mock' }` in `nuxt.config.ts` |
| `qelos-integrator-fastapi` | `QelosConfig(app_url="", mock="./qelos-mock")`, see below |

Set the option only outside production, for example
`mock: process.env.NODE_ENV !== 'production' ? './qelos-mock' : false`. Each integrator's README has the details.

For Express:

```ts
const qelos = createQelosIntegrator({
  config: { appUrl: process.env.QELOS_APP_URL ?? '', mock: './qelos-mock' },
});
app.use(qelos.middleware);
app.use('/api', qelos.proxy!);
```

**FastAPI** runs the mock as a Node sidecar:

```python
cfg = QelosConfig(app_url="", mock="./qelos-mock")
app = FastAPI(lifespan=qelos_mock_lifespan(cfg))
```

```bash
QELOS_MOCK=./qelos-mock uvicorn main:app --reload
# or use a mock you started yourself: QELOS_MOCK_URL=http://127.0.0.1:4555
```

**Anything else** can use the standalone server: run `qelos mock serve ./qelos-mock --port 4555` and set your app's
Qelos URL to `http://127.0.0.1:4555`.

Runnable example: [`examples/express-mock`](https://github.com/qelos-io/qelos/tree/main/examples/express-mock).

## Production guard

Mock mode must never run in production. With `NODE_ENV=production` the integrators ignore mock mode
(and log a warning) and `@qelos/testing` itself throws unless `allowInProduction: true` is passed. A loud
banner is logged whenever the mock is active, the `/__qelos_mock__/*` endpoints are not mounted when it is
disabled, and `qelos mock serve` warns when bound to a non-loopback host. Install `@qelos/testing` as a
dev dependency so production bundles do not ship it.

## Limitations (what is stubbed)

- Tokens are unsigned, opaque JWT-shaped strings; passwords are hashed but this is **not** a security model.
- Social login (`/api/auth/:provider`) signs in the selected persona (or the default one) without any provider
  round trip, and redirects to your `returnUrl`: a path, or a URL on this machine.
- Blueprint `updateMapping` needs the optional [`node-jq`](/testing/unit-testing#calculated-properties) package.
- A custom `schema` of an `object` property needs the optional [`ajv`](/testing/unit-testing#object-schemas) package.
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
